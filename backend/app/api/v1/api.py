from fastapi import APIRouter
from app.api.v1.endpoints import campaigns, emails

api_router = APIRouter()
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(emails.router, prefix="/emails", tags=["emails"])
