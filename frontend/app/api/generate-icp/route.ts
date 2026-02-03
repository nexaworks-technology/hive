import { NextResponse } from 'next/server'

type Icp = {
  traits: string[]
  marketInsights: string[]
  competitiveAnalysis: string[]
  painPoints: string[]
}

const MODEL_PREFERENCE = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-3-flash-preview',
]

const OPENAI_MODEL = 'gpt-4.1-mini'

const coerceStringArray = (value: unknown, fallback: string[]): string[] => {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
    if (items.length) return items
  }
  return fallback
}

const stripJsonFences = (text: string) => text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '')

const parseContent = (raw: unknown): any => {
  const text = typeof raw === 'string' ? raw : ''
  const cleaned = stripJsonFences(text.trim())

  // Try direct parse first
  try {
    return JSON.parse(cleaned)
  } catch {
    /* no-op */
  }

  // Fallback: extract the first JSON object block if present
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      return JSON.parse(match[0])
    } catch {
      /* no-op */
    }
  }

  return null
}

const fallbackIcp = (targetAudience: string, additionalContext: string): Icp => ({
  traits: [
    targetAudience ? `${targetAudience} (primary target)` : 'Audience details not provided',
    'Budget holder or strong influence on vendor selection',
    'Open to improving efficiency and measurable outcomes',
    additionalContext ? `Context focus: ${additionalContext}` : 'Context not specified',
  ],
  marketInsights: [
    'Typical evaluation cycles range from 30-120 days with multiple stakeholders',
    'Credibility and proof points matter more than aggressive pricing',
    additionalContext ? `Stated priorities: ${additionalContext}` : 'Priorities not specified',
  ],
  competitiveAnalysis: [
    'Compete against established incumbents; differentiation via speed, precision, and reliability',
    'Gap: consistent quality, clear ROI proof, and tailored messaging by segment',
    'Pressure from lower-cost alternatives; buyers need evidence of superior outcomes',
  ],
  painPoints: [
    'Manual effort to qualify opportunities and personalize outreach',
    'Difficulty proving ROI and attribution for new initiatives',
    'Slow cycles caused by fragmented information or tooling',
  ],
})

const heuristicIcp = (targetAudience: string, additionalContext: string): Icp => {
  const trimmedAudience = targetAudience || 'Target audience not specified'
  const trimmedContext = additionalContext || 'Context not specified'

  return {
    traits: [
      `${trimmedAudience} with decision-making influence`,
      'Prefers evidence-backed solutions over hype',
      'Values efficiency, accuracy, and predictable outcomes',
      `Context focus: ${trimmedContext}`,
    ],
    marketInsights: [
      `${trimmedAudience} often face complex stakeholder approvals`,
      'Risk tolerance is low; compliance and quality assurance are crucial',
      'Proof points and references materially influence purchase decisions',
    ],
    competitiveAnalysis: [
      `Compete with incumbents already serving ${trimmedAudience}`,
      'Differentiation leans on reliability, speed, and measurable ROI',
      'Gaps include tailored messaging and end-to-end support',
    ],
    painPoints: [
      'High manual effort to prepare and validate materials',
      'Difficulty scaling personalized outreach without errors',
      'Limited visibility into what drives conversions or replies',
    ],
  }
}

const callOpenAI = async (apiKey: string, targetAudience: string, additionalContext: string) => {
  const prompt = `You are a B2B ICP generator. Return JSON only with fields: traits[], marketInsights[], competitiveAnalysis[], painPoints[]. Max 140 chars per item. Tailor to the inputs.\nTarget audience: ${targetAudience || 'Not provided'}\nAdditional context: ${additionalContext || 'Not provided'}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'Respond only with JSON matching keys: traits, marketInsights, competitiveAnalysis, painPoints.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    return { ok: false, details: details.slice(0, 500) }
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content || ''
  return { ok: true, content }
}

const normalizeIcp = (raw: any, targetAudience: string, additionalContext: string): Icp => {
  const fallback = fallbackIcp(targetAudience, additionalContext)
  return {
    traits: coerceStringArray(raw?.traits, fallback.traits),
    marketInsights: coerceStringArray(raw?.marketInsights, fallback.marketInsights),
    competitiveAnalysis: coerceStringArray(raw?.competitiveAnalysis, fallback.competitiveAnalysis),
    painPoints: coerceStringArray(raw?.painPoints, fallback.painPoints),
  }
}

const systemPrompt = `You are a B2B ICP and market intelligence assistant.
Return ONLY JSON with no prose, no markdown, matching this exact shape:
{
  "traits": ["string"...],
  "marketInsights": ["string"...],
  "competitiveAnalysis": ["string"...],
  "painPoints": ["string"...]
}

Rules:
- Keep each item concise (max 140 characters).
- Avoid placeholders and avoid duplicating the same idea.
- Tailor to the provided target audience and context.
`

const buildPrompt = (targetAudience: string, additionalContext: string) => `Inputs:
- Target audience: ${targetAudience || 'Not provided'}
- Additional context: ${additionalContext || 'Not provided'}
Return the JSON now.`

export async function POST(req: Request) {
  try {
    const { targetAudience, additionalContext } = (await req.json()) as {
      targetAudience?: string
      additionalContext?: string
    }

    const trimmedAudience = (targetAudience || '').trim()
    const trimmedContext = (additionalContext || '').trim()

    if (!trimmedAudience) {
      return NextResponse.json({ error: 'targetAudience is required' }, { status: 400 })
    }

    const apiKey =
      process.env.GEMINI_API_KEY_ICP ||
      process.env.GEMINI_API_KEY ||
      process.env.gemini_api_key ||
      process.env.GEMINI ||
      process.env.xApi_key

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY_ICP' }, { status: 500 })
    }

    const makeRequest = async (model: string) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'system',
              parts: [{ text: systemPrompt }],
            },
            {
              role: 'user',
              parts: [
                {
                  text: buildPrompt(trimmedAudience, trimmedContext),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 512,
          },
        }),
      })

      return response
    }

    const withRetry = async (model: string, attempts: number, delayMs: number): Promise<Response> => {
      let lastError: any
      for (let i = 0; i < attempts; i++) {
        const res = await makeRequest(model)
        if (res.ok) return res

        const status = res.status
        // Retry on transient overloads/timeouts
        if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
          lastError = await res.text()
          await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, i)))
          continue
        }

        return res
      }

      if (lastError) {
        return new Response(lastError, { status: 503 })
      }

      return new Response('Service unavailable', { status: 503 })
    }

    let openAiDetails: string | undefined
    // Try OpenAI first
    const openAiKey = process.env.OPENAI_API_KEY_ICP || process.env.OPENAI_API_KEY
    if (openAiKey) {
      const oa = await callOpenAI(openAiKey, trimmedAudience, trimmedContext)
      if (oa.ok) {
        const parsed = parseContent(oa.content)
        const icp = normalizeIcp(parsed, trimmedAudience, trimmedContext)
        return NextResponse.json({ icp, source: 'openai' })
      }
      openAiDetails = oa.details
    }

    let response: Response | null = null
    let usedModel = ''

    for (const model of MODEL_PREFERENCE) {
      const res = await withRetry(model, 3, 800)
      if (res.ok) {
        response = res
        usedModel = model
        break
      }

      // If non-transient (e.g., 404 model not found), try next model
      usedModel = model
    }

    if (!response) {
      const icp = heuristicIcp(trimmedAudience, trimmedContext)
      return NextResponse.json(
        {
          icp,
          source: 'fallback',
          reason: 'All Gemini models unavailable; OpenAI did not succeed',
          openaiDetails: openAiDetails,
        },
        { status: 200 }
      )
    }

      if (!response.ok) {
        const details = await response.text()
        const icp = heuristicIcp(trimmedAudience, trimmedContext)
        return NextResponse.json(
          {
            icp,
            source: 'fallback',
            reason: 'Gemini request failed; OpenAI already attempted first',
            status: response.status,
            details: details.slice(0, 300),
            openaiDetails: openAiDetails,
          },
          { status: 200 }
        )
      }

    const data = await response.json()

    // Prefer any text part; if none, try functionCall args; else stringify first part
    const parts = data?.candidates?.[0]?.content?.parts || []
    const textPart = parts.find((p: any) => typeof p?.text === 'string')?.text
    const fnArgs = parts.find((p: any) => p?.functionCall?.args)?.functionCall?.args
    const rawContent =
      textPart ??
      (fnArgs ? JSON.stringify(fnArgs) : parts.length ? JSON.stringify(parts[0]) : '')

    let parsed = parseContent(rawContent)

    // If Gemini responded but we could not parse JSON, try OpenAI before falling back
    if (!parsed) {
      const openAiKey = process.env.OPENAI_API_KEY_ICP || process.env.OPENAI_API_KEY
      if (openAiKey) {
        const oa = await callOpenAI(openAiKey, trimmedAudience, trimmedContext)
        if (oa.ok) {
          parsed = parseContent(oa.content)
          if (parsed) {
            const icp = normalizeIcp(parsed, trimmedAudience, trimmedContext)
            return NextResponse.json({ icp, source: 'openai', model: usedModel, note: 'Gemini parse failed; used OpenAI' })
          }
        }
        openAiDetails = openAiDetails || oa.details
      }
    }

    const icp = normalizeIcp(parsed, trimmedAudience, trimmedContext)

    return NextResponse.json({ icp, source: parsed ? 'gemini' : 'fallback', model: usedModel, openaiDetails: openAiDetails })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const icp = heuristicIcp('', '')
    return NextResponse.json({ icp, source: 'fallback', error: 'Failed to generate ICP', details: message }, { status: 200 })
  }
}
