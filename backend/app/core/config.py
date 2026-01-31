from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Converge AI"
    PROJECT_VERSION: str = "0.1.0"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/app"
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"
    PROXY_URL: str | None = None
    GEMINI_API_KEY: str | None = None
    GROQ_API_KEY: str | None = None
    
    # SMTP Settings
    ZOHO_SMTP_HOST: str = "smtp.zoho.in"
    ZOHO_SMTP_PORT: int = 465
    ZOHO_SMTP_USER: str | None = None
    ZOHO_SMTP_PASS: str | None = None
    ZOHO_FROM: str | None = None

    class Config:
        case_sensitive = True

settings = Settings()
