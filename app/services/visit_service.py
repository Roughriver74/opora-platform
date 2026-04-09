import json
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
from app.models import Company, Doctor, FieldMapping, GlobalSettings, User, Visit
from app.schemas.visit_schema import VisitCreate, VisitDeleteSchema
from app.services.bitrix24 import Bitrix24Client
from app.utils.logger import logger


class VisitService:
    def __init__(self, session: AsyncSession, bitrix24: Bitrix24Client):
        self.session = session
        self.bitrix24 = bitrix24

    @logger()
    async def get_visits(self, current_user):
        result = await self.session.execute(
            select(Visit)
            .options(
                joinedload(Visit.company).joinedload(
                    Company.contacts
                )  # Загружаем компанию и её контакты
            )
            .where(Visit.user_id == current_user.id)
        )
        return result.unique().scalars().all()

    @logger()
    async def get_visits_by_company(self, company_id):
        result = await self.session.execute(
            select(Visit)
            .options(joinedload(Visit.company).joinedload(Company.contacts))
            .where(Visit.company_id == company_id)
            .order_by(Visit.date.desc())
        )
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

        if db_visit.bitrix_id:
            try:
                field_mappings = (
                    (
                        await self.session.execute(
                            select(FieldMapping).where(
                                FieldMapping.entity_type == EntityType.VISIT.value
                            )
                        )
                    )
                    .scalars()
                    .all()
                )
                field_mapping_dict = {}
                list_field_mappings = {}

                for mapping in field_mappings:
                    field_mapping_dict[mapping.app_field_name] = mapping.bitrix_field_id
                    if mapping.field_type == "list" and mapping.value_options:
                        value_options = json.loads(mapping.value_options)
                        list_field_mappings[mapping.app_field_name] = value_options
                bitrix_data = {"stageId": status_update.stageId}
                if db_visit.date:
                    formatted_date = (
                        db_visit.date.isoformat()
                        if hasattr(db_visit.date, "isoformat")
                        else str(db_visit.date)
                    )

                    bitrix_data["DATE"] = formatted_date
                    bitrix_data["UF_CRM_1732026990932"] = formatted_date
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
                                mapping.field_type
                                for mapping in field_mappings
                                if mapping.app_field_name == field
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
                                bitrix_data["UF_CRM_1732026990932"] = processed_value
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
                                joinedload(Visit.doctors),
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

                if visit_with_relations and visit_with_relations.doctors:
                    contact_ids = []
                    for doctor in visit_with_relations.doctors:
                        if doctor.bitrix_id:
                            contact_ids.append(doctor.bitrix_id)
                    if contact_ids:
                        bitrix_data["contactId"] = contact_ids

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
        query = query.where(Visit.id == visit_id, Visit.user_id == current_user.id)

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
            # 1. Проверка ограничения на прошлые даты
            await self._validate_visit_date(visit)

            # 2. Получение или создание компании
            db_company = await self._get_or_create_company(visit)

            # 3. Подготовка данных визита
            visit_data = await self._prepare_visit_data(visit, db_company, current_user)

            # 4. Создание объекта визита
            db_visit = Visit(**visit_data)

            # 5. Обработка динамических полей и врачей
            await self._process_dynamic_fields_and_doctors(db_visit, visit)

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
                            joinedload(Visit.doctors),
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

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ошибка при создании визита: {str(e)}",
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
    async def _get_or_create_company(self, visit: VisitCreate) -> Company:
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
                        select(Company).where(Company.id == int(visit.company_id))
                    )
                )
                .scalars()
                .first()
            )
            bitrix_company_id = (
                str(local_company.bitrix_id)
                if local_company and local_company.bitrix_id
                else str(visit.company_id)
            )

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
        visit_data = visit.model_dump(exclude={"doctors", "dynamic_fields"})
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
        visit_data["sync_status"] = SyncStatus.PENDING.value

        return visit_data

    @logger()
    async def _process_dynamic_fields_and_doctors(
        self, db_visit: Visit, visit: VisitCreate
    ):
        """
        Обрабатывает динамические поля и связанных врачей.
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

        if hasattr(visit, "doctors") and visit.doctors:
            doctors = (
                (
                    await self.session.execute(
                        select(Doctor).where(Doctor.id.in_(visit.doctors))
                    )
                )
                .scalars()
                .all()
            )
            db_visit.doctors = doctors

    @logger()
    async def _sync_with_bitrix24(
        self, db_visit, visit: VisitCreate, current_user: User
    ):
        """
        Синхронизирует данные визита с Bitrix24.
        """
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
            bitrix_data.update(
                {
                    "DATE": formatted_date,
                    "UF_CRM_1732026990932": formatted_date,
                    "date": formatted_date,
                }
            )
            db_visit.dynamic_fields["date"] = formatted_date

        field_mappings = (
            (
                await self.session.execute(
                    select(FieldMapping).where(
                        FieldMapping.entity_type == EntityType.VISIT.value
                    )
                )
            )
            .scalars()
            .all()
        )

        field_mapping_dict = {
            mapping.app_field_name: mapping.bitrix_field_id
            for mapping in field_mappings
        }
        list_field_mappings = {
            mapping.app_field_name: json.loads(mapping.value_options)
            for mapping in field_mappings
            if mapping.field_type == "list" and mapping.value_options
        }

        if hasattr(visit, "dynamic_fields") and visit.dynamic_fields:
            for field, value in visit.dynamic_fields.items():
                bitrix_field_id = field_mapping_dict.get(field, field)
                processed_value = value
                field_type = next(
                    (m.field_type for m in field_mappings if m.app_field_name == field),
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
                    db_visit.last_synced = datetime.now()
                else:
                    db_visit.sync_status = SyncStatus.ERROR.value
            else:
                db_visit.sync_status = SyncStatus.ERROR.value
        except Exception:
            db_visit.sync_status = SyncStatus.ERROR.value

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
            if "doctor_ids" in update_data:
                db_visit = await self._update_doctors(
                    db_visit, update_data["doctor_ids"]
                )

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

        if "doctor_ids" in raw_data:
            update_data["doctor_ids"] = raw_data["doctor_ids"]

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
    async def _update_doctors(self, db_visit, doctor_ids: List[int]):
        """
        Обновляет список связанных врачей.
        """
        doctors = (
            (
                await self.session.execute(
                    select(Doctor).where(Doctor.id.in_(doctor_ids))
                )
            )
            .scalars()
            .all()
        )

        db_visit.doctors.clear()
        db_visit.doctors.extend(doctors)
        await self.session.commit()
        await self.session.refresh(db_visit)
        return db_visit

    @logger()
    async def _sync_with_bitrix24_update(self, db_visit, current_user: User):
        """
        Синхронизирует данные визита с Bitrix24.
        """
        field_mappings = (
            (
                await self.session.execute(
                    select(FieldMapping).where(FieldMapping.entity_type == "visit")
                )
            )
            .scalars()
            .all()
        )

        field_mapping_dict = {
            mapping.app_field_name: mapping.bitrix_field_id
            for mapping in field_mappings
        }
        list_field_mappings = {
            mapping.app_field_name: json.loads(mapping.value_options)
            for mapping in field_mappings
            if mapping.field_type == "list" and mapping.value_options
        }

        dynamic_fields_bitrix = {}
        for field_name, value in db_visit.dynamic_fields.items():
            bitrix_field_id = field_mapping_dict.get(field_name, field_name)
            processed_value = value

            field_type = next(
                (
                    m.field_type
                    for m in field_mappings
                    if m.app_field_name == field_name
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
                db_visit.last_synced = datetime.now()
            else:
                db_visit.sync_status = SyncStatus.ERROR.value
            await self.session.commit()
        except Exception:
            db_visit.sync_status = SyncStatus.ERROR.value
            await self.session.commit()
        await self.session.refresh(db_visit)
        return db_visit

    @staticmethod
    @logger()
    async def _parse_date(date_str: str) -> datetime:
        """Парсит строку даты в объект datetime."""

        if isinstance(date_str, str):
            for fmt in DATE_FORMATS_UPDATE_VISIT:
                try:
                    return datetime.strptime(date_str, fmt).replace(tzinfo=None)
                except ValueError:
                    continue

            if date_str.endswith("Z"):
                return datetime.fromisoformat(date_str.replace("Z", "+00:00")).replace(
                    tzinfo=None
                )

            if "T" not in date_str:
                return datetime.strptime(
                    f"{date_str}T00:00:00", "%Y-%m-%dT%H:%M:%S"
                ).replace(tzinfo=None)
        else:
            return date_str

        raise ValueError("Неверный формат даты.")

    @staticmethod
    @logger()
    async def _map_list_value(value, options):
        """
        Преобразует значение списка в соответствии с маппингом.
        """
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
    async def delete_visit(self, data: VisitDeleteSchema):
        """Удаляет визит по visit_id или visit_bitrix_id."""
        bitrix_update_fields = {"stageId": "DT1054_21:FAIL"}

        if data.visit_id:
            visit: Visit = await self.get_visit_admin(visit_id=data.visit_id)
            visit_bitrix_id = visit.bitrix_id
            await self.session.execute(delete(Visit).where(Visit.id == data.visit_id))

        elif data.visit_bitrix_id:
            visit_bitrix_id = data.visit_bitrix_id
            await self.session.execute(
                delete(Visit).where(Visit.bitrix_id == data.visit_bitrix_id)
            )

        else:
            raise ValueError(
                "Не передан ни один идентификатор визита: visit_id или visit_bitrix_id"
            )
        await self.session.commit()
        await self.bitrix24.update_smart_process_item(
            process_id=VISIT_ENTITY_TYPE_ID,
            item_id=visit_bitrix_id,
            fields=bitrix_update_fields,
        )
        return

    @logger()
    async def get_visit_admin(self, visit_id):
        """
        Находит визит по ID
        """
        visit = (
            (await self.session.execute(select(Visit).where(Visit.id == visit_id)))
            .scalars()
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="Visit not found")
        return visit
