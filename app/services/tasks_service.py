import base64
from typing import List, Optional

import aiohttp
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import DEAL_BITRIX_ADD, TASK_BITRIX_ADD, TEMP_FOLDER_ID
from app.models import User
from app.schemas.tasks_schema import DealSchema, TaskSchema
from app.services.bitrix24 import Bitrix24Client
from app.utils.logger import logger


class TasksService:
    def __init__(self, bitrix24: Bitrix24Client, session: AsyncSession):
        self.bitrix24 = bitrix24
        self.session = session

    @logger()
    async def create_sales_task(
        self,
        current_user: User,
        data: TaskSchema,
        files: Optional[List[UploadFile]] = None,
    ):
        crm_links = [
            f"CO_{data.company_bitrix_id}",
            f"T41E_{data.visit_id}",
        ]

        task_fields = {
            "TITLE": data.title,
            "DESCRIPTION": data.description,
            "RESPONSIBLE_ID": data.responsible_id,
            "CREATED_BY": current_user.bitrix_user_id,
            "STATUS": 2,
            "PRIORITY": 1,
            "UF_CRM_TASK": crm_links,
            "UF_AUTO_585796817705": str(data.company_bitrix_id),
            "GROUP_ID": 54,
        }
        if data.visit_id:
            task_fields["UF_AUTO_107207314211"] = str(data.visit_id)

        if data.observer_ids:
            task_fields["AUDITORS"] = data.observer_ids

        if data.deadline:
            task_fields["DEADLINE"] = data.deadline

        if data.tags:
            task_fields["TAGS"] = [data.tags]

        task_data = {"fields": task_fields}

        task_response = await self.bitrix24.make_request_async(
            method=TASK_BITRIX_ADD, payload=task_data
        )

        task_id = task_response.get("result", {}).get("task", {}).get("id")
        if not task_id:
            raise Exception("Не удалось получить ID задачи после создания")

        if files:
            for file in files:
                disk_file_id = await self._upload_file_to_disk(file)
                await self._attach_file_to_task(task_id, disk_file_id)

        return task_response

    @logger()
    async def _upload_file_to_disk(self, file: UploadFile) -> int:
        content = await file.read()

        payload = {
            "id": TEMP_FOLDER_ID,
            "data": {
                "NAME": file.filename,
            },
            "generateUniqueName": True,
        }

        response = await self.bitrix24.make_request_async(
            method="disk.folder.uploadfile", payload=payload
        )

        upload_url = response.get("result", {}).get("uploadUrl")
        if not upload_url:
            raise Exception("Не удалось получить uploadUrl для загрузки файла")

        form = aiohttp.FormData()
        form.add_field(
            "file",
            content,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream",
        )

        async with aiohttp.ClientSession() as session:
            async with session.post(upload_url, data=form) as upload_response:
                upload_result = await upload_response.json()
                if upload_response.status != 200:
                    raise Exception(f"Ошибка загрузки файла: {upload_result}")

                file_id = upload_result.get("result", {}).get("ID")
                if not file_id:
                    raise Exception(
                        "Не удалось получить ID файла после загрузки по uploadUrl"
                    )

                return file_id

    @logger()
    async def _attach_file_to_task(self, task_id: int, disk_file_id: int):
        payload = {
            "taskId": task_id,
            "fileId": disk_file_id,
        }

        response = await self.bitrix24.make_request_async(
            method="tasks.task.files.attach", payload=payload
        )

        attached_file_id = response.get("result", {}).get("attachmentId")
        if not attached_file_id:
            raise Exception("Не удалось прикрепить файл к задаче")

    @logger()
    async def create_equipment_deal(self, current_user: User, data: DealSchema):
        observer_ids = [231, 287]
        if data.observer_ids:
            observer_ids.append(data.observer_ids)

        deal_data = {
            "fields": {
                "TITLE": f"Заказ оборудования: {data.title}",
                "TYPE_ID": "SALE",
                "STAGE_ID": "NEW",
                "ASSIGNED_BY_ID": current_user.id,
                "CONTACT_ID": data.client_id,
                "OPPORTUNITY": 0,
                "CURRENCY_ID": "RUB",
                "COMMENTS": f"{data.description}\n\nКонтактное лицо: {data.contact_person}",
                "UF_CRM_1234567890": observer_ids,
            }
        }

        return await self.bitrix24.make_request_async(
            method=DEAL_BITRIX_ADD, payload=deal_data
        )

    @logger()
    async def get_bitrix_manager(self, search=None):

        if search is not None:
            if not isinstance(search, str):
                raise TypeError("Параметр search должен быть строкой или None")
            search = search.strip()
            if not search:
                search = None

        filter_params = {"ACTIVE": True}

        if search:
            filter_params_last_name = {**filter_params, "%LAST_NAME": search}
            users = await self.safe_get_users(filter_params_last_name)
            if users:
                return users

            filter_params_name = {**filter_params, "%NAME": search}
            users = await self.safe_get_users(filter_params_name)
            return users
        else:
            return await self.safe_get_users(filter_params)

    @logger()
    async def safe_get_users(self, filter_params):
        try:
            return await self.bitrix24.get_users(filter_params=filter_params)
        except Exception:
            return []
