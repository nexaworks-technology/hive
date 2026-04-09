# Huma Google Workspace Email Integration

This document describes the new email integration for Huma's Google Workspace account (`huma.m@sutrahr.com`).

## Overview

The integration uses Google Service Account authentication to send campaign emails and monitor replies from Huma's email account. This eliminates the need for OAuth token management and provides a dedicated email source for all Huma campaigns.

## Configuration

### Environment Variables

Required .env entries:
```
HUMA_EMAIL=huma.m@sutrahr.com
HUMA_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

The `HUMA_SERVICE_ACCOUNT_JSON` should contain the complete Service Account credentials JSON from Google Cloud Console.

## New API Endpoints

### 1. Send Campaign Emails from Huma's Account

**POST** `/campaigns-v2/:campaignId/send-huma-emails`

Sends campaign emails from `huma.m@sutrahr.com` to a list of prospects.

**Request Body:**
```json
{
  "prospects": [
    {
      "id": "prospect1",
      "name": "John Doe",
      "email": "john@example.com",
      "company": "Acme Corp",
      "role": "Hiring Manager"
    }
  ],
  "emailTemplate": {
    "subject": "Interested in Acme Corp?",
    "body": "Hi {name}, we'd like to discuss talent solutions for {company}...",
    "hasTemplate": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "campaignId": "campaign123",
  "totalProspects": 1,
  "emailsSent": 1,
  "emailsFailed": 0,
  "details": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "success": true
    }
  ]
}
```

**Notes:**
- Emails are sent from `huma.m@sutrahr.com`
- Template variables supported: `{name}`, `{company}`, `{role}`
- Requires authentication

### 2. Check for Replies on Huma's Account

**POST** `/campaigns-v2/:campaignId/check-huma-replies`

Checks Huma's mailbox for unread emails from prospects and classifies them using AI.

**Request Body:**
```json
{
  "prospectsList": [
    {
      "id": "prospect1",
      "name": "John Doe",
      "email": "john@example.com",
      "company": "Acme Corp",
      "role": "Hiring Manager",
      "linkedinProfile": "https://linkedin.com/in/johndoe",
      "industry": "Technology"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "campaignId": "campaign123",
  "repliesFound": 2,
  "repliesProcessed": 2,
  "totalProspects": 1,
  "prospectUpdates": [
    {
      "prospectId": "prospect1",
      "prospectEmail": "john@example.com",
      "replied": true,
      "replyIntent": "positive|question|objection|not_interested|out_of_office",
      "detectedObjection": "Budget constraints mentioned"
    }
  ]
}
```

**Features:**
- Monitors unread emails from campaign prospects
- Uses AI (OpenRouter) to classify reply intent
- Detects objections automatically
- Saves replies to database with metadata
- Marks emails as read after processing
- Requires authentication

## Implementation Details

### Service Account Flow

1. **Authentication**: Uses Google Service Account with domain-wide delegation
2. **Email Sending**: Constructs MIME messages and sends via Gmail API v1
3. **Reply Monitoring**: Queries unread emails, extracts content, classifies using LLM
4. **Data Persistence**: Saves replies to Supabase `prospect_replies` table

### Database Schema

Replies are stored in the `prospect_replies` table:
- `id`: Unique identifier
- `prospect_id`: Reference to prospect
- `campaign_id`: Reference to campaign
- `reply_from`: Sender email
- `subject`: Email subject
- `body`: Email body text
- `detected_objection`: AI-detected objection (if any)
- `sentiment`: Sentiment classification
- `reply_date`: When reply was received
- `user_responded`: Whether user has responded to this reply

## Usage Examples

### Frontend Integration

```typescript
// Send emails from Huma's account
const response = await fetch(`/campaigns-v2/${campaignId}/send-huma-emails`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prospects: campaignProspects,
    emailTemplate: {
      subject: 'Custom subject line',
      body: 'Email content with {name} and {company} variables',
      hasTemplate: true
    }
  })
});

const result = await response.json();
console.log(`Sent ${result.emailsSent} emails`);

// Check for replies
const repliesResponse = await fetch(`/campaigns-v2/${campaignId}/check-huma-replies`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prospectsList: campaignProspects
  })
});

const repliesResult = await repliesResponse.json();
console.log(`Found ${repliesResult.repliesProcessed} new replies`);
```

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| Huma email service account not configured | Missing `HUMA_SERVICE_ACCOUNT_JSON` in .env | Add Service Account credentials to .env |
| Missing or empty prospects list | No prospects provided in request | Ensure `prospectsList` or `prospects` in request body |
| Failed to search Gmail | Gmail API connection issue | Verify Service Account has Gmail API enabled |
| AI classification error | OpenRouter API issue | Check `OPENROUTER_API_KEY` in .env |

## Future Enhancements

- Bulk email sending with rate limiting
- Email template builder UI
- Advanced reply sentiment analysis
- Automatic follow-up sequences
- Reply attachment handling
- Domain whitelist for outgoing emails

## Troubleshooting

### Service Account Not Responding

```bash
# Verify credentials in .env
node -e "console.log(process.env.HUMA_SERVICE_ACCOUNT_JSON)"

# Check Gmail API is enabled in Google Cloud Project
# https://console.cloud.google.com/apis/library/gmail.googleapis.com
```

### Emails Not Sending

1. Verify Service Account email has permission to send as huma.m@sutrahr.com
2. Check Gmail API is enabled in Google Cloud
3. Review backend logs for detailed error messages

### Replies Not Detected

1. Check that prospect emails match exactly (case-insensitive)
2. Verify Service Account can read emails from Huma's account
3. Check OpenRouter API key is valid
