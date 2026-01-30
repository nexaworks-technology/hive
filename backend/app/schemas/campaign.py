from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime

class CampaignBase(BaseModel):
    target_audience: str
    additional_context: Optional[str] = None

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(CampaignBase):
    icp_data: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

class CampaignResponse(CampaignBase):
    id: Any
    status: str
    icp_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ICPRequest(BaseModel):
    target_audience: str
    additional_context: Optional[str] = None
