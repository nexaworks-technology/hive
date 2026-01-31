import asyncio
import json
import logging
from celery import Celery
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.db.models import Campaign, Lead, EnrichmentStatus, CampaignStatus
from sqlalchemy.future import select

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

celery = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

from playwright.async_api import async_playwright

async def _run_discovery(campaign_id: str):
    """
    Project Hydra: Multi-source discovery via DiscoveryService.
    """
    from app.services.discovery_service import discovery_service
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        campaign = result.scalars().first()
        
        if not campaign:
            return "Campaign not found"

        campaign.status = CampaignStatus.SCRAPING
        await db.commit()

        # Run Hydra Engine
        leads_data = await discovery_service.discover_leads(campaign.target_audience, campaign.icp_data)
        
        created_leads = []
        for l_data in leads_data:
            lead = Lead(
                campaign_id=campaign.id,
                name=l_data.get("name"),
                title=l_data.get("title"),
                company=l_data.get("company"),
                linkedin_url=l_data.get("linkedin"),
                enrichment_status=EnrichmentStatus.PENDING,
                enrichment_data={
                    "source": "Project Hydra (Discovery)",
                    "confidence": l_data.get("confidence"),
                    "conversation_starter": l_data.get("starter")
                }
            )
            db.add(lead)
            created_leads.append(lead)
        
        await db.commit()

        if created_leads:
            campaign.status = CampaignStatus.ENRICHING
            await db.commit()
            await _enrich_leads(campaign.id, created_leads)
        else:
            campaign.status = CampaignStatus.COMPLETED
            await db.commit()
            
        return f"Hydra discovered {len(created_leads)} leads for campaign {campaign_id}"

async def _enrich_leads(campaign_id: str, leads: list):
    """
    Second phase: Use LLM to refine details and 'find' emails based on context.
    In a real app, this would use an email finder API like Apollo/Lusha,
    but for this project we'll have the LLM estimate/extract emails from titles/links
    or provide realistic placeholder emails for demo.
    """
    from app.services.llm_service import llm_service
    
    async with AsyncSessionLocal() as db:
        # Fetch campaign to get ICP data
        res_campaign = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        campaign = res_campaign.scalars().first()
        if not campaign:
            logger.error(f"Campaign {campaign_id} not found during enrichment.")
            return

        for lead in leads:
            # Re-fetch lead to ensure it's in the session
            result = await db.execute(select(Lead).where(Lead.id == lead.id))
            lead_obj = result.scalars().first()
            if not lead_obj:
                continue

            # High-Fidelity Enrichment
            prompt = f"""
            You are a Revenue Operations Specialist. Validate and enrich this lead.
            
            Lead Found:
            Name: {lead_obj.name}
            Title: {lead_obj.title}
            Company: {lead_obj.company}
            Context: {lead_obj.enrichment_data.get('conversation_starter')}
            
            Target ICP:
            {campaign.icp_data}

            Your Task:
            1. Generate a professional business email.
            2. Research/Infer 3 specific 'Talking Points' for outreach.
            3. Provide 'Reasoning' for why this lead matches the ICP.
            4. Summarize their professional focus.

            Return JSON:
            {{"email": "...", "talkingPoints": ["...", "...", "..."], "reasoning": "...", "summary": "..."}}
            """
            
            try:
                enrichment_res = await llm_service._call_groq([{"role": "user", "content": prompt}], response_format={"type": "json_object"})
                
                if enrichment_res:
                    content = json.loads(enrichment_res["choices"][0]["message"]["content"])
                    lead_obj.email = content.get("email")
                    
                    # Merge new enrichment data with discovery data
                    new_data = dict(lead_obj.enrichment_data)
                    new_data.update({
                        "talkingPoints": content.get("talkingPoints"),
                        "reasoning": content.get("reasoning"),
                        "summary": content.get("summary")
                    })
                    lead_obj.enrichment_data = new_data
            except Exception as e:
                logger.error(f"Enrichment failed for lead {lead.id}: {e}")
                # Fallback
                clean_name = lead_obj.name.replace(" ", "").lower()
                lead_obj.email = f"{clean_name}@business.com"
            
            lead_obj.enrichment_status = EnrichmentStatus.COMPLETED
            db.add(lead_obj)
        
        # Mark campaign as completed
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        campaign = result.scalars().first()
        if campaign:
            campaign.status = CampaignStatus.COMPLETED
        
        await db.commit()

@celery.task
def scrape_leads_task(campaign_id: str):
    # Run async code in sync Celery task
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(_run_discovery(campaign_id))
