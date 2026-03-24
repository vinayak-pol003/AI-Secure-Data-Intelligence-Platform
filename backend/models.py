import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class ScanResult(Base):
    """Persisted record of a single security scan."""

    __tablename__ = "scan_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    content_type = Column(String(50), nullable=False)   # text | log | file | sql | chat
    filename = Column(String(255), nullable=True)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)      # low | medium | high | critical
    action = Column(String(50), nullable=False)
    summary = Column(Text, nullable=False)
    findings = Column(JSON, nullable=False, default=list)
    insights = Column(JSON, nullable=False, default=list)
