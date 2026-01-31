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
    return campaign

@router.post("/{campaign_id}/start-scraping", response_model=dict)
async def start_scraping(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """
    Stage 2: The Brain
    Triggers the async scraping task for a given campaign.
    """
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Trigger Celery Task
    from app.worker import scrape_leads_task
    scrape_leads_task.delay(str(campaign.id))
    
    return {"message": "Scraping started", "campaign_id": str(campaign.id)}

@router.get("/{campaign_id}/leads")
async def get_campaign_leads(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """
    Poll this to see the leads appearing in real-time.
    """
    # Verify campaign exists
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Fetch leads (This should be paginated in real app)
    # Note: explicit import to avoid circular dependency issues if not already handled
    from app.db.models import Lead 
    from sqlalchemy import select
    
    result = await db.execute(select(Lead).where(Lead.campaign_id == campaign_id))
    leads = result.scalars().all()
    
    return leads
@router.post("/{campaign_id}/generate-drafts")
async def generate_campaign_drafts(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """
    Stage 4: The Spear
    Generates personalized drafts for all leads in a campaign and saves them to the DB.
    """
    from app.db.models import Lead, Campaign
    from sqlalchemy import select
    
    # 1. Get campaign and leads
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    result = await db.execute(select(Lead).where(Lead.campaign_id == campaign_id))
    leads = result.scalars().all()
    
    if not leads:
        return {"message": "No leads found to draft emails for", "drafts": []}

    # 2. Call LLM Service
    leads_data = [
        {
            "id": str(l.id),
            "name": l.name,
            "title": l.title,
            "company": l.company,
            "summary": l.enrichment_data.get("summary") if l.enrichment_data else None,
            "talkingPoints": l.enrichment_data.get("talkingPoints") if l.enrichment_data else []
        }
        for l in leads
    ]

    drafts = await llm_service.generate_drafts(
        leads=leads_data,
        target_audience=campaign.target_audience,
        additional_context=campaign.additional_context
    )

    # 3. Persist variants to Leads
    for draft_entry in drafts:
        lead_id = draft_entry.get("id")
        variants = draft_entry.get("variants", [])
        
        for lead in leads:
            if str(lead.id) == lead_id:
                if lead.enrichment_data is None:
                    lead.enrichment_data = {}
                
                new_data = dict(lead.enrichment_data)
                # Store all variants
                new_data["variants"] = variants
                # Default to 'Sniper' for backward compatibility or initial view
                if variants:
                    new_data["draftEmail"] = {
                        "subject": variants[0].get("subject"),
                        "body": variants[0].get("body"),
                        "type": variants[0].get("type")
                    }
                lead.enrichment_data = new_data
                db.add(lead)

    await db.commit()
    return {"message": f"Generated drafts for {len(drafts)} leads", "drafts": drafts}
