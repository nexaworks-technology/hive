from fastapi import FastAPI
from app.core.config import settings
from app.api.v1.api import api_router

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title=settings.PROJECT_NAME, version=settings.PROJECT_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to Converge AI API"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}
