import json
import logging
from datetime import datetime
from typing import Dict, List

from fastapi import HTTPException
from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from starlette import status

from app.config import (
    DATE_FIELDS_KEY,
    DATE_FORMATS_UPDATE_VISIT,
    VISIT_ENTITY_TYPE_ID,
    Settings,
)
from app.emuns.clinic_enum import SyncStatus
from app.emuns.visit_enum import EntityType, VisitStatus
from app.models import Company, FormTemplate, GlobalSettings, Organization, User, Visit
from app.schemas.visit_schema import VisitCreate, VisitDeleteSchema
from app.services.bitrix24 import Bitrix24ApiError, Bitrix24Client, require_bitrix24
from app.utils.logger import logger


class VisitService:
    def __init__(self, session: AsyncSession, bitrix24: Bitrix24Client):
        self.session = session
        self.bitrix24 = bitrix24

    def _require_bitrix(self) -> Bitrix24Client:
        return require_bitrix24(self.bitrix24)

    @logger()
    async def _check_visit_plan_limits(self, current_user: User):
        """Check if org is on FREE plan and has exceeded monthly visit limit."""
        from sqlalchemy import extract, func

        org = (
            (
                await self.session.execute(
                    select(Organization).where(Organization.id == current_user.organization_id)
                )
            )
            .scalars()
            .first()
        )
        if not org or org.plan != "free":
            return

        max_visits = (org.plan_limits or {}).get("max_visits_per_month", 100)
        now = datetime.now()
        month_visit_count = await self.session.scalar(
            select(func.count(Visit.id)).where(
                Visit.organization_id == current_user.organization_id,
                extract("year", Visit.date) == now.year,
                extract("month", Visit.date) == now.month,
            )
        )
        if month_visit_count >= max_visits:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Лимит визитов для бесплатного плана ({max_visits}/мес) исчерпан. Обновите план.",
            )

    @logger()
    async def get_visits(self, current_user):
        query = (
            select(Visit)
            .options(
                joinedload(Visit.company).joinedload(
                    Company.contacts
                )  # Загружаем компанию и её контакты
            )
            .where(Visit.organization_id == current_user.organization_id)
        )
        # Regular users see only their own visits; org_admin/platform_admin see all org visits
        if not current_user.is_org_admin:
            query = query.where(Visit.user_id == current_user.id)

        result = await self.session.execute(query)
        return result.unique().scalars().all()

    @logger()
    async def get_visits_by_company(self, company_id, current_user):
        query = (
            select(Visit)
            .options(joinedload(Visit.company).joinedload(Company.contacts))
            .where(Visit.company_id == company_id)
            .where(Visit.organization_id == current_user.organization_id)
            .order_by(Visit.date.desc())
        )
        result = await self.session.execute(query)
        return result.unique().scalars().all()

    @logger()
    async def update_visit_status(self, visit_id, status_update, current_user):
        db_visit = await self.get_visit(visit_id=visit_id, current_user=current_user)

        if status_update.stageId == "DT1054_21:SUCCESS":
            db_visit.dynamic_fields["status"] = "Состоялся"
            db_visit.status = VisitStatus.COMPLETED.value
        elif status_update.stageId == "DT1054_21:FAIL":
            db_visit.dynamic_fields["status"] = "Провалился"
            db_visit.status = VisitStatus.FAILED.value

        # Проверяем, есть ли дата в динамических полях
        if db_visit.dynamic_fields and "date" in db_visit.dynamic_fields:
            date_str = db_visit.dynamic_fields["date"]
            if isinstance(date_str, str):
                if "Z" in date_str:
                    date_str = date_str.replace("Z", "+00:00")
                date_obj = datetime.fromisoformat(date_str)
                db_visit.date = date_obj

        db_visit.sync_status = SyncStatus.PENDING.value
        await self.session.commit()
        await self.session.refresh(db_visit)

        if db_visit.bitrix_id and self.bitrix24 is not None:
            try:
                form_template = (
                    await self.session.execute(
                        select(FormTemplate).where(
                            FormTemplate.entity_type == "visit",
                            FormTemplate.organization_id == current_user.organization_id,
                        )
                    )
                ).scalars().first()

                template_fields = form_template.fields if form_template else []
                field_mapping_dict = {
                    f["key"]: f["bitrix_field_id"]
                    for f in template_fields
                    if f.get("bitrix_field_id")
                }
                list_field_mappings = {
                    f["key"]: f["bitrix_value_mapping"]
                    for f in template_fields
                    if f.get("bitrix_field_type") == "list" and f.get("bitrix_value_mapping")
                }
                bitrix_data = {"stageId": status_update.stageId}
                if db_visit.date:
                    formatted_date = (
                        db_visit.date.isoformat()
                        if hasattr(db_visit.date, "isoformat")
                        else str(db_visit.date)
                    )

                    bitrix_data["DATE"] = formatted_date
                    # Use FormTemplate to resolve date field ID instead of hardcode
                    date_bitrix_id = field_mapping_dict.get("date")
                    if date_bitrix_id:
                        bitrix_data[date_bitrix_id] = formatted_date
                    bitrix_data["date"] = formatted_date

                    if not db_visit.dynamic_fields:
                        db_visit.dynamic_fields = {}
                    db_visit.dynamic_fields["date"] = formatted_date

                dynamic_fields_bitrix = {}
                if db_visit.dynamic_fields:
                    for field, value in db_visit.dynamic_fields.items():
                        if field == "status":
                            continue

                        bitrix_field_id = field_mapping_dict.get(field, field)
                        processed_value = value

                        field_type = next(
                            (
                                f.get("bitrix_field_type")
                                for f in template_fields
                                if f.get("key") == field
                            ),
                            None,
                        )

                        if field_type == "datetime" or field == "date":
                            if isinstance(value, str):
                                if (
                                    "T" not in value
                                    and "t" not in value
                                    and " " not in value
                                    and "_" not in value
                                ):
                                    # Если нет разделителя, добавляем текущее время
                                    now = datetime.now()
                                    time_str = f"T{now.hour:02d}:{now.minute:02d}:00"
                                    value = f"{value}{time_str}"

                                value_for_parsing = value.replace("Z", "+00:00")
                                dt = datetime.fromisoformat(value_for_parsing)
                                processed_value = dt.isoformat()
                            elif isinstance(value, datetime):
                                # Если это уже объект datetime, просто преобразуем в ISO формат
                                processed_value = value.isoformat()
                            else:
                                # Для других типов пробуем преобразовать в строку
                                processed_value = str(value)

                            if field == "date":
                                bitrix_data["DATE"] = processed_value
                                # Date Bitrix field resolved from FormTemplate mapping
                                date_btx_id = field_mapping_dict.get("date")
                                if date_btx_id:
                                    bitrix_data[date_btx_id] = processed_value
                                bitrix_data["date"] = processed_value

                        elif field_type == "list" or field in list_field_mappings:
                            if field in list_field_mappings:
                                for option in list_field_mappings[field]:
                                    if option["app_value"] == value:
                                        # Получаем код значения из маппинга
                                        processed_value = option["bitrix_value"]
                                        break

                        dynamic_fields_bitrix[bitrix_field_id] = processed_value

                # Добавляем все динамические поля в основной набор данных
                bitrix_data.update(dynamic_fields_bitrix)

                visit_with_relations = (
                    (
                        await self.session.execute(
                            select(Visit)
                            .options(
                                joinedload(Visit.company),
                            )
                            .where(Visit.id == visit_id)
                        )
                    )
                    .scalars()
                    .first()
                )

                if (
                    visit_with_relations
                    and visit_with_relations.company
                    and visit_with_relations.company.bitrix_id
                ):
                    bitrix_data["companyId"] = visit_with_relations.company.bitrix_id

                result = await self.bitrix24.update_smart_process_item(
                    Settings.BITRIX24_SMART_PROCESS_VISIT_ID,
                    db_visit.bitrix_id,
                    bitrix_data,
                )

                if result and not result.get("error"):
                    db_visit.sync_status = SyncStatus.SYNCED.value
                    db_visit.last_synced = datetime.utcnow()
                    await self.session.commit()
                else:
                    db_visit.sync_status = SyncStatus.ERROR.value
                    await self.session.commit()
            except Exception:
                db_visit.sync_status = SyncStatus.ERROR.value
                await self.session.commit()
        await self.session.refresh(db_visit)
        return await self.make_response_dict(db_visit)

    @logger()
    async def get_visit(self, visit_id, current_user, join_options=False):
        """
        Находит визит по ID и пользователю, загружая связанные данные (компанию и контакты компании).
        """
        query = select(Visit)
        if join_options:
            query = query.options(
                joinedload(Visit.company).joinedload(Company.contacts)
            )
        query = query.where(
            Visit.id == visit_id,
            Visit.organization_id == current_user.organization_id,
        )
        # Regular users can only access their own visits
        if not current_user.is_org_admin:
            query = query.where(Visit.user_id == current_user.id)

        visit = (await self.session.execute(query)).scalars().first()

        if not visit:
            raise HTTPException(status_code=404, detail="Visit not found")

        return visit

    @logger()
    async def create_visit(self, visit: VisitCreate, current_user: User):
        """
        Создает новый визит, проверяет дату, обрабатывает связанные данные и синхронизирует с Bitrix24.
        """
        try:
            # 0. Plan limits enforcement: check monthly visit count for FREE plan
            await self._check_visit_plan_limits(current_user)

            # 1. Проверка ограничения на прошлые даты
            await self._validate_visit_date(visit)

            # 2. Получение или создание компании
            db_company = await self._get_or_create_company(visit, current_user)

            # 3. Подготовка данных визита
            visit_data = await self._prepare_visit_data(visit, db_company, current_user)

            # 4. Создание объекта визита
            db_visit = Visit(**visit_data)

            # 5. Обработка динамических полей и врачей
            await self._process_dynamic_fields_and_contacts(db_visit, visit)

            # 6. Сохранение визита в базу данных
            self.session.add(db_visit)
            await self.session.commit()
            await self.session.refresh(db_visit)

            db_visit_fetched = (
                (
                    await self.session.execute(
                        select(Visit)
                        .options(
                            joinedload(Visit.company),
                            joinedload(Visit.user),
                            joinedload(Visit.contacts),
                        )
                        .where(Visit.id == db_visit.id)
                    )
                )
                .scalars()
                .first()
            )
            # 7. Синхронизация с Bitrix24
            db_visit_fetched = await self._sync_with_bitrix24(
                db_visit=db_visit_fetched,
                visit=visit,
                current_user=current_user,
            )

            return await self.make_response_dict(db_visit_fetched)

        except HTTPException:
            raise
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ошибка при создании визита: {type(e).__name__}: {str(e)}",
            )

    @logger()
    async def _validate_visit_date(self, visit: VisitCreate):
        """
        Проверяет, что дата визита не находится в прошлом.
        """
        restrict_past_dates_setting = (
            (
                await self.session.execute(
                    select(GlobalSettings).where(
                        GlobalSettings.key == "restrict_past_dates"
                    )
                )
            )
            .scalars()
            .first()
        )

        if (
            restrict_past_dates_setting
            and restrict_past_dates_setting.value.lower() == "true"
        ):
            today = datetime.now().date()
            if not visit.date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Дата визита не указана.",
                )
            visit_date = (
                visit.date.date() if isinstance(visit.date, datetime) else visit.date
            )
            if visit_date < today:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Невозможно создать визит с датой в прошлом. "
                        "Согласно настройкам системы, визиты можно планировать "
                        "только на текущую дату или будущее время."
                    ),
                )

    @logger()
    async def _get_or_create_company(self, visit: VisitCreate, current_user: User) -> Company:
        """
        Получает или создает компанию для визита.
        """
        bitrix_company_id = None
        if (
            hasattr(visit, "dynamic_fields")
            and visit.dynamic_fields
            and "bitrix_company_id" in visit.dynamic_fields
        ):
            bitrix_company_id = visit.dynamic_fields.get("bitrix_company_id")

        if not bitrix_company_id:
            local_company = (
                (
                    await self.session.execute(
                        select(Company).where(
                            Company.id == int(visit.company_id),
                            Company.organization_id == current_user.organization_id,
                        )
                    )
                )
                .scalars()
                .first()
            )
            if local_company:
                return local_company
            bitrix_company_id = str(visit.company_id)

        db_company = (
            (
                await self.session.execute(
                    select(Company).where(Company.bitrix_id == int(bitrix_company_id))
                )
            )
            .scalars()
            .first()
        )

        if not db_company:
            if self.bitrix24 is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Компания не найдена в локальной базе, а Bitrix24 не настроен для её получения.",
                )
            company_data = await self.bitrix24.get_company(int(bitrix_company_id))
            if not company_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Компания не найдена.",
                )
            company_name = company_data.get(
                "TITLE", f"Компания (Bitrix ID: {bitrix_company_id})"
            )
            db_company = Company(
                bitrix_id=int(bitrix_company_id),
                name=company_name,
                region="",
                organization_id=current_user.organization_id,
                sync_status=SyncStatus.SYNCED.value,
                last_synced=datetime.now(),
            )
            self.session.add(db_company)
            await self.session.commit()
            await self.session.refresh(db_company)

        return db_company

    @staticmethod
    @logger()
    async def _prepare_visit_data(
        visit: VisitCreate, db_company: Company, current_user: User
    ) -> Dict:
        """
        Подготавливает данные для создания визита.
        """
        visit_data = visit.model_dump(exclude={"contacts", "dynamic_fields"})
        visit_data["company_id"] = db_company.id

        if "date" in visit_data and isinstance(visit_data["date"], str):
            original_date = visit_data["date"]
            try:
                if (
                    "T" not in original_date
                    and "t" not in original_date
                    and " " not in original_date
                ):
                    now = datetime.now().replace(microsecond=0)
                    time_str = f"T{now.hour:02d}:{now.minute:02d}:{now.second:02d}"
                    visit_data["date"] = f"{original_date}{time_str}"
                date_str = visit_data["date"].replace("Z", "+00:00")
                visit_data["date"] = datetime.fromisoformat(date_str)
            except ValueError:
                visit_data["date"] = datetime.now().replace(microsecond=0)

        if "status" in visit_data and isinstance(visit_data["status"], str):
            visit_data["status"] = visit_data["status"].lower()

        visit_data["user_id"] = current_user.id
        visit_data["organization_id"] = current_user.organization_id
        visit_data["sync_status"] = SyncStatus.PENDING.value

        return visit_data

    @logger()
    async def _process_dynamic_fields_and_contacts(
        self, db_visit: Visit, visit: VisitCreate
    ):
        """
        Обрабатывает динамические поля и связанных контактов.
        """
        if hasattr(visit, "dynamic_fields") and visit.dynamic_fields:
            db_visit.dynamic_fields = visit.dynamic_fields
            for key in visit.dynamic_fields.keys():
                if any(date_key in key.lower() for date_key in DATE_FIELDS_KEY):
                    date_value = visit.dynamic_fields[key]
                    if isinstance(date_value, str):
                        date_value = date_value.replace("Z", "+00:00")
                        if "T" not in date_value:
                            date_value = f"{date_value}T00:00:00"
                        try:
                            date_obj = datetime.fromisoformat(date_value)
                        except ValueError:
                            continue
                        db_visit.date = date_obj
                        break

        # Link contacts to visit
        if hasattr(visit, "contacts") and visit.contacts:
            from app.models import Contact
            contacts = (
                (
                    await self.session.execute(
                        select(Contact).where(Contact.id.in_(visit.contacts))
                    )
                )
                .scalars()
                .all()
            )
            db_visit.contacts = contacts

    @logger()
    async def _sync_with_bitrix24(
        self, db_visit, visit: VisitCreate, current_user: User
    ):
        """
        Синхронизирует данные визита с Bitrix24.
        Если Bitrix24 не настроен, сохраняет визит только локально.
        """
        if self.bitrix24 is None:
            db_visit.sync_status = SyncStatus.PENDING.value
            await self.session.commit()
            await self.session.refresh(db_visit)
            return db_visit
        formatted_date = None
        if hasattr(visit, "date"):
            formatted_date = (
                visit.date.isoformat()
                if hasattr(visit.date, "isoformat")
                else str(visit.date)
            )
            if "T" not in formatted_date:
                now = datetime.now()
                time_str = f"T{now.hour:02d}:{now.minute:02d}:00"
                formatted_date = f"{formatted_date.split(' ')[0]}{time_str}"

        bitrix_data = {
            "TITLE": f"Визит {visit.date}",
            "COMPANY_ID": db_visit.company.bitrix_id,
            "ASSIGNED_BY_ID": current_user.bitrix_user_id,
        }
        if formatted_date:
            bitrix_data["DATE"] = formatted_date
            bitrix_data["date"] = formatted_date
            # Date Bitrix field ID resolved from FormTemplate below
            db_visit.dynamic_fields["date"] = formatted_date

        form_template = (
            await self.session.execute(
                select(FormTemplate).where(
                    FormTemplate.entity_type == "visit",
                    FormTemplate.organization_id == current_user.organization_id,
                )
            )
        ).scalars().first()

        if not form_template:
            import logging
            logging.getLogger(__name__).warning(
                "FormTemplate для визитов не найден (org_id=%s). Динамические поля не будут синхронизированы с Bitrix24.",
                current_user.organization_id if current_user else "?"
            )
            db_visit.sync_error = "FormTemplate для визитов не настроен — динамические поля не синхронизированы"

        template_fields = form_template.fields if form_template else []
        field_mapping_dict = {
            f["key"]: f["bitrix_field_id"]
            for f in template_fields
            if f.get("bitrix_field_id")
        }
        list_field_mappings = {
            f["key"]: f["bitrix_value_mapping"]
            for f in template_fields
            if f.get("bitrix_field_type") == "list" and f.get("bitrix_value_mapping")
        }

        # Add date field using FormTemplate mapping
        if formatted_date:
            date_bitrix_id = field_mapping_dict.get("date")
            if date_bitrix_id:
                bitrix_data[date_bitrix_id] = formatted_date

        if hasattr(visit, "dynamic_fields") and visit.dynamic_fields:
            for field, value in visit.dynamic_fields.items():
                bitrix_field_id = field_mapping_dict.get(field, field)
                processed_value = value
                field_type = next(
                    (f.get("bitrix_field_type") for f in template_fields if f.get("key") == field),
                    None,
                )

                if field_type in ("datetime", "date") or field.lower().endswith("date"):
                    if isinstance(value, str):
                        value = value.replace("Z", "+00:00")
                        if "T" not in value:
                            value = f"{value}T00:00:00"
                        processed_value = datetime.fromisoformat(value).strftime(
                            "%Y-%m-%dT%H:%M:%S"
                        )

                if field in list_field_mappings:
                    processed_value = next(
                        (
                            option["bitrix_value"]
                            for option in list_field_mappings[field]
                            if option["app_value"] == value
                        ),
                        value,
                    )

                bitrix_data[bitrix_field_id] = processed_value

        try:
            result = await self.bitrix24.create_smart_process_item(
                Settings.BITRIX24_SMART_PROCESS_VISIT_ID, bitrix_data
            )
            if result and isinstance(result, dict):
                if "item" in result and "id" in result["item"]:
                    db_visit.bitrix_id = result["item"]["id"]
                elif "id" in result:
                    db_visit.bitrix_id = result["id"]

                if db_visit.bitrix_id:
                    db_visit.sync_status = SyncStatus.SYNCED.value
                    db_visit.sync_error = None
                    db_visit.last_synced = datetime.now()
                else:
                    db_visit.sync_status = SyncStatus.ERROR.value
                    db_visit.sync_error = "Bitrix24 не вернул ID после создания визита"
            else:
                db_visit.sync_status = SyncStatus.ERROR.value
                db_visit.sync_error = "Bitrix24 вернул пустой результат при создании визита"
        except Bitrix24ApiError as e:
            db_visit.sync_status = SyncStatus.ERROR.value
            db_visit.sync_error = str(e)
        except Exception as e:
            db_visit.sync_status = SyncStatus.ERROR.value
            db_visit.sync_error = f"Неожиданная ошибка: {str(e)}"

        await self.session.commit()
        await self.session.refresh(db_visit)
        return db_visit

    @logger()
    async def update_visit(self, visit_id: int, request, current_user: User):
        """Обновляет визит и синхронизирует изменения с Bitrix24."""
        try:
            raw_data = await request.json()

            # 1. Проверка ограничения на прошлые даты
            if "date" in raw_data:
                await self._validate_future_date(raw_data["date"])

            # 2. Подготовка данных для обновления
            update_data = await self._prepare_update_data(raw_data)

            # 3. Получение визита из базы данных
            db_visit = await self._get_visit_or_404(visit_id)

            # 4. Обновление основных полей визита
            db_visit = await self._update_basic_fields(db_visit, update_data)

            # 5. Обновление динамических полей
            db_visit = await self._update_dynamic_fields(
                db_visit, update_data["dynamic_fields"]
            )

            # 6. Обновление связанных врачей
            # 7. Сохранение изменений в базе данных
            db_visit.sync_status = SyncStatus.PENDING.value
            self.session.add(db_visit)
            await self.session.commit()
            await self.session.refresh(db_visit)

            # 8. Синхронизация с Bitrix24
            if db_visit.bitrix_id:
                db_visit = await self._sync_with_bitrix24_update(db_visit, current_user)

            return await self.make_response_dict(db_visit)

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ошибка при обновлении визита: {str(e)}",
            )

    @logger()
    async def _validate_future_date(self, date_str: str):
        """
        Проверяет, что дата не находится в прошлом.
        """
        restrict_past_dates_setting = (
            (
                await self.session.execute(
                    select(GlobalSettings).where(
                        GlobalSettings.key == "restrict_past_dates"
                    )
                )
            )
            .scalars()
            .first()
        )

        if (
            restrict_past_dates_setting
            and restrict_past_dates_setting.value.lower() == "true"
        ):
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            parsed_date = await self._parse_date(date_str)
            parsed_date = parsed_date.replace(tzinfo=None)
            if parsed_date < today:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Невозможно изменить дату визита на дату в прошлом. "
                        "Согласно настройкам системы, визиты можно планировать "
                        "только на текущую дату или будущее время."
                    ),
                )

    @logger()
    async def _prepare_update_data(self, raw_data: Dict) -> Dict:
        """
        Подготавливает данные для обновления визита.
        """
        update_data = {}

        if "company_id" in raw_data:
            update_data["company_id"] = raw_data["company_id"]

        if "date" in raw_data:
            update_data["date"] = await self._parse_date(raw_data["date"])


        if "dynamic_fields" in raw_data:
            update_data["dynamic_fields"] = raw_data["dynamic_fields"]

        return update_data

    @logger()
    async def _get_visit_or_404(self, visit_id: int):
        """
        Находит визит по ID или вызывает HTTPException 404.
        """
        query = (
            select(Visit)
            .options(joinedload(Visit.company))
            .options(joinedload(Visit.doctors))
            .options(joinedload(Visit.contacts))
            .where(Visit.id == visit_id)
        )
        result = await self.session.execute(query)
        db_visit = result.scalars().first()

        if not db_visit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found"
            )

        return db_visit

    @logger()
    async def _update_basic_fields(self, db_visit, update_data: Dict):
        """
        Обновляет основные поля визита.
        """
        if "company_id" in update_data:
            db_visit.company_id = update_data["company_id"]
        if "date" in update_data:
            db_visit.date = update_data["date"]
        await self.session.commit()
        await self.session.refresh(db_visit)
        return db_visit

    @logger()
    async def _update_dynamic_fields(self, db_visit, dynamic_fields: Dict):
        """Обновляет динамические поля визита."""
        if not db_visit.dynamic_fields:
            db_visit.dynamic_fields = {}

        updated_fields = dict(db_visit.dynamic_fields)
        updated_fields.update(dynamic_fields)
        db_visit.dynamic_fields = updated_fields

        await self.session.commit()
        await self.session.refresh(db_visit)
        return db_visit

    @logger()
    async def _sync_with_bitrix24_update(self, db_visit, current_user: User):
        """
        Синхронизирует данные визита с Bitrix24.
        Если Bitrix24 не настроен, пропускает синхронизацию.
        """
        if self.bitrix24 is None:
            db_visit.sync_status = SyncStatus.PENDING.value
            await self.session.commit()
            await self.session.refresh(db_visit)
            return db_visit
        form_template = (
            await self.session.execute(
                select(FormTemplate).where(
                    FormTemplate.entity_type == "visit",
                    FormTemplate.organization_id == current_user.organization_id,
                )
            )
        ).scalars().first()

        template_fields = form_template.fields if form_template else []
        field_mapping_dict = {
            f["key"]: f["bitrix_field_id"]
            for f in template_fields
            if f.get("bitrix_field_id")
        }
        list_field_mappings = {
            f["key"]: f["bitrix_value_mapping"]
            for f in template_fields
            if f.get("bitrix_field_type") == "list" and f.get("bitrix_value_mapping")
        }

        dynamic_fields_bitrix = {}
        for field_name, value in db_visit.dynamic_fields.items():
            bitrix_field_id = field_mapping_dict.get(field_name, field_name)
            processed_value = value

            field_type = next(
                (
                    f.get("bitrix_field_type")
                    for f in template_fields
                    if f.get("key") == field_name
                ),
                None,
            )
            if field_type == "datetime" and isinstance(value, str):
                processed_value = datetime.fromisoformat(value).isoformat()
            elif field_type == "list" or field_name in list_field_mappings:
                processed_value = await self._map_list_value(
                    value, list_field_mappings.get(field_name)
                )

            dynamic_fields_bitrix[bitrix_field_id] = processed_value

        bitrix_data = {
            "COMPANY_ID": db_visit.company.bitrix_id,
            "ASSIGNED_BY_ID": current_user.bitrix_user_id,
        }
        bitrix_data.update(dynamic_fields_bitrix)

        try:
            result = await self.bitrix24.update_smart_process_item(
                Settings.BITRIX24_SMART_PROCESS_VISIT_ID,
                db_visit.bitrix_id,
                bitrix_data,
            )
            if result:
                db_visit.sync_status = SyncStatus.SYNCED.value
                db_visit.sync_error = None
                db_visit.last_synced = datetime.now()
            else:
                db_visit.sync_status = SyncStatus.ERROR.value
                db_visit.sync_error = "Bitrix24 вернул пустой результат при обновлении визита"
            await self.session.commit()
        except Bitrix24ApiError as e:
            db_visit.sync_status = SyncStatus.ERROR.value
            db_visit.sync_error = str(e)
            await self.session.commit()
        except Exception as e:
            db_visit.sync_status = SyncStatus.ERROR.value
            db_visit.sync_error = f"Неожиданная ошибка: {str(e)}"
            await self.session.commit()
        await self.session.refresh(db_visit)
        return db_visit

    @staticmethod
    @logger()
    async def _parse_date(date_str: str) -> datetime:
        """Парсит строку даты в объект datetime."""
        from app.utils.date_utils import parse_date
        result = parse_date(date_str)
        if result is None:
            raise ValueError(f"Неверный формат даты: {date_str}")
        return result

    @staticmethod
    @logger()
    async def _map_list_value(value, options):
        """
        Преобразует значение списка в соответствии с маппингом.
        """
        if not options:
            return value
        if isinstance(value, list):
            return [
                next((o["bitrix_value"] for o in options if o["app_value"] == v), v)
                for v in value
            ]
        return next(
            (o["bitrix_value"] for o in options if o["app_value"] == value), value
        )

    @staticmethod
    @logger()
    async def make_response_dict(db_visit_fetched):  # TODO исправить это дерьмо
        return {
            "id": db_visit_fetched.id,
            "company_id": db_visit_fetched.company_id,
            "user_id": db_visit_fetched.user_id,
            "date": db_visit_fetched.date,
            "dynamic_fields": db_visit_fetched.dynamic_fields,
            "bitrix_id": db_visit_fetched.bitrix_id,
            "sync_status": db_visit_fetched.sync_status,
            "last_synced": db_visit_fetched.last_synced,
            "status": db_visit_fetched.status,
            "company": (
                {
                    "id": db_visit_fetched.company.id,
                    "name": db_visit_fetched.company.name,
                    "bitrix_id": db_visit_fetched.company.bitrix_id,
                    "address": db_visit_fetched.company.dynamic_fields.get(
                        "6679726eb1750"
                    ),
                    "dynamic_fields": db_visit_fetched.company.dynamic_fields,
                }
                if db_visit_fetched.company
                else None
            ),
        }

    @logger()
    async def delete_visit(self, data: VisitDeleteSchema, current_user: User):
        """Удаляет визит по visit_id или visit_bitrix_id."""
        bitrix_update_fields = {"stageId": "DT1054_21:FAIL"}
        org_id = current_user.organization_id

        if data.visit_id:
            visit: Visit = await self.get_visit_admin(
                visit_id=data.visit_id, current_user=current_user
            )
            visit_bitrix_id = visit.bitrix_id
            await self.session.execute(
                delete(Visit).where(
                    Visit.id == data.visit_id,
                    Visit.organization_id == org_id,
                )
            )

        elif data.visit_bitrix_id:
            visit_bitrix_id = data.visit_bitrix_id
            await self.session.execute(
                delete(Visit).where(
                    Visit.bitrix_id == data.visit_bitrix_id,
                    Visit.organization_id == org_id,
                )
            )

        else:
            raise ValueError(
                "Не передан ни один идентификатор визита: visit_id или visit_bitrix_id"
            )
        await self.session.commit()
        if self.bitrix24 is not None and visit_bitrix_id:
            await self.bitrix24.update_smart_process_item(
                process_id=VISIT_ENTITY_TYPE_ID,
                item_id=visit_bitrix_id,
                fields=bitrix_update_fields,
            )
        return

    @logger()
    async def get_visit_admin(self, visit_id, current_user: User):
        """
        Находит визит по ID в рамках организации
        """
        visit = (
            (
                await self.session.execute(
                    select(Visit).where(
                        Visit.id == visit_id,
                        Visit.organization_id == current_user.organization_id,
                    )
                )
            )
            .scalars()
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="Visit not found")
        return visit
