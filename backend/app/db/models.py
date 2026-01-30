import uuid
from sqlalchemy import Column, String, Text, JSON, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base
import enum

class CampaignStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ICP_GENERATED = "ICP_GENERATED"
    SCRAPING = "SCRAPING"
    ENRICHING = "ENRICHING"
    COMPLETED = "COMPLETED"

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_audience = Column(String, nullable=False)
    additional_context = Column(Text, nullable=True)
    icp_data = Column(JSON, nullable=True)
    status = Column(String, default=CampaignStatus.DRAFT)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
