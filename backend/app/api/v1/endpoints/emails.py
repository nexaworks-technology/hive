from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.llm_service import llm_service
from app.services.email_service import email_service

router = APIRouter()

class LeadInput(BaseModel):
    id: str
    name: str
    title: str
    company: str
    summary: Optional[str] = None
    talkingPoints: Optional[List[str]] = None

class GenerateDraftsRequest(BaseModel):
    leads: List[LeadInput]
    targetAudience: Optional[str] = ""
    additionalContext: Optional[str] = ""

class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str
    fromName: Optional[str] = "Nexaworks"

@router.post("/generate")
async def generate_drafts(request: GenerateDraftsRequest):
    """
    Generates email drafts using Gemini.
    """
    try:
        # Convert Pydantic models to dicts for the service
        leads_dicts = [l.model_dump() for l in request.leads]
        drafts = await llm_service.generate_drafts(
            leads_dicts, 
            request.targetAudience, 
            request.additionalContext
        )
        return {"drafts": drafts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send")
async def send_email(request: SendEmailRequest):
    """
    Sends an email via Zoho SMTP.
    """
    try:
        result = await email_service.send_email(
            to_email=request.to,
            subject=request.subject,
            body=request.body,
            from_name=request.fromName
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
