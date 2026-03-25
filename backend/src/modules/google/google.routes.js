import express from 'express'
import crypto from 'node:crypto'
import { google } from 'googleapis'
import { supabase } from '../../config/supabase.js'
import requireAuth from '../../middlewares/require-auth.js'

const router = express.Router()

// Configuration
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
]
const DEFAULT_SLOT_MINUTES = 30
const DEFAULT_LOOKAHEAD_DAYS = 7
const DEFAULT_LEAD_MINUTES = 120
const IST_OFFSET_MINUTES = 330 // IST is UTC+5:30
const WORK_START_HOUR_IST = 13
const WORK_END_HOUR_IST = 20
const STATE_TTL_MS = 10 * 60 * 1000
const pendingStates = new Map()

const createState = (userId) => {
  const state = crypto.randomUUID()
  pendingStates.set(state, { userId, expiresAt: Date.now() + STATE_TTL_MS })
  return state
}

const consumeState = (state) => {
  if (!state) return null
  const entry = pendingStates.get(state)
  if (!entry) return null
  pendingStates.delete(state)
  if (entry.expiresAt < Date.now()) return null
  return entry.userId
}

const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export const getTokensForUser = async (userId) => {
  const { data, error } = await supabase
    .from('google_tokens')
    .select('access_token, refresh_token, scope, expiry_date, token_type')
    .eq('user_id', userId)
    .limit(1)

  if (error) throw error
  return data?.[0]
}

const saveTokensForUser = async (userId, tokens) => {
  const payload = {
    user_id: userId,
    access_token: tokens.access_token || null,
    refresh_token: tokens.refresh_token || null,
    scope: tokens.scope || null,
    expiry_date: tokens.expiry_date || null,
    token_type: tokens.token_type || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('google_tokens').upsert(payload, { onConflict: 'user_id' })
  if (error) throw error
  return payload
}

router.get('/auth-url', requireAuth, (req, res) => {
  try {
    const client = getOAuthClient()
    const state = createState(req.user.id)

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

router.post('/exchange', requireAuth, async (req, res) => {
  try {
    const { code } = req.body || {}
    if (!code) return res.status(400).json({ error: 'code is required' })

    const client = getOAuthClient()
    const { tokens } = await client.getToken(code)
    await saveTokensForUser(req.user.id, tokens)
    res.json({ connected: true })
  } catch (err) {
    console.error('[google][exchange] error', err)
    res.status(500).json({ error: 'Failed to exchange code', details: err.message })
  }
})

// Optional GET callback to support popup flows; exchanges code and posts tokens to opener, then closes.
router.get('/callback', async (req, res) => {
  try {
    const code = req.query.code
    const state = req.query.state
    if (!code) return res.status(400).send('Missing code')

    const userId = consumeState(String(state || ''))
    if (!userId) return res.status(400).send('Missing or expired state')

    const client = getOAuthClient()
    const { tokens } = await client.getToken(String(code))

    await saveTokensForUser(userId, tokens)

    const safeTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      token_type: tokens.token_type,
    }

    const html = `<!DOCTYPE html><html><body><script>
      if (window.opener) {
        window.opener.postMessage({ type: 'hive-google-connected' }, '*');
        window.close();
      } else {
        document.write('Google connected. You can close this window.');
      }
    </script></body></html>`

    res.setHeader('Content-Type', 'text/html').send(html)
  } catch (err) {
    console.error('[google][callback] error', err)
    res.status(500).send('Callback failed: ' + (err instanceof Error ? err.message : 'unknown error'))
  }
})

export const setCredentials = async (tokens, userId) => {
  const client = getOAuthClient()
  client.setCredentials(tokens)

  if (tokens?.refresh_token && (!tokens.access_token || tokens.expiry_date <= Date.now())) {
    const { credentials } = await client.refreshAccessToken()
    client.setCredentials(credentials)
    if (userId) {
      await saveTokensForUser(userId, credentials)
    }
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

router.get('/status', requireAuth, async (req, res) => {
  try {
    const tokens = await getTokensForUser(req.user.id)
    res.json({ connected: Boolean(tokens?.refresh_token || tokens?.access_token) })
  } catch (err) {
    console.error('[google][status] error', err)
    res.status(500).json({ error: 'Failed to check status' })
  }
})

router.post('/availability', requireAuth, async (req, res) => {
  try {
    const { calendarId = 'primary', days, slotMinutes, leadMinutes, maxSlots } = req.body || {}
    const storedTokens = await getTokensForUser(req.user.id)
    if (!storedTokens) return res.status(404).json({ error: 'No Google tokens on file' })

    const { client, credentials } = await setCredentials(storedTokens, req.user.id)
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

    res.json({ slots })
  } catch (err) {
    console.error('[google][availability] error', err)
    res.status(500).json({ error: 'Failed to fetch availability', details: err.message })
  }
})

router.post('/book', requireAuth, async (req, res) => {
  try {
    const { calendarId = 'primary', startIso, endIso, summary = 'Hive demo', description, attendeeEmail } = req.body || {}
    if (!startIso || !endIso) {
      return res.status(400).json({ error: 'startIso and endIso are required' })
    }

    const storedTokens = await getTokensForUser(req.user.id)
    if (!storedTokens) return res.status(404).json({ error: 'No Google tokens on file' })

    const { client, credentials } = await setCredentials(storedTokens, req.user.id)
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
    })
  } catch (err) {
    console.error('[google][book] error', err)
    res.status(500).json({ error: 'Failed to create event', details: err.message })
  }
})

export default router
