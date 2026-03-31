# SutraHR Company Insights & ICP Analysis

Comprehensive system for analyzing SutraHR's market positioning, ICP (Ideal Customer Profile), and generating personalized email outreach with precise context.

## Overview

This system provides:
- **Company Profile**: Detailed analysis of SutraHR's business, value proposition, and market positioning
- **ICP Analysis**: Clear definition of ideal target customers
- **Email Generation**: AI-friendly context for personalized outreach
- **Prospect Fit Analysis**: Score prospects against SutraHR's ICP
- **Campaign Context**: Generate outreach themes and messaging strategies

## Architecture

```
backend/
├── data/
│   └── sutraHR-profile.json          # Complete company profile
├── utils/
│   └── company-insights.js           # Core analytics engine
├── routes/
│   └── company.js                    # API endpoints
└── test-company-insights.js          # Test suite
```

## API Endpoints

### 1. Get ICP Summary
**GET** `/company/icp`

Returns structured ICP analysis for SutraHR.

```bash
curl http://localhost:4000/company/icp
```

Response:
```json
{
  "success": true,
  "company": "SutraHR",
  "icp": {
    "targetSegment": "Global, fast-growing tech startups & enterprises needing to build distributed teams from India",
    "primaryStages": ["Series A", "Series B", "Series C", "Post-Series C", "Enterprises"],
    "primaryGeographies": ["North America", "Europe", "Middle East", "APAC"],
    "keyIndustries": ["SaaS & B2B Technology", "Fintech & Neo-Banking", "Healthtech & Healthcare IT", ...],
    "painPoints": [...],
    "buyingSignals": [...],
    "decisionMakers": ["Founders / CEOs", "Head of People / HR", "VP Engineering / CTO", "VP Operations"]
  }
}
```

### 2. Generate Email Hooks
**POST** `/company/email-hooks`

Get personalized email angles based on prospect characteristics.

```bash
curl -X POST http://localhost:4000/company/email-hooks \
  -H "Content-Type: application/json" \
  -d '{
    "company": "TechScale Inc",
    "role": "VP Engineering",
    "industry": "SaaS & B2B Technology",
    "stage": "Series B",
    "size": "Mid-market",
    "technologies": ["Node.js", "React", "Data Science"]
  }'
```

Response:
```json
{
  "success": true,
  "company": "TechScale Inc",
  "hooks": [
    "SutraHR specializes in hiring for SaaS & B2B Technology companies like yours",
    "Companies your size (Mid-market) are saving 40-60% on hiring costs with our dedicated model",
    "We have a pre-vetted network for VP Engineering roles - typically fill in 2-3 weeks",
    "We've sourced multiple developers for Node.js, React stacks"
  ]
}
```

### 3. Generate Email Angle
**POST** `/company/email-angle`

Generate prospect-type-specific email framework.

```bash
curl -X POST http://localhost:4000/company/email-angle \
  -H "Content-Type: application/json" \
  -d '{
    "prospectType": "founder",
    "prospectData": {
      "currentTeam": "25",
      "targetCount": "50"
    }
  }'
```

**Prospect Types**: `founder`, `headOfPeople`, `ctoCTech`, `recruiter`, `salesperson`

Response:
```json
{
  "success": true,
  "prospectType": "founder",
  "angle": {
    "subject": "Scale your team 10x faster (no long-term contracts)",
    "angle": "As a founder, you know hiring is your bottleneck...",
    "cta": "Let's grab 15 min to discuss your hiring plan"
  }
}
```

### 4. Generate Complete Email Draft
**POST** `/company/email-draft`

Generate full email with subject, body, and context.

```bash
curl -X POST http://localhost:4000/company/email-draft \
  -H "Content-Type: application/json" \
  -d '{
    "prospectName": "Sarah",
    "companyName": "TechScale Inc",
    "role": "VP Engineering",
    "hiringNeeds": "Backend engineers",
    "prospectType": "founder",
    "industry": "SaaS",
    "stage": "Series B",
    "team": "35",
    "growthRate": "80% YoY"
  }'
```

Response:
```json
{
  "success": true,
  "emailDraft": {
    "subject": "Scale your team 10x faster (no long-term contracts)",
    "preview": "As a founder, you know hiring is your...",
    "body": "Hi Sarah,\n\nAs a founder, you know hiring is your bottleneck...",
    "cta": "Let's grab 15 min to discuss your hiring plan",
    "hooks": [...],
    "proofPoints": {...},
    "companyContext": {
      "industry": "SaaS",
      "stage": "Series B",
      "team": "35",
      "growthRate": "80% YoY"
    }
  }
}
```

### 5. Analyze Prospect Fit
**POST** `/company/analyze-fit`

Score how well a prospect matches SutraHR's ICP (0-100).

```bash
curl -X POST http://localhost:4000/company/analyze-fit \
  -H "Content-Type: application/json" \
  -d '{
    "company": "WebFlow Labs",
    "industry": "SaaS & B2B Technology",
    "stage": "Series B",
    "location": "US (San Francisco)",
    "teamSize": "Mid-market",
    "hiringPlan": "Looking to scale team 2-3x in next 12 months"
  }'
```

Response:
```json
{
  "success": true,
  "analysis": {
    "fitScore": 85,
    "recommendation": "🟢 Strong fit",
    "reasons": [
      "✅ Industry match: SaaS & B2B Technology",
      "✅ Stage fit: Series B",
      "✅ International hiring need (great SutraHR fit)",
      "✅ Team size suitable for SutraHR model",
      "✅ Active hiring phase (perfect timing)"
    ]
  }
}
```

### 6. Get Proof Points
**GET** `/company/proof-points`

Get statistics and social proof for email signatures and sales context.

```bash
curl http://localhost:4000/company/proof-points
```

Response:
```json
{
  "success": true,
  "company": "SutraHR",
  "proofPoints": {
    "clients": "10,000+ companies served",
    "positions": "5,000+",
    "closureTime": "21 days",
    "experience": "15+ years",
    "recentClients": ["Repurpose.io", "Rare Carat", "Leena.ai", "Sortly", "Volane"],
    "socialProof": [
      {
        "client": "Rare Carat (Ajay Anand, Founder)",
        "quote": "Speed and quality rarely come together, but SutraHR delivered both..."
      }
    ]
  }
}
```

### 7. Get Full Company Profile
**GET** `/company/profile`

Get complete SutraHR profile with all details.

```bash
curl http://localhost:4000/company/profile
```

### 8. Generate Campaign Context
**POST** `/company/generate-campaign-context`

Generate messaging themes and buying signals for an outreach campaign.

```bash
curl -X POST http://localhost:4000/company/generate-campaign-context \
  -H "Content-Type: application/json" \
  -d '{
    "targetRole": "CTO / VP Engineering",
    "targetIndustry": "SaaS & B2B Technology",
    "targetGeography": "US / EU",
    "campaignType": "outreach"
  }'
```

Campaign types: `outreach`, `nurture`, `partnership`

## Key Insights from SutraHR Profile

### What They Do
Global recruitment agency helping international companies hire highly skilled talent from India for remote and international teams.

### Business Model
**Dedicated Resource Model**: Companies pay once and get access to unlimited hires through a dedicated recruiter, rather than paying per hire.

### ICP (Ideal Customer Profile)

**Primary Segments:**
- Global startups (Series A-C)
- Scale-ups
- Enterprises needing global team building

**Key Characteristics:**
- Stage: Series A to Post-Series C
- Size: 10-500+ employees
- Growth: Rapidly expanding remote/international teams
- Pain Point: Need skilled talent fast, cost-effectively, without long-term contracts

**Target Industries:**
- SaaS & B2B Technology
- Fintech & Neo-Banking
- Healthtech & Healthcare IT
- E-commerce & D2C
- AI, Data Science & Engineering
- Digital Media & Marketing

**Decision Makers:**
- Founders / CEOs
- Head of People / HR
- VP Engineering / CTO
- VP Operations

### Buying Signals (When to Reach Out)
- Operating globally (US/UK/EU offices)
- Series A+ funding
- Hiring for tech roles (Backend, Data, DevOps, Frontend)
- Mentioning 'remote team' or 'distributed hiring'
- Growing 50%+ YoY
- Moving from bootstrapped to venture-backed

### Competitive Advantages
1. **Dedicated Model** - Not transactional, long-term partnership
2. **India Talent Pool** - Access to pre-vetted engineers
3. **Startup Expertise** - Deep understanding of startup hiring needs
4. **Fast Closure** - 21-day guaranteed vs. 90+ day traditional
5. **No Long-term Contracts** - Flexible, scalable model
6. **Global Footprint** - Presence in US, UK, EU, Middle East, APAC
7. **Tech & Non-Tech** - Fills engineering, product, design, sales, marketing roles

### Value Prop by Persona

**Founders:**
"Rare Carat and Leena.ai scaled from 20 to 100+ people using SutraHR's dedicated recruiter model - no per-hire fees."

**CTOs:**
"Finding quality developers is tough. SutraHR has deep expertise in SaaS/Fintech/AI and pre-vets for communication skills (critical for remote)."

**Head of People:**
"Your role is to build great teams fast. SutraHR owns the sourcing & screening, so your team focuses on interviews and culture fit."

**Recruiters/Partnerships:**
"SutraHR's network + your relationships = completed hires. They specialize in roles that are hard to find."

### Social Proof

- **10,000+ companies** worldwide (Repurpose.io, Rare Carat, Leena.ai, Sortly, Trustvid.ai, etc.)
- **5,000+ positions** closed all-time
- **15+ years** of recruitment experience
- **21-day** guaranteed closure
- **Multiple client testimonials** from founders praising speed and quality

## Integration Points

### 1. Email Generation Pipeline
Use company context to enrich the draft generation:

```javascript
import companyInsights from './utils/company-insights.js';

const emailContext = companyInsights.generateEmailDraft({
  prospectName: 'John',
  companyName: 'TechCorp',
  prospectType: 'founder',
  industry: 'SaaS'
});

// Pass to email generation API
const draft = await generateDraft(emailContext);
```

### 2. Lead Scoring
Use fit analysis to prioritize leads:

```javascript
const analysis = companyInsights.analyzeProspectFit({
  industry: 'Fintech',
  stage: 'Series B',
  location: 'US'
});

// Only pursue scores > 70
if (analysis.fitScore > 70) {
  // Add to campaign
}
```

### 3. Campaign Planning
Generate campaign themes:

```javascript
const campaign = companyInsights.generateCampaignContext({
  targetRole: 'VP Engineering',
  targetIndustry: 'SaaS',
  campaignType: 'outreach'
});

// Use messageThemes for content planning
```

## Testing

Run the test suite:

```bash
cd backend
node test-company-insights.js
```

Output shows:
- ICP summary
- Email hooks generation
- Multiple email angle examples (founder, CTO)
- Full email draft
- Proof points
- Prospect fit analysis
- Campaign context

## Example Workflows

### Workflow 1: Generate Email from LinkedIn Profile
1. Extract prospect data from LinkedIn (role, company, industry)
2. Call `/company/email-hooks` with prospect data
3. Call `/company/email-draft` with full prospect info
4. Review and send

### Workflow 2: Lead Scoring & Prioritization
1. Get prospect list with company info
2. Call `/company/analyze-fit` for each prospect
3. Sort by `fitScore`
4. Focus on 🟢 Strong fit prospects

### Workflow 3: Campaign Planning
1. Define target persona (CTO, Founder, etc.)
2. Call `/company/generate-campaign-context`
3. Use `messageThemes` to plan content calendar
4. Use `expectedICP` and `buyingSignals` to find prospects

## Performance Notes

- Company profile loads once on server startup
- All analysis is synchronous and fast
- Profile data is structured JSON (no API calls needed)
- Suitable for bulk processing (1000+ prospects)

## Future Enhancements

- [ ] LinkedIn company page scraping for dynamic profile updates
- [ ] Historical performance metrics (conversion rates by persona)
- [ ] A/B testing framework for email subjects
- [ ] Integration with CRM for lead status tracking
- [ ] Batch API for processing multiple prospects
- [ ] Web UI for campaign planning
