import express from 'express'
import { google } from 'googleapis'

const router = express.Router()

// Configuration
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]
const DEFAULT_SLOT_MINUTES = 30
const DEFAULT_LOOKAHEAD_DAYS = 7
const DEFAULT_LEAD_MINUTES = 120
const IST_OFFSET_MINUTES = 330 // IST is UTC+5:30
const WORK_START_HOUR_IST = 13
const WORK_END_HOUR_IST = 20

const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

router.get('/auth-url', (req, res) => {
  try {
    const client = getOAuthClient()
    const state = req.query.state || ''

    const url = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      include_granted_scopes: true,
      state,
    })

    res.json({ url })
  } catch (err) {
    console.error('[google][auth-url] error', err)
    res.status(500).json({ error: 'Failed to generate auth URL', details: err.message })
  }
})

router.post('/exchange', async (req, res) => {
  try {
    const { code } = req.body || {}
    if (!code) return res.status(400).json({ error: 'code is required' })

    const client = getOAuthClient()
    const { tokens } = await client.getToken(code)
    res.json({ tokens })
  } catch (err) {
    console.error('[google][exchange] error', err)
    res.status(500).json({ error: 'Failed to exchange code', details: err.message })
  }
})

// Optional GET callback to support popup flows; exchanges code and posts tokens to opener, then closes.
router.get('/callback', async (req, res) => {
  try {
    const code = req.query.code
    if (!code) return res.status(400).send('Missing code')

    const client = getOAuthClient()
    const { tokens } = await client.getToken(String(code))

    const safeTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      token_type: tokens.token_type,
    }

    const html = `<!DOCTYPE html><html><body><script>
      if (window.opener) {
        window.opener.postMessage({ type: 'hive-google-tokens', tokens: ${JSON.stringify(safeTokens)} }, '*');
        window.close();
      } else {
        document.write('Tokens received. You can close this window.');
      }
    </script></body></html>`

    res.setHeader('Content-Type', 'text/html').send(html)
  } catch (err) {
    console.error('[google][callback] error', err)
    res.status(500).send('Callback failed: ' + (err instanceof Error ? err.message : 'unknown error'))
  }
})

const setCredentials = async (tokens) => {
  const client = getOAuthClient()
  client.setCredentials(tokens)

  if (tokens?.refresh_token && (!tokens.access_token || tokens.expiry_date <= Date.now())) {
    const { credentials } = await client.refreshAccessToken()
    client.setCredentials(credentials)
    return { client, credentials }
  }

  return { client, credentials: tokens }
}

const toUtcFromIst = (year, monthIndexZeroBased, day, hour, minute) => {
  const baseUtc = Date.UTC(year, monthIndexZeroBased, day, hour, minute)
  return baseUtc - IST_OFFSET_MINUTES * 60 * 1000
}

const overlapsBusy = (startMs, endMs, busy) => busy.some((b) => startMs < b.end && endMs > b.start)

const buildAvailability = ({ busy, nowUtcMs, days = DEFAULT_LOOKAHEAD_DAYS, slotMinutes = DEFAULT_SLOT_MINUTES, leadMinutes = DEFAULT_LEAD_MINUTES, maxSlots = 6 }) => {
  const slots = []
  const slotMs = slotMinutes * 60 * 1000
  const leadMs = leadMinutes * 60 * 1000

  for (let i = 0; i < days && slots.length < maxSlots; i++) {
    const istNowMs = nowUtcMs + IST_OFFSET_MINUTES * 60 * 1000 + i * 24 * 60 * 60 * 1000
    const istDate = new Date(istNowMs)
    const day = istDate.getUTCDay() // after shifting, getUTCDay matches IST weekday
    if (day === 0) continue // skip Sunday

    const y = istDate.getUTCFullYear()
    const m = istDate.getUTCMonth()
    const d = istDate.getUTCDate()

    const windowStartUtc = toUtcFromIst(y, m, d, WORK_START_HOUR_IST, 0)
    const windowEndUtc = toUtcFromIst(y, m, d, WORK_END_HOUR_IST, 0)

    for (let start = windowStartUtc; start + slotMs <= windowEndUtc && slots.length < maxSlots; start += slotMs) {
      const end = start + slotMs
      if (start < nowUtcMs + leadMs) continue
      if (overlapsBusy(start, end, busy)) continue

      slots.push({
        start,
        end,
        isoStart: new Date(start).toISOString(),
        isoEnd: new Date(end).toISOString(),
        label: new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date(start + IST_OFFSET_MINUTES * 60 * 1000)),
      })
    }
  }

  return slots
}

router.post('/availability', async (req, res) => {
  try {
    const { access_token, refresh_token, calendarId = 'primary', days, slotMinutes, leadMinutes, maxSlots } = req.body || {}
    if (!access_token && !refresh_token) {
      return res.status(400).json({ error: 'access_token or refresh_token is required' })
    }

    const { client, credentials } = await setCredentials({ access_token, refresh_token })
    const calendar = google.calendar({ version: 'v3', auth: client })

    const now = new Date()
    const timeMin = now.toISOString()
    const timeMax = new Date(now.getTime() + (days || DEFAULT_LOOKAHEAD_DAYS) * 24 * 60 * 60 * 1000).toISOString()

    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: calendarId }],
      },
    })

    const busy = (fb.data.calendars?.[calendarId]?.busy || []).map((b) => ({
      start: Date.parse(b.start),
      end: Date.parse(b.end),
    }))

    const slots = buildAvailability({
      busy,
      nowUtcMs: Date.now(),
      days,
      slotMinutes,
      leadMinutes,
      maxSlots,
    })

    res.json({ slots, tokens: credentials })
  } catch (err) {
    console.error('[google][availability] error', err)
    res.status(500).json({ error: 'Failed to fetch availability', details: err.message })
  }
})

router.post('/book', async (req, res) => {
  try {
    const { access_token, refresh_token, calendarId = 'primary', startIso, endIso, summary = 'Hive demo', description, attendeeEmail } = req.body || {}
    if (!startIso || !endIso) {
      return res.status(400).json({ error: 'startIso and endIso are required' })
    }
    if (!access_token && !refresh_token) {
      return res.status(400).json({ error: 'access_token or refresh_token is required' })
    }

    const { client, credentials } = await setCredentials({ access_token, refresh_token })
    const calendar = google.calendar({ version: 'v3', auth: client })

    const event = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: {
        summary,
        description,
        start: { dateTime: startIso, timeZone: 'Asia/Kolkata' },
        end: { dateTime: endIso, timeZone: 'Asia/Kolkata' },
        attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
        conferenceData: {
          createRequest: {
            requestId: `hive-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    })

    res.json({
      event: event.data,
      meetLink: event.data.hangoutLink || event.data.conferenceData?.entryPoints?.[0]?.uri,
      tokens: credentials,
    })
  } catch (err) {
    console.error('[google][book] error', err)
    res.status(500).json({ error: 'Failed to create event', details: err.message })
  }
})

export default router
