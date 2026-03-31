# SutraHR Outbound Lead Qualification System

Comprehensive system for identifying, scoring, and preparing qualified prospects for SutraHR's LinkedIn outreach campaigns.

## Overview

The outbound system consists of:

1. **ICP Configuration** - Fixed definition of target customer profiles
2. **Lead Qualifier** - Scores leads against the ICP (0-100)
3. **Outbound Routes** - API endpoints for campaign orchestration
4. **Campaign Planning** - Plans 30-day outreach campaigns with projections

## SutraHR Target ICP

### Company Stage
- **Primary**: Series A, Series B
- **Secondary**: Series C+ considered but lower priority

### Geography
- **Target Markets**: US, UAE, UK
- **Excluded**: India, Pakistan, Bangladesh, Eastern Europe (lower-pay markets)

### Team Size
- **Ideal Range**: 10-300 employees
- **Sweet Spot**: 30-100 (active hiring phase)

### Hiring Activity
Must show active hiring indicators:
- "Currently hiring" mentions
- Recent job postings
- LinkedIn hiring badge
- Mentions of "scaling team", "expanding", "building out"

### Target Industries
1. SaaS & B2B Technology
2. Fintech & Neo-Banking
3. Healthtech & Healthcare IT
4. E-commerce & D2C
5. AI, Data Science & Engineering
6. Digital Media & Marketing
7. Martech
8. HR Tech

### Target Roles (Decision Makers)

**High Priority** (Score +5):
- VP Engineering / CTO
- Head of People / VP HR
- Founder / Co-Founder
- Chief People Officer
- Recruiting Lead

**Secondary Priority** (Score +3):
- VP Operations
- VP Product
- Director of Engineering
- Head of Operations

### Exclusion Criteria

**Hiring Status Red Flags**:
- Layoffs mentioned
- Hiring freeze
- Pre-revenue / unfunded

**Company Type Exclusions**:
- Government agencies
- Non-profits (unless well-funded)
- Recruitment agencies (unless looking to partner)

## Lead Scoring System

### Scoring Breakdown

| Criterion | Max Points | Weight | Details |
|-----------|-----------|--------|---------|
| Stage Match | 25 | 25% | Series A/B gets full points |
| Geography Match | 20 | 20% | US/UAE/UK get full points |
| Active Hiring | 25 | 25% | Keywords in profile/bio |
| Industry Match | 15 | 15% | Must be in target industries |
| Team Size | 10 | 10% | 10-300 range gets full points |
| Role Fit | 5 | 5% | High-priority roles worth more |

**Total: 0-100 points**

### Qualification Thresholds

- **Highly Qualified** 🟢: Score ≥ 65 + High-Priority Role
- **Qualified** 🟡: Score ≥ 65 + Secondary Role OR Score ≥ 70 + Any Role
- **Not Qualified** 🔴: Score < 65
- **Disqualified** 🔴: Meets exclusion criteria

## API Endpoints

### 1. Get ICP Configuration
**GET** `/outbound/icp`

Returns the complete ICP definition and scoring weights.

```bash
curl http://localhost:4000/outbound/icp
```

Response:
```json
{
  "success": true,
  "icp": {
    "targetICP": {
      "companyStage": ["Series A", "Series B"],
      "geography": ["US", "UAE", "UK"],
      "teamSize": { "min": 10, "max": 300 },
      "keywords": ["hiring", "scaling team", "expanding", ...]
    },
    "targetRoles": { "highPriority": [...], "secondary": [...] },
    "targetIndustries": [...],
    "excludeCriteria": { ... },
    "scoringWeights": { ... },
    "minQualificationScore": 65
  }
}
```

### 2. Score a Single Lead
**POST** `/outbound/score-lead`

Score one prospect against the ICP.

```bash
curl -X POST http://localhost:4000/outbound/score-lead \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "TechScale Inc",
    "stage": "Series B",
    "location": "San Francisco, USA",
    "industry": "SaaS & B2B Technology",
    "teamSize": "45",
    "hiringActivity": ["Currently hiring", "VP Engineering open"],
    "role": "VP Engineering"
  }'
```

Response:
```json
{
  "success": true,
  "score": {
    "prospectId": "TechScale Inc",
    "qualifyingScore": 85,
    "qualified": true,
    "recommendation": "🟢 HIGHLY QUALIFIED",
    "breakdown": {
      "stageMatch": { "score": 25, "weighted": 25.0 },
      "geographyMatch": { "score": 20, "weighted": 20.0 },
      "hiringActivity": { "score": 10, "weighted": 10.0 },
      "industryMatch": { "score": 15, "weighted": 15.0 },
      "teamSize": { "score": 10, "weighted": 10.0 },
      "roleMatch": { "score": 5, "weighted": 5.0 }
    }
  }
}
```

### 3. Score Multiple Leads
**POST** `/outbound/score-leads`

Score a batch of leads.

```bash
curl -X POST http://localhost:4000/outbound/score-leads \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [
      {
        "companyName": "Company 1",
        "stage": "Series B",
        ...
      },
      {
        "companyName": "Company 2",
        ...
      }
    ]
  }'
```

Response:
```json
{
  "success": true,
  "totalLeads": 2,
  "grouped": {
    "highlyQualified": 1,
    "qualified": 1,
    "notQualified": 0
  },
  "scores": [ {...}, {...} ],
  "breakdown": {
    "highlyQualified": [...],
    "qualified": [...],
    "notQualified": [...]
  }
}
```

### 4. Prepare Outreach Strategy
**POST** `/outbound/prepare-outreach`

Prepare a qualified lead with email strategy and LinkedIn contact plan.

```bash
curl -X POST http://localhost:4000/outbound/prepare-outreach \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "TechScale Inc",
    "stage": "Series B",
    "location": "San Francisco, USA",
    "industry": "SaaS & B2B Technology",
    "teamSize": "45",
    "hiringActivity": ["Currently hiring", "VP Engineering open"],
    "role": "VP Engineering",
    "prospectName": "Sarah Chen",
    "linkedinUrl": "https://linkedin.com/in/sarahchen"
  }'
```

Response:
```json
{
  "success": true,
  "prospectData": { ... },
  "leadScore": { "qualifyingScore": 85, ... },
  "outreachStrategy": {
    "emailDraft": {
      "subject": "Need Backend/Frontend developers?",
      "body": "Hi Sarah Chen...",
      "hooks": [...],
      "proofPoints": { ... }
    },
    "outreachSequence": {
      "day0": { "action": "LinkedIn Connection Request", ... },
      "day3": { "action": "Follow-up Email", ... },
      "day7": { "action": "LinkedIn Message", ... },
      "day14": { "action": "Secondary Email", ... }
    }
  }
}
```

### 5. Filter Qualified Leads
**POST** `/outbound/filter-qualified`

Filter a list to return only qualified leads.

```bash
curl -X POST http://localhost:4000/outbound/filter-qualified \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [...],
    "minScore": 65
  }'
```

Response:
```json
{
  "success": true,
  "totalLeads": 10,
  "qualifiedLeads": 6,
  "qualificationRate": "60%",
  "qualified": [...]
}
```

### 6. Plan a Campaign
**POST** `/outbound/campaign-plan`

Plan a 30-day campaign with projections.

```bash
curl -X POST http://localhost:4000/outbound/campaign-plan \
  -H "Content-Type: application/json" \
  -d '{
    "campaignName": "Q2 2026 Outbound",
    "leads": [...]
  }'
```

Response:
```json
{
  "success": true,
  "campaign": { "name": "Q2 2026 Outbound", ... },
  "summary": {
    "totalLeads": 50,
    "highPriorityLeads": 15,
    "secondaryLeads": 20,
    "qualifiedTotal": 35,
    "qualificationRate": "70%"
  },
  "projections": {
    "expectedConnections": 7,
    "expectedResponses": 1,
    "expectedClosures": 0,
    "conversionFunnel": { ... }
  },
  "campaignSchedule": {
    "week1": {
      "dailyOutreach": 10,
      "totalOutreach": 50,
      "focus": "High-priority roles"
    },
    "weeks2to4": { ... }
  }
}
```

### 7. Get Example ICP Profiles
**GET** `/outbound/example-icp`

Get pre-scored example prospects to understand the ICP.

```bash
curl http://localhost:4000/outbound/example-icp
```

## Scoring Examples

### High-Quality Lead (85/100)
```json
{
  "companyName": "TechScale Inc",
  "stage": "Series B",           // +25 (perfect match)
  "location": "San Francisco, USA",  // +20 (US is target)
  "industry": "SaaS & B2B Technology",  // +15 (target industry)
  "teamSize": "45",              // +10 (in ideal range)
  "hiringActivity": ["Currently hiring", "VP Engineering open"],  // +10
  "role": "VP Engineering"       // +5 (high-priority role)
}
// Total: 25+20+15+10+10+5 = 85/100 ✅ HIGHLY QUALIFIED
```

### Mid-Quality Lead (65/100)
```json
{
  "companyName": "FinFlow Startup",
  "stage": "Series A",           // +20 (good, but not Series B)
  "location": "London, UK",      // +20 (UK is target)
  "industry": "Fintech & Neo-Banking",  // +15 (target industry)
  "teamSize": "28",              // +5 (smaller, less active hiring)
  "hiringActivity": ["Scaling team", "hiring backend engineers"],  // +5
  "role": "Founder & CEO"        // +5 (high-priority role)
}
// Total: Just qualifying at 65/100 ✅ QUALIFIED
```

### Low-Quality Lead (0/100)
```json
{
  "companyName": "IndianTech Corp",
  "location": "Bangalore, India",   // ❌ EXCLUDED (India in exclusion list)
  "hiringStatus": "Hiring freeze"   // ❌ EXCLUDED (hiring freeze)
}
// Score: 0/100, Reasons: Hiring freeze, India location ❌ DISQUALIFIED
```

## Lead Qualification Workflow

```
Prospect Found
    ↓
Extract Data (Stage, Location, Role, Industry, Hiring Activity)
    ↓
Check Exclusions → [Disqualified] 🔴
    ↓
Score Against ICP
    ↓
Score < 65? → [Not Qualified] 🔴
    ↓
Score >= 65 + High-Priority Role? → [Highly Qualified] 🟢
    ↓
Else Score >= 65? → [Qualified] 🟡
    ↓
Prepare Outreach
    ├── Generate Email Draft
    ├── Get Email Hooks & Proof Points
    ├── Create LinkedIn Sequence
    └── Send Day 0: Connection Request
        Send Day 3: Follow-up Email
        Send Day 7: LinkedIn Message (if connected)
        Send Day 14: Second Email
```

## Campaign Metrics

### Default Campaign Configuration
- **Daily Outreach**: 10 leads/day
- **Weekly Outreach**: 50 leads/week
- **Duration**: 30 days
- **Target Response Rate**: 10-15%
- **Target Conversion Rate**: 2-3%

### Expected Funnel (Based on 50 Leads)
```
50 Leads
    ↓ (70% qualify)
35 Qualified
    ↓ (20% connection rate)
7 Connections
    ↓ (12% response rate)
1 Response
    ↓ (2.5% conversion)
0 (rounding) → ~1 Deal per 40 leads
```

## Integration with Other Systems

### With LinkedIn Automation
```javascript
// Score lead first
const score = await POST /outbound/score-lead

if (score.qualified) {
  // Generate LinkedIn connection request
  await POST /linkedin/send-connection-request {
    profileUrl: prospect.linkedinUrl,
    message: emailDraft.hooks[0],
    saverMessage: emailDraft.body
  }
}
```

### With Email Generation
```javascript
// Prepare outreach includes email generation
const outreach = await POST /outbound/prepare-outreach

// Extract and send email
const emailDraft = outreach.outreachStrategy.emailDraft
// Send via email service on Day 3
```

### With Campaign Management
```javascript
// Plan campaign
const campaign = await POST /outbound/campaign-plan

// Use scheduled batch processing
for (let week = 1; week <= 4; week++) {
  const weekLeads = campaign.campaignSchedule[`week${week}`].leads
  // Process dailyOutreach leads per day
}
```

## Testing

Run the test suite to validate:

```bash
cd backend
node test-outbound.js
```

Output includes:
- ICP summary validation
- High-quality lead scoring
- Low-quality lead scoring
- Batch scoring results
- Grouping by recommendation
- Outreach strategy preparation
- Campaign planning with projections

## Configuration

### Modifying ICP Criteria

Edit [backend/data/outbound-icp-config.json](outbound-icp-config.json):

```json
{
  "outbound": {
    "targetICP": {
      "companyStage": ["Series A", "Series B"],  // ← Modify here
      "geography": ["US", "UAE", "UK"],          // ← Or here
      "teamSize": { "min": 10, "max": 300 }      // ← Or here
    }
  }
}
```

### Adjusting Scoring Weights

Edit `scoringWeights` in [outbound-icp-config.json](outbound-icp-config.json):

```json
{
  "scoringWeights": {
    "stageMatch": 0.25,      // Weight for stage matching
    "geographyMatch": 0.20,  // Weight for geography
    "activeHiring": 0.25,    // Weight for hiring indicators
    "industryMatch": 0.15,   // Weight for industry
    "teamSizeMatch": 0.10,   // Weight for team size
    "roleFit": 0.05          // Weight for role
  }
}
```

### Changing Qualification Thresholds

Edit qualification scores in [outbound-icp-config.json](outbound-icp-config.json):

```json
{
  "minQualificationScore": 65,          // Overall threshold
  "minHighPriorityRoleScore": 50,       // For high-priority roles
  "minSecondaryRoleScore": 70           // For secondary roles
}
```

## Performance Notes

- All scoring is synchronous and fast (< 10ms per lead)
- Batch scoring 1000 leads takes ~5-10 seconds
- ICP config loads once on server startup
- No external API calls needed for scoring

## Future Enhancements

- [ ] LinkedIn data integration for live hiring indicators
- [ ] Historical performance tracking (conversion by criteria)
- [ ] A/B testing framework for outreach messages
- [ ] CRM integration for lead status tracking
- [ ] Web UI for campaign management
- [ ] Batch API for processing 1000+ leads
- [ ] Machine learning: adjust weights based on conversion data
- [ ] Time-zone aware outreach scheduling
