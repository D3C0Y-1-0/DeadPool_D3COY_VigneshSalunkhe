import os
from sqlalchemy import create_engine, Column, String, Integer, Boolean, JSON, Text
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///mirage.db")

# SQLite doesn't support pool_pre_ping in the same way or requires check_same_thread=False
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

class EventRow(Base):
    __tablename__ = "events"
    id = Column(String, primary_key=True)
    ts = Column(String, index=True)
    source = Column(String)
    zone = Column(String, index=True)
    src_ip = Column(String, index=True)
    session_id = Column(String, index=True, nullable=True)
    action = Column(String)
    outcome = Column(String)
    data = Column(JSON)                      # full NormalizedEvent dict

class IncidentRow(Base):
    __tablename__ = "incidents"
    id = Column(String, primary_key=True)    # "INC-" + src_ip
    src_ip = Column(String, index=True)
    first_seen = Column(String)
    last_seen = Column(String)
    score = Column(Integer)
    severity = Column(String)
    verdict = Column(String)
    stage = Column(String)
    status = Column(String, default="open")   # open|contained|closed
    real_asset_touched = Column(Boolean, default=False)
    honeytoken_hit = Column(Boolean, default=False)
    body = Column(JSON)                      # full evaluated incident dict

class ActionRow(Base):
    __tablename__ = "actions"
    id = Column(String, primary_key=True)
    incident_id = Column(String, index=True)
    type = Column(String)
    params = Column(JSON)
    status = Column(String, default="recommended")   # recommended|approved|executed|dry_run
    result = Column(Text, nullable=True)

def init_db():
    Base.metadata.create_all(engine)

init_db()
