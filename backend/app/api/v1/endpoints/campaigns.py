from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import Campaign, CampaignStatus
from app.schemas.campaign import CampaignCreate, CampaignResponse, ICPRequest
from app.services.llm_service import llm_service

router = APIRouter()

@router.post("/generate-icp", response_model=CampaignResponse)
async def generate_icp(request: ICPRequest, db: AsyncSession = Depends(get_db)):
    """
    Stage 1: The Spark
    Takes user input, generates an ICP using AI, and creates a new Campaign.
    """
    # 1. Generate ICP via LLM (Async)
    icp_data = await llm_service.generate_icp(request.target_audience, request.additional_context)
    
    # 2. Create Campaign in DB
    new_campaign = Campaign(
        target_audience=request.target_audience,
        additional_context=request.additional_context,
        icp_data=icp_data,
        status=CampaignStatus.ICP_GENERATED
    )
    
    db.add(new_campaign)
    await db.commit()
    await db.refresh(new_campaign)
    
    return new_campaign

@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign
