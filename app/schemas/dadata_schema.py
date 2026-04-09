from pydantic import BaseModel


class DadataSchema(BaseModel):
    query: str


class DistanceCheckSchema(BaseModel):
    company_id: int
    userLatitude: float
    userLongitude: float
