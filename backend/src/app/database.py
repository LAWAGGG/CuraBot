from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from . import config

DATABASE_URL = (
    f"mysql+pymysql://{config.DB_USER}:{config.DB_PASSWORD}"
    f"@{config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
