import json
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import aiohttp

from app.config import (
    CRM_COMPANY_UPDATE,
    CRM_CONTACT_LIST,
    CRM_CONTACT_UPDATE,
    GET_COMPANIES_PAYLOAD,
)
from app.config import Settings as settings  # noqa
from app.utils.logger import logger


class Bitrix24Client:
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url
        parsed_url = urlparse(webhook_url)
        self.host = parsed_url.netloc

    @logger()
    async def make_request_async(
        self, method: str, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make an asynchronous request to Bitrix24 API using aiohttp."""
        url = f"{self.webhook_url}{method}"
        try:
            timeout = aiohttp.ClientTimeout(total=30)
            ssl_context = False
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, json=payload, ssl=ssl_context) as response:
                    text = await response.text()
                    try:
                        data = json.loads(text)
                        if response.status >= 400:
                            return {"result": []}
                        return data
                    except json.JSONDecodeError:
                        return {"result": []}
        except aiohttp.ClientError:
            return {"result": []}

    @logger()
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get Bitrix24 user by email."""
        payload = {
            "select": [
                "ID",
                "EMAIL",
                "NAME",
                "LAST_NAME",
                "SECOND_NAME",
                "ACTIVE",
                "WORK_POSITION",
            ],
            "filter": {"EMAIL": email},
        }

        response = await self.make_request_async("user.get", payload)

        users = response.get("result", [])

        if users:
            return users[0]
        else:
            return None

    @logger()
    async def get_users(
        self,
        filter_params: Optional[Dict] = None,
        select_fields: Optional[List[str]] = None,
    ) -> List[Dict]:
        """
        Получение списка пользователей из Bitrix24 с возможностью фильтрации

        :param filter_params: Параметры фильтрации (например, {"ACTIVE": True})
        :param select_fields: Список полей для выборки
        :return: Список пользователей
        """
        default_select = [
            "ID",
            "NAME",
            "LAST_NAME",
            "SECOND_NAME",
            "EMAIL",
            "ACTIVE",
            "WORK_POSITION",
            "UF_DEPARTMENT",
        ]

        payload = {"select": select_fields or default_select}

        if filter_params:
            payload["filter"] = filter_params
        else:
            # По умолчанию получаем только активных пользователей
            payload["filter"] = {"ACTIVE": True}

        response = await self.make_request_async("user.get", payload)
        return response.get("result", [])

    @logger()
    async def get_smart_process_items(
        self, process_id: int, filter_params: Optional[Dict] = None
    ) -> List[Dict]:
        """Get items from a Smart Process."""
        payload = {"entityTypeId": process_id}
        if filter_params:
            payload["filter"] = filter_params

        response = await self.make_request_async("crm.item.list", payload)
        return response.get("result", {}).get("items", [])

    @logger()
    async def get_smart_process_item(
        self, process_id: int, item_id: int
    ) -> Optional[Dict]:
        """Get a specific Smart Process item by ID."""
        payload = {"entityTypeId": process_id, "id": item_id}

        response = await self.make_request_async("crm.item.get", payload)
        if response and "result" in response:
            return response.get("result", {})
        return None

    @logger()
    async def create_smart_process_item(
        self, process_id: int, fields: Dict
    ) -> Optional[Dict]:
        """Create a new Smart Process item."""
        processed_fields = {}
        for key, value in fields.items():
            processed_fields[key] = value

        payload = {"entityTypeId": process_id, "fields": processed_fields}
        response = await self.make_request_async("crm.item.add", payload)

        if response and "result" in response:
            return response.get("result", {})
        return None

    @logger()
    async def update_smart_process_item(
        self, process_id: int, item_id: int, fields: Dict
    ) -> Optional[Dict]:
        """Update an existing Smart Process item."""
        processed_fields = {}
        for key, value in fields.items():  # TODO Почему так ?
            # if key.upper() == "TITLE":
            #     continue
            processed_fields[key] = value

        payload = {
            "entityTypeId": process_id,
            "id": item_id,
            "fields": processed_fields,
        }
        response = await self.make_request_async("crm.item.update", payload)

        if response and "result" in response:
            return response.get("result", {})
        return None

    @logger()
    async def get_company(self, company_id: int) -> Optional[Dict]:
        """Get company by ID with all fields, including dynamic fields."""
        payload = {"ID": company_id}
        response = await self.make_request_async("crm.company.get", payload)
        dynamic_fields = {}

        if response.get("result"):
            result = response.get("result", {})
            for field_name, value in result.items():
                if field_name.startswith("UF_"):
                    app_field_name = field_name[3:].lower()
                    dynamic_fields[app_field_name] = value

            result["dynamic_fields"] = dynamic_fields
            return result
        return response.get("result", {})

    @logger()
    async def get_company_fields(self) -> Dict:
        """Get all available company fields, including dynamic fields."""
        response = await self.make_request_async("crm.company.fields", {})
        return response.get("result", {})

    @logger()
    async def create_company(self, fields: Dict) -> Optional[int]:
        """Create a new company."""
        payload = {"fields": fields}

        response = await self.make_request_async("crm.company.add", payload)

        # Обрабатываем разные форматы ответа
        if isinstance(response, int):
            # Ответ уже является целым числом (ID компании)
            return response
        elif isinstance(response, dict):
            # Ответ в виде словаря, ищем result
            if "result" in response:
                # Может быть целым числом или словарем
                result = response["result"]
                if isinstance(result, int):
                    return result
                elif isinstance(result, dict):
                    # Если в словаре есть ID, вернем его
                    return result.get("ID") if "ID" in result else None
        return None

    @logger()
    async def update_company(
        self, company_id: int, fields: Dict, dynamic_fields: Optional[Dict] = None
    ) -> bool:
        """Update an existing company with support for dynamic fields."""
        return await self.update_obj(
            obj_id=company_id,
            fields=fields,
            dynamic_fields=dynamic_fields,
            target_method=CRM_COMPANY_UPDATE,
        )

    @logger()
    async def update_contact(
        self, contact_id: int, fields: Dict, dynamic_fields: Optional[Dict] = None
    ) -> bool:
        """Update an existing contact with support for dynamic fields."""
        return await self.update_obj(
            obj_id=contact_id,
            fields=fields,
            dynamic_fields=dynamic_fields,
            target_method=CRM_CONTACT_UPDATE,
        )

    @logger()
    async def update_obj(self, obj_id, fields, dynamic_fields, target_method):
        bitrix_fields = dict(fields)

        # Специальная обработка для полей EMAIL и PHONE
        # Эти поля должны быть переданы как есть, без префикса UF_
        for field_name in ["EMAIL", "PHONE"]:
            if field_name in bitrix_fields and isinstance(
                bitrix_fields[field_name], list
            ):
                for item in bitrix_fields[field_name]:
                    if isinstance(item, dict) and "VALUE" in item:
                        if "TYPE_ID" not in item:
                            item["TYPE_ID"] = field_name
                        if "VALUE_TYPE" not in item:
                            item["VALUE_TYPE"] = "WORK"
        if dynamic_fields:
            for field_name, value in dynamic_fields.items():
                if field_name.startswith("UF_CRM_"):
                    bitrix_field_name = field_name.upper()
                else:
                    bitrix_field_name = f"UF_CRM_{field_name.upper()}"
                bitrix_fields[bitrix_field_name] = value

        payload = {
            "id": obj_id,
            "fields": bitrix_fields,
            "params": {"REGISTER_SONET_EVENT": "Y"},
        }
        response = await self.make_request_async(method=target_method, payload=payload)

        if response and "result" in response and response["result"]:
            return True
        else:
            return False

    @logger()
    async def simple_update_obj(self, obj_id, target_method, bitrix_fields: Dict):
        payload = {
            "id": obj_id,
            "fields": bitrix_fields,
            "params": {"REGISTER_SONET_EVENT": "Y"},
        }
        return await self.make_request_async(method=target_method, payload=payload)

    @logger()
    async def create_contact(self, fields: Dict) -> Optional[Dict]:
        """Create a new contact (doctor or LPR)."""

        if "TYPE_ID" not in fields:
            fields["TYPE_ID"] = "OTHER"  # This needs to be created in Bitrix24
        payload = {"fields": fields}
        response = await self.make_request_async("crm.contact.add", payload)
        return response.get("result", {})

    @logger()
    async def delete_contact(self, doctor_bitrix_id: int) -> Optional[Dict]:
        """Delete contact by bitrix id"""
        payload = {"ID": doctor_bitrix_id}
        response = await self.make_request_async("crm.contact.delete", payload)
        return response.get("result", {})

    @logger()
    async def get_contact(self, contact_id: int) -> Optional[Dict]:
        """Get contact by ID with all fields, including dynamic fields."""
        payload = {"ID": contact_id}
        response = await self.make_request_async("crm.contact.get", payload)
        dynamic_fields = {}

        if response.get("result"):
            result = response.get("result", {})
            for field_name, value in result.items():
                if field_name.startswith("UF_"):
                    app_field_name = field_name[3:].lower()
                    dynamic_fields[app_field_name] = value
            result["dynamic_fields"] = dynamic_fields
            return result
        return response.get("result", {})

    @logger()
    async def get_contact_fields(self) -> Dict:
        """Get all available contact fields, including dynamic fields."""
        response = await self.make_request_async("crm.contact.fields", {})
        return response.get("result", {})

    @logger()
    async def search_contacts_by_name(self, search_term: str) -> List[Dict]:
        """Search contacts by name or other criteria."""
        payload = {
            "select": ["ID", "NAME", "LAST_NAME", "EMAIL", "PHONE", "TYPE_ID"],
            "filter": {"%NAME": search_term},  # Using % for partial match
        }

        response = await self.make_request_async(CRM_CONTACT_LIST, payload)

        result = response.get("result", [])

        return result

    @logger()
    async def get_contacts(self) -> List[Dict]:
        """Get all contacts."""
        payload = {"select": ["ID", "NAME", "LAST_NAME", "EMAIL", "PHONE", "TYPE_ID"]}
        response = await self.make_request_async(CRM_CONTACT_LIST, payload)

        if not response or "result" not in response:
            return []

        contacts = response.get("result", [])
        return contacts

    @logger()
    async def get_doctors(self, company_id: int) -> List[Dict]:
        """Get all contacts."""
        payload = {"filter": {"COMPANY_ID": company_id}}
        response = await self.make_request_async(CRM_CONTACT_LIST, payload)
        return response.get("result", [])

    @logger()
    async def get_companies(self) -> List[Dict]:
        """Get all companies."""

        response = await self.make_request_async(
            "crm.company.list", GET_COMPANIES_PAYLOAD
        )

        if not response or "result" not in response:
            return []

        companies = response.get("result", [])
        return companies


async def get_bitrix_client() -> Bitrix24Client:
    return Bitrix24Client(settings.BITRIX24_WEBHOOK_URL)
