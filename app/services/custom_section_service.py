from typing import List

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CustomSection
from app.schemas.custom_section_schema import CustomSectionCreate
from app.utils.logger import logger


class CustomSectionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    @logger()
    async def get_all_custom_sections(self):
        """
        Get all custom sections (globally available for all companies)
        """
        sections = (
            (
                await self.session.execute(
                    select(CustomSection).order_by(CustomSection.order)
                )
            )
            .scalars()
            .all()
        )
        return {"sections": sections}

    # Создание новой секции
    @logger()
    async def create_custom_section(
        self,
        section: CustomSectionCreate,
    ):
        """
        Create a new custom section
        """
        try:
            db_section = CustomSection(
                section_id=section.section_id,
                name=section.name,
                order=section.order,
                fields=section.fields,
            )
            self.session.add(db_section)
            await self.session.commit()
            await self.session.refresh(db_section)
            return db_section
        except Exception as e:
            await self.session.rollback()
            raise HTTPException(
                status_code=500, detail=f"Error creating section: {str(e)}"
            )

    # Обновление всех секций
    @logger()
    async def update_all_custom_sections(
        self,
        sections: List[CustomSectionCreate],
        current_user=None,
    ):
        """
        Update all custom sections (replaces existing ones)
        """
        try:
            (await self.session.execute(delete(CustomSection)))
            db_sections = []
            for section in sections:
                fields_json = section.fields if section.fields else []
                db_section = CustomSection(
                    section_id=section.section_id,
                    name=section.name,
                    order=section.order,
                    fields=fields_json,
                )
                self.session.add(db_section)
                db_sections.append(db_section)
            await self.session.commit()
            for section in db_sections:
                await self.session.refresh(section)
            return {"sections": db_sections}
        except Exception as commit_error:
            await self.session.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Error committing sections: {str(commit_error)}",
            )

    @logger()
    async def delete_all_custom_sections(self):
        """
        Delete all custom sections
        """
        try:
            existing_sections = (
                (await self.session.execute(select(CustomSection))).scalars().all()
            )
            count = len(existing_sections)
            if existing_sections:
                for section in existing_sections:
                    await self.session.delete(section)
                await self.session.commit()
                return {
                    "status": "success",
                    "message": f"Successfully deleted {count} sections",
                }
            else:
                return {"status": "success", "message": "No sections to delete"}
        except Exception as e:
            await self.session.rollback()
            raise HTTPException(
                status_code=500, detail=f"Error deleting sections: {str(e)}"
            )

    @logger()
    async def get_company_sections(self):
        """
        Get custom sections for a company (backward compatibility)
        Now returns all global sections regardless of company_id
        """
        return await self.get_all_custom_sections()

    @logger()
    async def update_all_company_sections(
        self,
        sections: List[CustomSectionCreate],
    ):
        """
        Update all custom sections for a company (backward compatibility)
        Now updates global sections regardless of company_id
        """
        return await self.update_all_custom_sections(sections)
