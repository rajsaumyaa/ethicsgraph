# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, Integer, Boolean, DateTime
from datetime import datetime
from database import Base

class EthicsCase(Base):
    __tablename__ = "ethics_cases"
    id = Column(String, primary_key=True, index=True)
    case_title = Column(String, nullable=False)
    domain = Column(String, nullable=False)
    system_description = Column(String, nullable=False)
    incident_summary = Column(String, nullable=False)
    resolution = Column(String, nullable=False)
    precedent_status = Column(String, nullable=False)
    source = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    cognee_node_ref = Column(String, nullable=True)
    cognee_dataset_ref = Column(String, nullable=True)
    relevance_score = Column(Integer, default=0)
    is_pruned = Column(Boolean, default=False)
    pruned_reason = Column(String, nullable=True)
