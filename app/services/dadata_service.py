import math

from dadata import DadataAsync
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status
from starlette.responses import JSONResponse

from app.config import DADATA_MAPPING, DADATA_NAME, Settings
from app.models import ClinicAddress
from app.schemas.dadata_schema import DadataSchema, DistanceCheckSchema
from app.utils.logger import logger


class DaDataService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    @logger()
    async def get_dadata(data: DadataSchema):
        dadata = DadataAsync(token=Settings.TOKEN_DADATA, secret=Settings.SECRET_DADATA)
        return await dadata.suggest(name=DADATA_NAME, query=data.query)

    @staticmethod
    @logger()
    async def check_exist_address(data: DadataSchema):
        try:
            dadata = DadataAsync(
                token=Settings.TOKEN_DADATA, secret=Settings.SECRET_DADATA
            )
            # Используем suggest API вместо clean API для избежания ошибки 403
            suggestions = await dadata.suggest(name=DADATA_NAME, query=data.query)

            if not suggestions:
                return JSONResponse(
                    status_code=status.HTTP_404_NOT_FOUND,
                    content={"status": "ERROR", "message": "Адрес не найден"},
                )

            # Проверяем качество первого предложения
            first_suggestion = suggestions[0]
            data_info = first_suggestion.get("data", {})

            # Если есть координаты, значит адрес валидный
            if data_info.get("geo_lat") and data_info.get("geo_lon"):
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={
                        "status": "OK",
                        "message": "Адрес найден и валиден",
                        "data": first_suggestion,
                    },
                )
            else:
                return JSONResponse(
                    status_code=status.HTTP_404_NOT_FOUND,
                    content={
                        "status": "ERROR",
                        "message": "Адрес неполный или некорректный",
                    },
                )

        except Exception as e:
            logger().error(f"Ошибка при проверке адреса: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "status": "ERROR",
                    "message": "Ошибка сервера при проверке адреса",
                },
            )

    @logger()
    async def check_distance(self, data: DistanceCheckSchema):
        results = (
            (
                await self.session.execute(
                    select(ClinicAddress).where(
                        ClinicAddress.company_id == data.company_id
                    )
                )
            )
            .scalars()
            .all()
        )
        for company_address in results:
            result = await self.calculate_distance(
                user_latitude=data.userLatitude,
                user_longitude=data.userLongitude,
                company_latitude=float(company_address.latitude),
                company_longitude=float(company_address.longitude),
            )
            if result:
                return company_address
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"content": "Нет подходящих адресов по близости"},
            )

    @staticmethod
    @logger()
    async def calculate_distance(
        user_latitude: float,
        user_longitude: float,
        company_latitude: float,
        company_longitude: float,
    ) -> float:
        Earth_R = 6371

        distance_latitude = math.radians(company_latitude - user_latitude)
        distance_longitude = math.radians(company_longitude - user_longitude)
        a = (
            math.sin(distance_latitude / 2) ** 2
            + math.cos(math.radians(user_latitude))
            * math.cos(math.radians(company_latitude))
            * math.sin(distance_longitude / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance_km = Earth_R * c

        user_distance = distance_km * 1000

        if 0 <= user_distance <= 100:
            return True
        return False
