from pydantic import BaseModel, Field
from typing import Optional


class CommonFilters(BaseModel):
    """
    Filtres transversaux : utilisés par CA et Sessions.
    NestJS envoie ça, le ML Service traduit en WHERE SQL.
    """
    date_from: Optional[str] = Field(None, example="2024-01-01")
    date_to: Optional[str] = Field(None, example="2024-12-31")
    formation_id: Optional[int] = Field(None, example=5)
    formateur_id: Optional[int] = Field(None, example=12)
    session_type: Optional[str] = Field(None, example="présentiel")