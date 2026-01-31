#!/bin/bash
curl -X POST http://localhost:8000/api/v1/emails/generate \
  -H "Content-Type: application/json" \
  -d '{
    "targetAudience": "B2B SaaS Founders",
    "additionalContext": "Selling AI outreach tools",
    "leads": [
        {
            "id": "lead_123",
            "name": "Sahil",
            "title": "CTO",
            "company": "NexaWorks",
            "summary": "Building AI agents",
            "talkingPoints": ["Mention recent launch", "Focus on automation"]
        }
    ]
  }'
