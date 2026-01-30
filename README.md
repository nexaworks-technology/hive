# Converge AI

Converge AI is a high-fidelity B2B outreach SaaS platform designed to streamline lead generation and personalized outreach through a 5-stage pipeline.

![Converge AI](https://placehold.co/1200x600/2563eb/white?text=Converge+AI+Platform)

## 🚀 Features

The platform operates on a sophisticated 5-stage pipeline:

1.  **The Spark**: AI-driven Ideal Customer Profile (ICP) generation and market intelligence.
2.  **The Brain**: Automated lead discovery and scraping based on your ICP.
3.  **The Fuel**: Deep data enrichment to gather contact details and company insights.
4.  **The Spear**: Hyper-personalized email drafting using LLMs tailored to each prospect.
5.  **The Closing**: Campaign management and analytics.

## 🛠 Tech Stack

### Frontend
-   **Framework**: Next.js 14+ (App Router)
-   **Styling**: Tailwind CSS + Shadcn UI
-   **State Management**: React Context + Hooks
-   **Language**: TypeScript

### Backend (Recommended)
-   **API Framework**: FastAPI (Python 3.11+)
-   **Database**: PostgreSQL
-   **Task Queue**: Celery + Redis
-   **Scraping**: Playwright + BeautifulSoup4
-   **AI**: OpenAI / Anthropic Integration via LangChain

## 📂 Project Structure

```bash
├── frontend/          # Next.js frontend application
│   ├── app/           # App router pages and layouts
│   ├── components/    # Reusable UI components
│   └── lib/           # Utility functions and contexts
│
└── backend/           # FastAPI backend application
    ├── app/           # API source code
    │   ├── api/       # Route handlers
    │   ├── core/      # Config and settings
    │   └── db/        # Database models and sessions
    └── simple_worker/ # Celery worker configuration
```

## ⚡️ Getting Started

### Prerequisites
-   Node.js 18+
-   Python 3.11+
-   Docker & Docker Compose

### 1. Backend Setup

The backend handles the heavy lifting: AI generation, scraping, and data storage.

```bash
cd backend

# Create environment file
cp .env.example .env

# Start services (API + DB + Redis + Worker)
docker-compose up --build
```
*The API will be available at http://localhost:8000*

### 2. Frontend Setup

The frontend provides the interactive dashboard.

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```
*The Frontend will be available at http://localhost:3000*

## 🤝 Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
