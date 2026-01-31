# Project Hydra Architecture

## Overview
Project Hydra is an autonomous, multi-headed agentic system designed to act as a 24/7 Business Development Representative (BDR). It utilizes a state-based graph architecture (LangGraph) to perform recursive discovery, verification, and enrichment of leads.

## Agent Structure (The "Heads")

The system is composed of several specialized agents (nodes):

### 1. The Orchestrator (Manager)
- **Role**: The brain of the operation.
- **Responsibility**: Receives high-level inputs (e.g., "Find SaaS companies in Fintech") and breaks them down into sub-tasks. It manages the state and decides which tool/agent to call next.

### 2. The Scout (Search Tool)
- **Role**: The eyes.
- **Responsibility**: Uses search APIs to find company domains and LinkedIn URLs.
- **Tools**:
    - **Waterfall Search**: DuckDuckGo -> Brave (optional) -> Google Custom Search.

### 3. The Verifier (Secondary Check)
- **Role**: The detective.
- **Responsibility**: Verifies found entities against secondary sources.
- **Checks**:
    - "Hiring Signals" (Careers page, job postings).
    - Tech stack verification (GitHub, etc.).

### 4. The Profiler (Enrichment)
- **Role**: The analyst.
- **Responsibility**: Scrapes specific "About" and "Activity" sections to build a psychographic profile.
- **Tools**: Tavily API for "reading" page content and extracting pain points/wins.

## Data Flow (Edges)

1. **Input**: "Target Company/Industry"
2. **Orchestrator** -> **Scout**: "Find website and LinkedIn for [Company]"
3. **Scout** -> **Orchestrator**: Returns `{ domain: "...", linkedin: "..." }`
4. **Orchestrator** -> **Verifier**: "Check [Domain] for hiring signals"
5. **Verifier** -> **Orchestrator**: Returns `{ is_hiring: true, roles: [...] }`
6. **Orchestrator** -> **Profiler**: "Analyze [Domain] for key value props"
7. **Profiler** -> **Orchestrator**: Returns `{ pain_points: [...], icebreaker: "..." }`
8. **Output**:  Structured "Golden Record" JSON.

## Core Pillars

- **Pillar 1: Multi-Dimensional Search**: Robust waterfall logic to maximize free tier usage.
- **Pillar 2: Intent Verification**: Detecting active hiring or growth signals.
- **Pillar 3: The Humanizer**: Contextual embeddings for personalized outreach.
- **Pillar 4: Zero-Block Infrastructure**: (Future) Playwright with stealth settings.
