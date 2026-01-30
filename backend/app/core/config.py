from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Converge AI"
    PROJECT_VERSION: str = "0.1.0"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/app"
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"

    class Config:
        case_sensitive = True

settings = Settings()
