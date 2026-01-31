from sqlalchemy import Column, String, Text, JSON, Enum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum
import uuid

class CampaignStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ICP_GENERATED = "ICP_GENERATED"
    SCRAPING = "SCRAPING"
    ENRICHING = "ENRICHING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_audience = Column(String, nullable=False)
    additional_context = Column(Text, nullable=True)
    icp_data = Column(JSON, nullable=True)
    status = Column(String, default=CampaignStatus.DRAFT)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EnrichmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    
    # Basic Info (from Scrape)
    name = Column(String, nullable=True)
    title = Column(String, nullable=True)
    company = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    
    # Contact Info (from Enrichment)
    email = Column(String, nullable=True)
    
    # Status & Metadata
    enrichment_status = Column(String, default=EnrichmentStatus.PENDING)
    enrichment_data = Column(JSON, nullable=True) # Full structured data from LLM
    
    # Relationships
    campaign = relationship("Campaign", back_populates="leads")

Campaign.leads = relationship("Lead", back_populates="campaign")
