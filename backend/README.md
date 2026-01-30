# Converge AI Backend

## Stack
- **FastAPI**: API Framework
- **PostgreSQL**: Database
- **Celery + Redis**: Async Task Queue
- **Docker Compose**: Orchestration

## Quick Start

1. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Access the API documentation:
   - Swagger UI: http://localhost:8000/docs
