from datetime import datetime
from math import ceil
from pathlib import Path
from typing import Dict, List

import aiofiles
from dadata import DadataAsync
from fastapi import HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import and_, desc, distinct, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import (
    BITRIX24_SELECT_PAYLOAD_FIELDS,
    CREATE_CLINIC_MODEL_FIELDS,
    CRM_COMPANY_UPDATE,
    DADATA_NAME,
    EXCLUDED_CLINIC_CREATE_SCHEMA_FIELDS,
    EXTRACT_DYNAMIC_FIELDS_MAPPING,
    UPLOAD_DIR,
    Settings,
)
from app.database_session import SessionLocal
from app.emuns.clinic_enum import SyncStatus
from app.models import ClinicAddress, Company, FormTemplate, Visit
from app.schemas.clinic_schema import (
    AddressSchema,
    AdvancedFilterParams,
    ClinicBase,
    ClinicCreate,
    ClinicResponseBase,
    ClinicUpdate,
    FilterCondition,
    FilterGroup,
    GetAddressSchema,
    PaginatedResponse,
)
from app.services.bitrix24 import Bitrix24ApiError, Bitrix24Client, require_bitrix24
from app.utils.logger import logger


class ClinicService:
    def __init__(self, session: AsyncSession, bitrix24: Bitrix24Client):
        self.session = session
        self.bitrix24 = bitrix24

    def _require_bitrix(self) -> Bitrix24Client:
        return require_bitrix24(self.bitrix24)

    @logger()
    async def get_clinic(
        self,
        current_user,
        filter_params: AdvancedFilterParams,
    ) -> PaginatedResponse:
        last_visit_subquery = await self._build_last_visit_subquery()

        query = select(Company).outerjoin(
            last_visit_subquery, Company.id == last_visit_subquery.c.company_id
        )

        # Multi-tenancy: scope to organization
        if not current_user.is_platform_admin:
            query = query.where(
                Company.organization_id == current_user.organization_id
            )

        # Фильтрация по регионам
        query = await self._apply_region_filter(
            query, current_user, filter_params.region
        )

        # Применение базовых фильтров
        query = await self._apply_basic_filters(query, filter_params)

        # Применение сложных фильтров
        if filter_params.filter_groups:
            query = await self._apply_advanced_filters(
                query,
                filter_params.filter_groups,
                filter_params.global_logical_operator,
            )

        # Применение сортировки
        query = await self._apply_sorting(
            query,
            filter_params.sort_by,
            filter_params.sort_direction,
            last_visit_subquery,
        )

        # Отдельный запрос для подсчета записей
        count_query = select(func.count(Company.id)).outerjoin(
            last_visit_subquery, Company.id == last_visit_subquery.c.company_id
        )
        # Multi-tenancy: scope count query to organization
        if not current_user.is_platform_admin:
            count_query = count_query.where(
                Company.organization_id == current_user.organization_id
            )
        count_query = await self._apply_region_filter(
            count_query, current_user, filter_params.region
        )
        count_query = await self._apply_basic_filters(count_query, filter_params)
        if filter_params.filter_groups:
            count_query = await self._apply_advanced_filters(
                count_query,
                filter_params.filter_groups,
                filter_params.global_logical_operator,
            )

        total = await self.session.scalar(count_query)
        total_pages = ceil(total / filter_params.page_size)

        # Применение пагинации
        companies = await self.session.execute(
            query.offset((filter_params.page - 1) * filter_params.page_size).limit(
                filter_params.page_size
            )
        )
        companies = companies.scalars().all()

        # Преобразование данных для ответа
        clinics_data = await self._serialize_companies(companies)

        return PaginatedResponse(
            items=clinics_data,
            total=total,
            page=filter_params.page,
            page_size=filter_params.page_size,
            total_pages=total_pages,
        )

    @staticmethod
    @logger()
    async def _build_last_visit_subquery():
        """Создает подзапрос для получения данных о последнем визите."""
        return (
            select(
                Visit.company_id,
                func.max(Visit.date).label("last_visit_date"),
                func.count(Visit.id).label("visits_count"),
            )
            .group_by(Visit.company_id)
            .subquery()
        )

    @staticmethod
    @logger()
    async def _apply_region_filter(query, current_user, region):
        """Применяет фильтр по регионам."""
        user_regions = (
            current_user.regions
            if hasattr(current_user, "regions") and current_user.regions
            else []
        )

        if region:
            if user_regions and region not in user_regions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"You don't have access to region: {region}",
                )
            query = query.filter(Company.region == region)
        elif user_regions:
            query = query.filter(Company.region.in_(user_regions))

        return query

    @staticmethod
    @logger()
    async def _apply_basic_filters(query, filter_params: AdvancedFilterParams):
        """Применяет базовые фильтры."""
        if filter_params.name:
            query = query.filter(Company.name.ilike(f"%{filter_params.name}%"))
        if filter_params.inn:
            query = query.filter(Company.inn.ilike(f"%{filter_params.inn}%"))
        if filter_params.company_type:
            query = query.filter(Company.company_type == filter_params.company_type)
        return query

    @logger()
    async def _apply_advanced_filters(
        self, query, filter_groups: List[FilterGroup], global_logical_operator: str
    ):
        """Применение сложных фильтров к запросу."""
        if not filter_groups:
            return query

        # Создаем список условий для каждой группы
        group_conditions = []

        for group in filter_groups:
            group_condition = await self._build_group_condition(group)
            if group_condition is not None:
                group_conditions.append(group_condition)

        # Комбинируем условия групп в соответствии с глобальным оператором
        if group_conditions:
            if global_logical_operator.upper() == "AND":
                combined_condition = and_(*group_conditions)
            else:  # OR
                combined_condition = or_(*group_conditions)

            query = query.where(combined_condition)

        return query

    @logger()
    async def _build_group_condition(self, group: FilterGroup):
        """Построение условия для одной группы фильтров."""
        if not group.conditions:
            return None

        conditions = []
        for condition in group.conditions:
            field_condition = await self._build_field_condition(condition)
            if field_condition is not None:
                conditions.append(field_condition)

        if not conditions:
            return None

        # Комбинируем условия в группе
        if group.logical_operator.upper() == "AND":
            return and_(*conditions)
        else:  # OR
            return or_(*conditions)

    @staticmethod
    @logger()
    async def _build_field_condition(condition: FilterCondition):
        """Построение условия для одного поля."""
        # Получаем атрибут поля
        field_attr = getattr(Company, condition.field, None)
        if field_attr is None:
            return None

        # Применяем оператор
        operator = condition.operator.lower()

        try:
            if operator == "contains":
                if condition.value is not None:
                    return field_attr.ilike(f"%{condition.value}%")
            elif operator == "not_contains":
                if condition.value is not None:
                    return ~field_attr.ilike(f"%{condition.value}%")
            elif operator == "equals":
                if condition.value is not None:
                    return field_attr == condition.value
            elif operator == "not_equals":
                if condition.value is not None:
                    return field_attr != condition.value
            elif operator == "starts_with":
                if condition.value is not None:
                    return field_attr.ilike(f"{condition.value}%")
            elif operator == "ends_with":
                if condition.value is not None:
                    return field_attr.ilike(f"%{condition.value}")
            elif operator == "in":
                if condition.values:
                    return field_attr.in_(condition.values)
            elif operator == "is_empty":
                return or_(field_attr.is_(None), field_attr == "")
            elif operator == "greater":
                if condition.value is not None:
                    return field_attr > condition.value
            elif operator == "less":
                if condition.value is not None:
                    return field_attr < condition.value
            elif operator == "between":
                if condition.values and len(condition.values) >= 2:
                    return field_attr.between(condition.values[0], condition.values[1])
            elif operator == "greater":  # Для дат (после)
                if condition.value is not None:
                    return field_attr > condition.value
            elif operator == "less":  # Для дат (до)
                if condition.value is not None:
                    return field_attr < condition.value
        except Exception as e:
            print(f"Error building condition for {condition.field}: {e}")
            return None

        return None

    @staticmethod
    @logger()
    async def _apply_sorting(query, sort_by, sort_direction, last_visit_subquery):
        """Применяет сортировку."""
        if sort_by == "last_visit_date":
            sort_field = last_visit_subquery.c.last_visit_date
        elif sort_by == "visits_count":
            sort_field = last_visit_subquery.c.visits_count
        else:
            sort_field = getattr(Company, sort_by, Company.name)

        if sort_direction.lower() == "desc":
            query = query.order_by(desc(sort_field))
        else:
            query = query.order_by(sort_field)

        return query

    @logger()
    async def _serialize_companies(self, companies) -> List[Dict]:
        """Сериализует данные о компаниях."""
        clinics_data = []
        for company in companies:
            last_visit_query = (
                (
                    await self.session.execute(
                        select(Visit)
                        .filter(Visit.company_id == company.id)
                        .order_by(desc(Visit.date))
                    )
                )
                .scalars()
                .first()
            )

            visits_count_query = await self.session.scalar(
                select(func.count(Visit.id)).filter(Visit.company_id == company.id)
            )

            clinic_coordinates = (
                (
                    await self.session.execute(
                        select(ClinicAddress).filter(
                            ClinicAddress.company_id == company.id
                        )
                    )
                )
                .scalars()
                .first()
            )

            clinic_dict = {
                "id": company.id,
                "name": company.name,
                "bitrix_id": company.bitrix_id,
                "sync_status": company.sync_status,
                "last_synced": company.last_synced,
                "inn": getattr(company, "inn", company.dynamic_fields.get("inn")),
                "main_manager": getattr(
                    company, "main_manager", company.dynamic_fields.get("main_manager")
                ),
                "last_sale_date": getattr(
                    company,
                    "last_sale_date",
                    company.dynamic_fields.get("last_sale_date"),
                ),
                "document_amount": getattr(
                    company,
                    "document_amount",
                    company.dynamic_fields.get("document_amount"),
                ),
                "last_visit_date": (
                    last_visit_query.date.isoformat() if last_visit_query else None
                ),
                "visits_count": visits_count_query or 0,
                "dynamic_fields": company.dynamic_fields or {},
                "clinic_coordinates": (
                    {
                        "latitude": clinic_coordinates.latitude,
                        "longitude": clinic_coordinates.longitude,
                    }
                    if clinic_coordinates
                    else {}
                ),
            }
            clinics_data.append(clinic_dict)

        return clinics_data

    @logger()
    async def get_clinic_local_db(self, clinic_id: int, sync_with_bitrix: bool, current_user=None):
        """Получает клинику из локальной базы данных."""
        clinic = await self._fetch_clinic_from_db(clinic_id=clinic_id, current_user=current_user)
        clinic_location = (
            (
                await self.session.execute(
                    select(ClinicAddress).where(ClinicAddress.company_id == clinic_id)
                )
            )
            .scalars()
            .first()
        )
        if sync_with_bitrix and clinic.bitrix_id:
            await self._sync_clinic_with_bitrix_for_get(clinic)

        clinic_dict = ClinicResponseBase.model_validate(clinic).model_dump()
        clinic_dict["dynamic_fields"]["UF_CRM_1742890765753"] = clinic_dict[
            "is_network"
        ]
        if clinic_location:
            clinic_dict["clinic_coordinates"] = {
                "latitude": clinic_location.longitude,
                "longitude": clinic_location.latitude,
            }
        return clinic_dict

    @logger()
    async def _fetch_clinic_from_db(self, clinic_id: int, back_none: bool = False, current_user=None):
        """Получает клинику из базы данных по её ID."""
        query = select(Company).where(Company.id == clinic_id)
        if current_user and not current_user.is_platform_admin:
            query = query.where(Company.organization_id == current_user.organization_id)
        clinic = (await self.session.execute(query)).scalars().first()
        if back_none:
            return clinic
        if not clinic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found"
            )
        return clinic

    @logger()
    async def pull_from_bitrix(self, clinic):
        """Получает данные компании из Bitrix24 и обновляет локальную запись."""
        if self.bitrix24 is None:
            return
        if not clinic.bitrix_id:
            return

        try:
            bitrix_company = await self.bitrix24.get_company(clinic.bitrix_id)
            if not bitrix_company:
                return

            clinic.name = bitrix_company.get("TITLE", clinic.name)

            new_dynamic_fields = await self._extract_dynamic_fields(bitrix_company)
            # Merge instead of overwrite
            existing_dynamic = clinic.dynamic_fields or {}
            existing_dynamic.update(new_dynamic_fields)
            clinic.dynamic_fields = existing_dynamic

            clinic.sync_status = SyncStatus.SYNCED.value
            clinic.sync_error = None
            clinic.last_synced = datetime.now()

            await self.session.commit()
            await self.session.refresh(clinic)

        except Bitrix24ApiError as e:
            clinic.sync_status = SyncStatus.ERROR.value
            clinic.sync_error = str(e)
            await self.session.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка синхронизации клиники {clinic.id} с Bitrix24: {str(e)}",
            )
        except Exception as e:
            clinic.sync_status = SyncStatus.ERROR.value
            clinic.sync_error = f"Неожиданная ошибка: {str(e)}"
            await self.session.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка синхронизации клиники {clinic.id} с Bitrix24: {str(e)}",
            )

    # Backward compatibility alias
    _sync_clinic_with_bitrix_for_get = pull_from_bitrix

    @staticmethod
    @logger()
    async def _extract_dynamic_fields(
        bitrix_company: dict,
    ) -> dict:
        """
        Извлекает динамические поля из данных Bitrix24.
        """
        dynamic_fields = {}

        for field_name, bitrix_key in EXTRACT_DYNAMIC_FIELDS_MAPPING.items():
            if bitrix_company.get(bitrix_key):
                dynamic_fields[field_name] = bitrix_company.get(bitrix_key)

        # Дополнительные пользовательские поля (начинаются с "UF_")
        for key, value in bitrix_company.items():
            if key.startswith("UF_") and value:
                field_name = key.lower()
                dynamic_fields[field_name] = value

        return dynamic_fields

    @logger()
    async def create_clinic(self, clinic: ClinicCreate, current_user=None):
        """
        Создает клинику в локальной базе данных и опционально синхронизирует с Bitrix24.
        Компания создается локально даже если Bitrix24 не настроен или синхронизация не удалась.
        """
        db_clinic = await self._create_clinic_in_db(clinic, current_user)

        try:
            await self.sync_clinic_with_bitrix_for_create(db_clinic, clinic)
        except Bitrix24ApiError as e:
            db_clinic.sync_status = SyncStatus.ERROR.value
            db_clinic.sync_error = str(e)
            await self.session.commit()
        except Exception as e:
            db_clinic.sync_status = SyncStatus.ERROR.value
            db_clinic.sync_error = f"Неожиданная ошибка: {str(e)}"
            await self.session.commit()

        return db_clinic

    @logger()
    async def _create_clinic_in_db(self, clinic: ClinicCreate, current_user=None):
        """Создает запись клиники в локальной базе данных."""
        clinic_dict = clinic.model_dump(exclude=EXCLUDED_CLINIC_CREATE_SCHEMA_FIELDS)
        filtered_data = {
            k: v for k, v in clinic_dict.items() if k in CREATE_CLINIC_MODEL_FIELDS
        }

        # Set organization_id from current_user
        if current_user:
            filtered_data["organization_id"] = current_user.organization_id

        db_clinic = Company(**filtered_data, sync_status=SyncStatus.PENDING.value)

        if hasattr(clinic, "dynamic_fields") and clinic.dynamic_fields:
            db_clinic.dynamic_fields = clinic.dynamic_fields

        self.session.add(db_clinic)
        await self.session.commit()
        await self.session.refresh(db_clinic)

        return db_clinic

    @logger()
    async def sync_clinic_with_bitrix_for_create(self, db_clinic, clinic: ClinicCreate):
        """Синхронизирует клинику с Bitrix24 при создании. Делегирует в push_to_bitrix."""
        await self.push_to_bitrix(db_clinic, clinic_schema=clinic)

    @staticmethod
    @logger()
    async def _prepare_bitrix_fields(clinic: ClinicCreate) -> dict:
        """
        Подготавливает данные для отправки в Bitrix24.
        """
        fields = {
            "TITLE": clinic.name,
        }

        if hasattr(clinic, "dynamic_fields") and clinic.dynamic_fields:
            for field_key, field_value in clinic.dynamic_fields.items():
                fields[field_key.upper()] = field_value

        if (
            clinic.inn
        ):  # TODO проверить как работает с фронтом and "UF_CRM_1741267701427" not in fields:
            fields["UF_CRM_1741267701427"] = clinic.inn

        if getattr(clinic, "address", None) and "UF_CRM_6679726EB1750" not in fields:
            fields["UF_CRM_6679726EB1750"] = clinic.address

        if clinic.is_network:
            fields["UF_CRM_1742890765753"] = clinic.is_network

        return fields

    @logger()
    async def update_clinic(self, clinic_id: int, clinic: ClinicUpdate, current_user=None):
        """
        Обновляет клинику в локальной базе данных и синхронизирует её с Bitrix24.
        """
        db_clinic = await self._fetch_clinic_from_db(clinic_id, current_user=current_user)

        clinic_data = clinic.model_dump(exclude_unset=True)
        dynamic_fields = clinic_data.pop("dynamic_fields", None)

        if dynamic_fields:
            await self._update_dynamic_fields(db_clinic, dynamic_fields)

            is_network_field = dynamic_fields.get("UF_CRM_1742890765753", None)
            if is_network_field is not None:
                clinic_data["is_network"] = is_network_field

        await self._update_standard_fields(db_clinic, clinic_data)

        db_clinic.sync_status = SyncStatus.PENDING.value
        await self.session.commit()
        await self.session.refresh(db_clinic)

        if db_clinic.bitrix_id and self.bitrix24 is not None:
            try:
                await self.push_to_bitrix(db_clinic)
            except Bitrix24ApiError as e:
                db_clinic.sync_status = SyncStatus.ERROR.value
                db_clinic.sync_error = str(e)
                await self.session.commit()
            except Exception as e:
                db_clinic.sync_status = SyncStatus.ERROR.value
                db_clinic.sync_error = f"Неожиданная ошибка: {str(e)}"
                await self.session.commit()
        return db_clinic

    @staticmethod
    @logger()
    async def _update_dynamic_fields(db_clinic, dynamic_fields: dict):
        """
        Обновляет динамические поля клиники.
        """
        force_update_keys = [
            k for k in dynamic_fields.keys() if k.startswith("_force_update_")
        ]
        for key in force_update_keys:
            dynamic_fields.pop(key, None)

        optimized_fields = {}
        address_values = set()

        existing_fields = db_clinic.dynamic_fields or {}

        all_fields = {**existing_fields, **dynamic_fields}
        value_to_keys = {}

        for key, value in all_fields.items():
            if isinstance(value, (dict, list)) or key.startswith("_"):
                optimized_fields[key] = value
                continue

            str_value = str(value)

            if "|;|" in str_value and key.lower().find("address") >= 0:
                optimized_fields[key] = value
                clean_address = str_value.split("|;|")[0]
                address_values.add(clean_address)
                continue

            if str_value not in value_to_keys:
                value_to_keys[str_value] = []
            value_to_keys[str_value].append(key)

        for address in address_values:
            address_keys = [
                k
                for k, v in all_fields.items()
                if isinstance(v, str)
                and v == address
                and (k.lower().find("address") >= 0 or k == "6679726eb1750")
            ]

            if address_keys:
                optimized_fields["address"] = address
                optimized_fields["6679726eb1750"] = address
                for k in address_keys:
                    if k in value_to_keys.get(address, []):
                        value_to_keys[address].remove(k)

        for value, keys in value_to_keys.items():
            if not keys:
                continue

            primary_key = keys[0]
            for k in keys:
                if not k.startswith("UF_CRM_") and not k.startswith("uf_crm_"):
                    primary_key = k
                    break

            optimized_fields[primary_key] = all_fields[primary_key]

            for k in keys:
                if k.startswith("UF_CRM_"):
                    optimized_fields[k] = all_fields[k]
                    break

        db_clinic.dynamic_fields = optimized_fields

    @staticmethod
    @logger()
    async def _update_standard_fields(db_clinic, clinic_data: dict):
        """Обновляет стандартные поля клиники."""
        for key, value in clinic_data.items():
            setattr(db_clinic, key, value)

    @logger()
    async def push_to_bitrix(self, db_clinic, clinic_schema=None):
        """
        Отправляет данные компании в Bitrix24.
        Создаёт новую компанию если bitrix_id отсутствует, обновляет если есть.
        Использует FormTemplate для маппинга полей если доступен.
        """
        if self.bitrix24 is None:
            db_clinic.sync_status = SyncStatus.PENDING.value
            await self.session.commit()
            return

        # Build Bitrix fields using FormTemplate or fallback to hardcoded mapping
        bitrix_data = await self._build_bitrix_fields(db_clinic, clinic_schema)

        try:
            if db_clinic.bitrix_id:
                # Update existing company
                success = await self.bitrix24.update_company(
                    db_clinic.bitrix_id, bitrix_data, db_clinic.dynamic_fields
                )
                if success:
                    db_clinic.sync_status = SyncStatus.SYNCED.value
                    db_clinic.sync_error = None
                    db_clinic.last_synced = datetime.utcnow()
                else:
                    db_clinic.sync_status = SyncStatus.ERROR.value
                    db_clinic.sync_error = "Bitrix24 вернул неуспешный результат при обновлении"
            else:
                # Create new company
                result = await self.bitrix24.create_company(bitrix_data)
                if result:
                    db_clinic.bitrix_id = result if isinstance(result, int) else self._extract_bitrix_id(result)
                    db_clinic.sync_status = SyncStatus.SYNCED.value
                    db_clinic.sync_error = None
                    db_clinic.last_synced = datetime.utcnow()
                else:
                    db_clinic.sync_status = SyncStatus.ERROR.value
                    db_clinic.sync_error = "Bitrix24 вернул пустой результат при создании компании"
        except Bitrix24ApiError as e:
            db_clinic.sync_status = SyncStatus.ERROR.value
            db_clinic.sync_error = str(e)
        except Exception as e:
            db_clinic.sync_status = SyncStatus.ERROR.value
            db_clinic.sync_error = f"Неожиданная ошибка: {str(e)}"

        await self.session.commit()
        await self.session.refresh(db_clinic)

    @logger()
    async def _build_bitrix_fields(self, db_clinic, clinic_schema=None) -> dict:
        """
        Формирует словарь полей для Bitrix24 API.
        Приоритет: FormTemplate → hardcoded mapping.
        """
        bitrix_data = {
            "TITLE": db_clinic.name,
            "COMPANY_TYPE": db_clinic.company_type or "CUSTOMER",
        }

        # Try FormTemplate first
        form_template = (
            await self.session.execute(
                select(FormTemplate).where(
                    FormTemplate.entity_type == "clinic",
                    FormTemplate.organization_id == db_clinic.organization_id,
                )
            )
        ).scalars().first()

        if form_template and form_template.fields:
            # Use FormTemplate for field mapping
            for field_def in form_template.fields:
                bitrix_field_id = field_def.get("bitrix_field_id")
                key = field_def.get("key")
                if not bitrix_field_id or not key:
                    continue

                # Get value from model attribute or dynamic_fields
                value = getattr(db_clinic, key, None)
                if value is None and db_clinic.dynamic_fields:
                    value = db_clinic.dynamic_fields.get(key)
                if value is not None:
                    bitrix_data[bitrix_field_id] = value
        else:
            # Fallback: hardcoded field mapping
            if db_clinic.inn:
                bitrix_data["UF_CRM_1741267701427"] = db_clinic.inn

            if db_clinic.dynamic_fields:
                bitrix_data.update({
                    "ADDRESS": db_clinic.dynamic_fields.get("address", ""),
                    "ADDRESS_CITY": db_clinic.dynamic_fields.get("city", ""),
                    "ADDRESS_COUNTRY": db_clinic.dynamic_fields.get("country", ""),
                })
                inn_from_dynamic = db_clinic.dynamic_fields.get("inn")
                if inn_from_dynamic:
                    bitrix_data["UF_CRM_1741267701427"] = inn_from_dynamic

            if db_clinic.is_network:
                bitrix_data["UF_CRM_1742890765753"] = db_clinic.is_network

        # Also add from schema if provided (for create flow)
        if clinic_schema:
            if hasattr(clinic_schema, "dynamic_fields") and clinic_schema.dynamic_fields:
                for field_key, field_value in clinic_schema.dynamic_fields.items():
                    if field_key.startswith("UF_CRM_") or field_key.startswith("UF_"):
                        bitrix_data[field_key.upper()] = field_value

        return bitrix_data

    # Backward compatibility alias
    _sync_with_bitrix = push_to_bitrix

    @logger()
    async def update_clinic_in_bitrix(self, data: dict):
        """Обновляет клинику в Bitrix24."""
        self._require_bitrix()
        prepared_data = await self._prepare_data_for_update(data)

        standard_fields, dynamic_fields = await self._map_fields(prepared_data)

        if prepared_data.get("fields").get("bitrix_id"):
            bitrix_company_id = prepared_data.get("fields").get("bitrix_id")
        else:
            fetched_clinic = await self._fetch_clinic_from_db(
                clinic_id=prepared_data.get("id")
            )
            bitrix_company_id = fetched_clinic.bitrix_id
        success = await self.bitrix24.update_company(
            int(bitrix_company_id),
            standard_fields,
            dynamic_fields,
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при обновлении компании в Bitrix24",
            )

        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "message": "Компания успешно обновлена в Bitrix24",
            },
        )

    @staticmethod
    @logger()
    async def _prepare_data_for_update(data: dict) -> dict:
        """Проверяет и готовит данные для обновления."""
        company_id = data.get("id")
        if not company_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID компании не указан",
            )
        fields = data.get("fields", {})
        if not fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Поля для обновления не указаны",
            )
        return {
            "id": company_id,
            "fields": fields,
            "dynamic_fields": fields.get("dynamic_fields", {}),
        }

    @logger()
    async def _map_fields(self, data: dict):
        """Разделяет поля на стандартные и динамические."""
        fields = data.get("fields")
        dy_fields = data.get("dynamic_fields", {})
        standard_fields = {}
        dynamic_fields = {}

        for key, value in fields.items():
            key = key.upper()
            if key in ["TITLE", "NAME"]:
                standard_fields["TITLE"] = value
            elif key in ["COMPANY_TYPE", "ADDRESS", "CITY", "COUNTRY"]:
                dynamic_fields[key.lower()] = value
            elif key.startswith("UF_CRM_"):
                dynamic_fields[key] = value
            elif key.startswith("UF_"):
                dynamic_fields[key[3:]] = value
            elif key == "UF_CRM_1741267701427":
                dynamic_fields["inn"] = value
                dynamic_fields["UF_CRM_1741267701427"] = value
            elif key in ["EMAIL", "PHONE"]:
                standard_fields[key] = value

        for (
            key,
            value,
        ) in dy_fields.items():
            key = key.upper()
            if key in ["EMAIL", "PHONE"]:
                standard_fields[key] = value
            elif key == "UF_CRM_1741267701427":
                dynamic_fields["inn"] = value
                dynamic_fields["UF_CRM_1741267701427"] = value
            elif key.startswith("UF_CRM_"):
                dynamic_fields[key] = value
            elif key.startswith("UF_"):
                dynamic_fields[key[3:]] = value
            elif key in ["TITLE", "NAME"]:
                standard_fields["TITLE"] = value
            elif key in ["COMPANY_TYPE", "ADDRESS", "CITY", "COUNTRY"]:
                dynamic_fields[key.lower()] = value

        return standard_fields, dynamic_fields

    @logger()
    async def sync_clinics_from_bitrix(self, current_user=None):
        """Синхронизирует клиники из Bitrix24 в локальную базу данных."""
        self._require_bitrix()
        companies = await self.bitrix24.get_companies()

        organization_id = current_user.organization_id if current_user else None
        import logging
        log = logging.getLogger(__name__)
        for company in companies:
            try:
                if "ID" not in company or "TITLE" not in company:
                    continue
                await self._process_company(company, organization_id=organization_id)
            except Exception as e:
                log.error("Ошибка обработки компании %s: %s", company.get("ID", "?"), str(e))
                continue

        await self.session.commit()
        return await self._get_all_clinics()

    @logger()
    async def _process_company(self, company: dict, organization_id: int = None):
        """Обрабатывает одну компанию из Bitrix24."""
        # Search by bitrix_id, not by local id
        bitrix_id = int(company["ID"])
        query = select(Company).where(Company.bitrix_id == bitrix_id)
        result = await self.session.execute(query)
        db_clinic = result.scalars().first()

        dynamic_fields = await self._extract_dynamic_fields(company)

        company_data = {
            "name": company["TITLE"],
            "bitrix_id": bitrix_id,
            "sync_status": "synced",
            "sync_error": None,
            "last_synced": datetime.utcnow(),
        }

        if db_clinic:
            # Merge dynamic_fields instead of overwriting
            existing_dynamic = db_clinic.dynamic_fields or {}
            existing_dynamic.update(dynamic_fields)
            company_data["dynamic_fields"] = existing_dynamic
            await self._update_clinic(db_clinic, company_data)
        else:
            company_data["dynamic_fields"] = dynamic_fields
            company_data["region"] = dynamic_fields.get("region", "")
            if organization_id:
                company_data["organization_id"] = organization_id
            db_clinic = Company(**company_data)
            self.session.add(db_clinic)

    @staticmethod
    @logger()
    async def _update_clinic(db_clinic, company_data: dict):
        """Обновляет данные клиники в базе данных."""
        for key, value in company_data.items():
            setattr(db_clinic, key, value)

    @logger()
    async def _get_all_clinics(self):
        """Получает все клиники из базы данных."""
        result = await self.session.execute(select(Company))
        return result.scalars().all()

    @logger()
    async def upload_excel_file(self, file: UploadFile) -> JSONResponse:
        """Загружает Excel-файл на сервер."""
        upload_dir = self._get_upload_directory()
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / file.filename
        await self._save_file(file, file_path)

        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "status": "success",
                "message": "File uploaded successfully",
                "filename": file.filename,
            },
        )

    @staticmethod
    @logger()
    def _get_upload_directory() -> Path:
        """Возвращает директорию для загрузки файлов в зависимости от окружения."""
        if hasattr(Settings, "ENVIRONMENT") and Settings.ENVIRONMENT == "production":
            return UPLOAD_DIR
        else:
            return Path(__file__).parent.parent.parent / "upload"

    @staticmethod
    @logger()
    async def _save_file(file: UploadFile, file_path: Path):
        """Асинхронно сохраняет файл на диск."""
        try:
            async with aiofiles.open(file_path, "wb") as buffer:
                while chunk := await file.read(1024 * 1024):  # Читаем по 1 МБ
                    await buffer.write(chunk)
        except Exception as e:
            raise RuntimeError(f"Failed to save file: {str(e)}")

    @logger()
    async def create_clinic_in_bitrix(self, clinic_id: int):
        """
        Создает клинику в Bitrix24 и обновляет её данные в локальной базе данных.
        Делегирует в push_to_bitrix.
        """
        self._require_bitrix()
        clinic = await self._fetch_clinic_from_db(clinic_id)

        if clinic.bitrix_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This clinic already has a Bitrix24 ID. Use update instead.",
            )

        await self.push_to_bitrix(clinic)

        if clinic.bitrix_id:
            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content={
                    "success": True,
                    "message": "Company created in Bitrix24",
                    "bitrix_id": clinic.bitrix_id,
                },
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Не удалось создать компанию в Bitrix24: {clinic.sync_error}",
            )

    @staticmethod
    @logger()
    async def _prepare_company_data(clinic) -> dict:
        """Подготавливает данные для создания компании в Bitrix24."""
        company_data = {
            "TITLE": clinic.name,
            "COMPANY_TYPE": clinic.company_type or "CUSTOMER",
        }
        if clinic.inn:
            company_data["UF_CRM_1741267701427"] = clinic.inn
        return company_data

    @logger()
    async def _update_clinic_with_bitrix_id(self, clinic, bitrix_id: int):
        """Обновляет клинику в локальной базе данных после создания в Bitrix24."""
        clinic.bitrix_id = bitrix_id
        clinic.sync_status = SyncStatus.SYNCED.value
        clinic.last_synced = datetime.utcnow()
        await self.session.commit()

    @logger()
    async def find_or_create_in_bitrix(self, clinic_id: int):
        """
        Ищет или создает клинику в Bitrix24 и обновляет её данные в локальной базе данных.
        """
        self._require_bitrix()
        clinic = await self._fetch_clinic_from_db(clinic_id)

        if clinic.bitrix_id:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "message": f"Клиника уже связана с компанией в Битрикс (ID: {clinic.bitrix_id})",
                    "clinic_id": clinic_id,
                    "bitrix_id": clinic.bitrix_id,
                },
            )

        inn = await self._get_clinic_inn(clinic)
        if not inn:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "success": False,
                    "message": "У клиники отсутствует ИНН. Невозможно найти в Битрикс.",
                    "clinic_id": clinic_id,
                },
            )

        companies = await self.search_companies_by_inn(inn)
        if companies:
            return await self._link_existing_company(clinic, companies[0])
        else:
            return await self._create_new_company_in_bitrix(clinic, inn)

    @staticmethod
    @logger()
    async def _get_clinic_inn(clinic) -> str | None:
        """
        Получает ИНН клиники из динамических полей или атрибутов.
        """
        if hasattr(clinic, "inn") and clinic.inn:
            return clinic.inn
        elif clinic.dynamic_fields and "inn" in clinic.dynamic_fields:
            return clinic.dynamic_fields["inn"]
        elif clinic.dynamic_fields and "UF_CRM_1741267701427" in clinic.dynamic_fields:
            return clinic.dynamic_fields["UF_CRM_1741267701427"]
        return None

    @logger()
    async def _link_existing_company(self, clinic, company):
        """
        Связывает клинику с существующей компанией в Bitrix24.
        """
        bitrix_id = company["ID"]
        clinic.bitrix_id = int(bitrix_id)
        clinic.sync_status = "synced"
        clinic.last_synced = datetime.now()
        await self.session.commit()
        await self.session.refresh(clinic)

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": f"Найдена компания в Битрикс с ИНН {company['UF_CRM_1741267701427']}",
                "clinic_id": clinic.id,
                "bitrix_id": bitrix_id,
            },
        )

    @logger()
    async def _create_new_company_in_bitrix(self, clinic, inn):
        """
        Создает новую компанию в Bitrix24 и связывает её с клиникой.
        Делегирует в push_to_bitrix.
        """
        # Ensure INN is set for the push
        if inn and not clinic.inn:
            if not clinic.dynamic_fields:
                clinic.dynamic_fields = {}
            clinic.dynamic_fields["inn"] = inn

        await self.push_to_bitrix(clinic)

        if clinic.bitrix_id:
            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content={
                    "success": True,
                    "message": f"Создана новая компания в Битрикс с ID {clinic.bitrix_id}",
                    "clinic_id": clinic.id,
                    "bitrix_id": clinic.bitrix_id,
                },
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "message": f"Не удалось создать компанию в Битрикс: {clinic.sync_error}",
                    "clinic_id": clinic.id,
                },
            )

    @staticmethod
    @logger()
    async def _prepare_company_fields(clinic, inn) -> dict:
        """
        Подготавливает данные для создания компании в Bitrix24.
        """
        company_fields = {
            "TITLE": clinic.name,
            "COMPANY_TYPE": clinic.company_type or "CUSTOMER",
            "ADDRESS": getattr(clinic, "address", ""),
            "CITY": getattr(clinic, "city", ""),
            "UF_CRM_1741267701427": inn,  # ИНН
        }
        main_manager = getattr(clinic, "main_manager", None)
        if (
            not main_manager
            and clinic.dynamic_fields
            and "main_manager" in clinic.dynamic_fields
        ):
            main_manager = clinic.dynamic_fields["main_manager"]

        if main_manager:
            company_fields["UF_CRM_MAIN_MANAGER"] = main_manager

        return company_fields

    @staticmethod
    @logger()
    def _extract_bitrix_id(result):
        """
        Извлекает ID компании из результата создания в Bitrix24.
        """
        if isinstance(result, dict) and "ID" in result:
            return result["ID"]
        elif isinstance(result, int) or (isinstance(result, str) and result.isdigit()):
            return int(result)
        return None

    @logger()
    async def get_available_regions(self):
        result = await self.session.execute(
            select(distinct(Company.region))
            .order_by(Company.region)
            .where(Company.region.isnot(None))
        )
        regions = [row for row in result.scalars().all()]

        return {"regions": regions}

    @logger()
    async def search_companies_by_inn(self, inn: str, current_user=None) -> List[Dict]:
        """Search companies by INN (Bitrix24 if available, otherwise local DB)."""
        if self.bitrix24 is None:
            # Local DB fallback
            query = select(Company).where(Company.inn.ilike(f"%{inn}%"))
            if current_user and not current_user.is_platform_admin:
                query = query.where(
                    Company.organization_id == current_user.organization_id
                )
            companies = (await self.session.execute(query)).scalars().all()
            return [
                {"ID": c.id, "TITLE": c.name, "INN": c.inn}
                for c in companies
            ]

        payload = {
            "select": BITRIX24_SELECT_PAYLOAD_FIELDS,
            "filter": {"UF_CRM_1741267701427": inn},
        }
        endpoint = "crm.company.list"

        response = await self.bitrix24.make_request_async(endpoint, payload)

        result = response.get("result", [])

        if not result:
            alt_payload = {
                "select": BITRIX24_SELECT_PAYLOAD_FIELDS,
                "filter": {"%UF_CRM_1741267701427": inn},
            }
            alt_response = await self.bitrix24.make_request_async(endpoint, alt_payload)
            alt_result = alt_response.get("result", [])

            if alt_result:
                result = alt_result

        return result

    @logger()
    async def search_companies_by_name(self, search_term: str, current_user=None) -> List[Dict]:
        """Search companies by name or other criteria (Bitrix24 if available, otherwise local DB)."""
        if self.bitrix24 is None:
            # Local DB fallback
            query = select(Company).where(Company.name.ilike(f"%{search_term}%"))
            if current_user and not current_user.is_platform_admin:
                query = query.where(
                    Company.organization_id == current_user.organization_id
                )
            companies = (await self.session.execute(query)).scalars().all()
            return [
                {"ID": c.id, "TITLE": c.name, "INN": c.inn}
                for c in companies
            ]

        payload = {
            "select": BITRIX24_SELECT_PAYLOAD_FIELDS,
            "filter": {"%TITLE": search_term},
        }
        endpoint = "crm.company.list"
        response = await self.bitrix24.make_request_async(endpoint, payload)
        result = response.get("result", [])
        return result

    @logger()
    async def get_company(self, company_id):
        self._require_bitrix()
        company = await self.bitrix24.get_company(company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company with ID {company_id} not found in Bitrix24",
            )
        return company

    @logger()
    async def update_company_address(self, data: dict):
        clinic_id = data.pop("clinic_id", None)
        if clinic_id:
            try:
                await self.session.execute(
                    update(ClinicAddress)
                    .where(ClinicAddress.company_id == clinic_id)
                    .values(**data)
                )
                await self.session.commit()
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail={"detail": str(e), "company_id": data.get("company_id")},
                )
        else:
            try:
                new_address = ClinicAddress(**data)
                self.session.add(new_address)
                await self.session.commit()
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail={"detail": str(e), "company_id": data.get("company_id")},
                )
        return JSONResponse(
            status_code=status.HTTP_201_CREATED, content="Адрес добавлен."
        )

    @logger()
    async def get_company_address(self, data: GetAddressSchema):
        return (
            (
                await self.session.execute(
                    select(ClinicAddress).where(
                        and_(
                            ClinicAddress.company_id == data.company_id,
                            ClinicAddress.is_network == data.is_network,
                        )
                    )
                )
            )
            .scalars()
            .first()
        )

    @logger()
    async def update_company_address_local_db(self):
        async with SessionLocal() as row_session:
            companies = (await row_session.execute(select(Company))).scalars().all()
            for company in companies:
                company_id = company.id
                company_is_network = company.is_network
                company_address = company.dynamic_fields.get(
                    "UF_CRM_6679726EB1750", None
                )
                company_address_no_uf_crm = company.dynamic_fields.get(
                    "6679726EB1750", None
                )
                if company_address and company_address_no_uf_crm:
                    continue
                elif company_address_no_uf_crm:
                    dadata = DadataAsync(
                        token="ccfb3f9450327520afc59a92e80b09a1af89ed1b",
                        secret="67f24a5e99651fe3fd62697bbb96cf09249dd969",
                    )
                    selected_data = await dadata.suggest(
                        name=DADATA_NAME, query=company_address_no_uf_crm
                    )
                    try:
                        result = selected_data[0].get("data")
                    except:
                        continue
                    new_address = AddressSchema(
                        country=result.get("country", None),
                        city=result.get("region_with_type", None),
                        street=result.get("street_with_type", None),
                        number=f"{result.get('house', None)} {result.get('block_type', None)} {result.get('block', None)}",
                        postal_code=result.get("postal_code", None),
                        latitude=result.get("geo_lat", None),
                        longitude=result.get("geo_lon", None),
                        company_id=company_id,
                        is_network=company_is_network,
                    )
                    new_address_db = ClinicAddress(
                        **new_address.model_dump(exclude_unset=True, exclude_none=True)
                    )
                    row_session.add(new_address_db)

                    if self.bitrix24 is not None:
                        await self.bitrix24.simple_update_obj(
                            obj_id=company_id,
                            target_method=CRM_COMPANY_UPDATE,
                            bitrix_fields={
                                "REG_ADDRESS": f"{result.get('street_with_type', None)} {result.get('house', None)} {result.get('block_type', None)} {result.get('block', None)}",
                                "REG_ADDRESS_CITY": result.get("region_with_type", None),
                                "REG_ADDRESS_POSTAL_CODE": result.get("postal_code", None),
                                "REG_ADDRESS_COUNTRY": result.get("country", None),
                            },
                        )
            await row_session.commit()

    @logger()
    async def get_company_by_address(self, street: str, build_number: str):
        company_id = (
            (
                await self.session.execute(
                    select(ClinicAddress.company_id).where(
                        and_(
                            ClinicAddress.street.ilike(f"%{street}%"),
                            ClinicAddress.number.ilike(f"%{build_number}%"),
                        )
                    )
                )
            )
            .scalars()
            .first()
        )
        if not company_id:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"result": "Компания не найдена."},
            )
        result = (
            (
                await self.session.execute(
                    select(Company).where(Company.id == company_id)
                )
            )
            .scalars()
            .first()
        )
        if not result:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"result": "Компания не найдена."},
            )

        company_data = ClinicBase.model_validate(result).model_dump()
        company_data["last_visit_date"] = (
            company_data.get("last_visit_date").isoformat()
            if company_data.get("last_visit_date")
            else None
        )
        company_data["last_sale_date"] = (
            company_data.get("last_sale_date").isoformat()
            if company_data.get("last_sale_date")
            else None
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"result": company_data},
        )
