from sqlalchemy import BigInteger, Column, Date, DateTime, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class OutboxEventModel(Base):
    __tablename__ = "outbox_events"

    id = Column(String(26), primary_key=True)
    aggregate_id = Column(String(26), nullable=False)
    event_type = Column(String(100), nullable=False)
    payload = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="PENDING")
    retry_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    error = Column(Text, nullable=True)


class ProcessedEventModel(Base):
    __tablename__ = "processed_events"

    event_id = Column(String(64), primary_key=True)
    consumer_name = Column(String(100), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=False)


class RiskEvaluationModel(Base):
    __tablename__ = "risk_evaluations"

    id = Column(String(26), primary_key=True)
    payment_id = Column(String(64), nullable=False)
    source_account_id = Column(String(64), nullable=False, index=True)
    amount_cents = Column(BigInteger, nullable=False)
    outcome = Column(String(20), nullable=False)
    evaluation_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
