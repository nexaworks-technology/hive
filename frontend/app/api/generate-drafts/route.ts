import { NextResponse } from 'next/server';

type LeadInput = {
  id: string;
  name: string;
  title: string;
  company: string;
  summary?: string;
  talkingPoints?: string[];
};

type Draft = {
  id: string;
  subject: string;
  body: string;
};

const MODEL = 'gemini-3-flash-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const OPENROUTER_API_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL_LIST = (process.env.OPENROUTER_MODEL_DRAFTS || process.env.OPENROUTER_MODEL || '')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const OPENROUTER_MODELS = OPENROUTER_MODEL_LIST.length
  ? OPENROUTER_MODEL_LIST
  : ['openai/gpt-4.1-mini', 'anthropic/claude-3.5-sonnet'];

const buildPrompt = (
  leads: LeadInput[],
  targetAudience: string,
  additionalContext: string
) => {
  const leadsText = leads
    .map((lead, idx) => {
      const talking = lead.talkingPoints?.length ? lead.talkingPoints.join('; ') : 'None provided';
      return `Lead ${idx + 1}:
 id: ${lead.id}
 name: ${lead.name}
 title: ${lead.title}
 company: ${lead.company}
 summary: ${lead.summary ?? 'Not provided'}
 talking_points: ${talking}`;
    })
    .join('\n\n');

  return `You are an expert B2B outbound assistant. Write concise, personalized email drafts.
Rules:
- Return JSON only, no prose, no markdown.
- JSON shape: {"drafts":[{"id":"string","subject":"string","body":"string"}]}.
- Keep body under 120 words. Use a single short CTA. No hard sell.
- Tone: helpful, specific, consultative.
- End body with a brief P.S. offering a 2-slide summary as an alternate path if timing is tight.
- Do not invent companies or roles beyond the lead data.

Campaign context:
- Target audience: ${targetAudience || 'Not provided'}
- Additional context: ${additionalContext || 'Not provided'}

Leads:
${leadsText}`;
};

const fallbackDrafts = (leads: LeadInput[]): Draft[] =>
  leads.map((lead) => ({
    id: lead.id,
    subject: `Quick idea for ${lead.company}`,
    body: `Hi ${lead.name.split(' ')[0] || 'there'},\n\nSharing a short idea tailored to ${lead.company}. Based on your role as ${lead.title}, a light enrichment + follow-up tweak could lift replies. Happy to send a 3-step outline if you want it.`,
  }));

const callOpenRouter = async (apiKey: string, model: string, prompt: string) => {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'https://hive.local',
      'X-Title': process.env.OPENROUTER_TITLE || 'Hive',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You write concise, personalized B2B outbound emails and respond only in JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    return { ok: false, status: response.status, details: await response.text() };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return { ok: true, content };
};

export async function POST(req: Request) {
  try {
    const { leads, targetAudience, additionalContext } = (await req.json()) as {
      leads: LeadInput[];
      targetAudience?: string;
      additionalContext?: string;
    };

    if (!leads?.length) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
    }

    const geminiKey =
      process.env.GEMINI_API_KEY ||
      process.env.gemini_api_key ||
      process.env.GEMINI ||
      process.env.xApi_key;
    const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;

    if (!geminiKey && !openRouterKey) {
      return NextResponse.json({ error: 'Missing LLM API key (OpenRouter or Gemini)' }, { status: 500 });
    }

    const prompt = buildPrompt(leads, targetAudience ?? '', additionalContext ?? '');

    if (openRouterKey) {
      for (const model of OPENROUTER_MODELS) {
        const or = await callOpenRouter(openRouterKey, model, prompt);
        if (or.ok && or.content) {
          try {
            const parsed = typeof or.content === 'string' ? JSON.parse(or.content) : or.content;
            const drafts = parsed?.drafts?.length ? parsed.drafts : fallbackDrafts(leads);
            return NextResponse.json({ drafts, source: 'openrouter', model });
          } catch (err) {
            // continue to next model or fallback
          }
        }
      }
    }

    if (!geminiKey) {
      const drafts = fallbackDrafts(leads);
      return NextResponse.json({ drafts, source: 'fallback', reason: 'OpenRouter unavailable and no Gemini key set' });
    }

    const response = await fetch(`${API_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'You write concise, personalized B2B outbound emails and respond only in JSON. ' + prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Gemini request failed', response.status, text);
      return NextResponse.json(
        { error: 'Gemini request failed', status: response.status, details: text.slice(0, 500) },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error('Empty response from Gemini', JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: 'Empty response from Gemini', details: JSON.stringify(data).slice(0, 500) },
        { status: 502 }
      );
    }

    let parsed: { drafts?: Draft[] } = {};
    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (err) {
      console.error('Parse error from Gemini content', err, content);
      return NextResponse.json(
        { error: 'Failed to parse JSON response from Gemini', details: (err as Error).message },
        { status: 502 }
      );
    }

    const drafts = parsed.drafts?.length ? parsed.drafts : fallbackDrafts(leads);
    return NextResponse.json({ drafts });
  } catch (error) {
    return NextResponse.json(
      { error: 'Unexpected error generating drafts', details: (error as Error).message },
      { status: 500 }
    );
  }
}
