import express from 'express';
import { chromium } from 'playwright';
import { supabase } from '../supabase-client.js';

const router = express.Router();

const SERP_API_URL = 'https://serpapi.com/search.json';
const SERPAPI_KEY = process.env.SERPAPI_KEY;
const HUNTER_API_KEY = process.env.HUNTER_API_KEY;

async function searchCompanies(query) {
  if (!SERPAPI_KEY) {
    throw new Error('SERPAPI_KEY is missing; add it to use domain search');
  }

  const params = new URLSearchParams({
    engine: 'google',
    q: query,
    api_key: SERPAPI_KEY,
    num: '5',
  });

  const res = await fetch(`${SERP_API_URL}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SerpAPI failed: ${res.status} ${text}`);
  }
  const payload = await res.json();
  const results = payload.organic_results || [];

  return results
    .map((r) => r.link)
    .filter(Boolean)
    .map((link) => {
      try {
        const url = new URL(link);
        return url.hostname.replace(/^www\./, '');
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function fetchHunterLead(domain) {
  if (!HUNTER_API_KEY) {
    throw new Error('HUNTER_API_KEY is missing; add it to use email enrichment');
  }

  const params = new URLSearchParams({
    domain,
    api_key: HUNTER_API_KEY,
    limit: '50', // Get up to 50 contacts per domain
  });

  const res = await fetch(`https://api.hunter.io/v2/domain-search?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hunter failed for ${domain}: ${res.status} ${text}`);
  }
  const payload = await res.json();
  const emails = payload?.data?.emails || [];
  if (!emails.length) return [];

  // Return all contacts from this domain, not just the first one
  return emails.map(email => ({
    domain,
    email: email.value,
    name: email.first_name && email.last_name ? `${email.first_name} ${email.last_name}` : email.first_name || 'Lead',
    position: email.position || 'Unknown',
    linkedin: email.linkedin || '',
  }));
}

async function fetchMetaFromSite(domain, browser) {
  try {
    const page = await browser.newPage();
    await page.goto(`https://${domain}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    await page.close();
    return title;
  } catch (err) {
    console.warn(`Failed to fetch meta for ${domain}:`, err.message);
    return null;
  }
}

router.post('/', async (req, res) => {
  const { targetAudience, additionalContext, campaignId, limit = 5 } = req.body || {};

  if (!targetAudience) {
    return res.status(400).json({ error: 'targetAudience is required' });
  }

  const query = `${targetAudience} ${additionalContext || ''} company website`;

  let domains;
  try {
    domains = await searchCompanies(query);
  } catch (err) {
    console.error('[scrape-leads] domain search error', err);
    return res.status(500).json({ error: err.message || 'Domain search failed' });
  }

  const browser = await chromium.launch({ headless: true });
  const leads = [];

  try {
    for (const domain of domains.slice(0, limit)) {
      let hunterLeads = [];
      try {
        hunterLeads = await fetchHunterLead(domain);
      } catch (err) {
        console.warn(`[scrape-leads] hunter error for ${domain}`, err.message);
      }

      let siteTitle = null;
      try {
        siteTitle = await fetchMetaFromSite(domain, browser);
      } catch (err) {
        console.warn(`[scrape-leads] playwright meta error for ${domain}`, err.message);
      }

      // Add all contacts from this domain as separate leads
      if (hunterLeads && Array.isArray(hunterLeads)) {
        hunterLeads.forEach((hunterLead, idx) => {
          leads.push({
            id: `lead-${domain}-${idx}-${Date.now()}`,
            name: hunterLead.name,
            title: hunterLead.position,
            company: siteTitle || domain,
            email: hunterLead.email,
            linkedin: hunterLead.linkedin || `https://www.google.com/search?q=${encodeURIComponent(hunterLead.name + ' ' + domain)}`,
            emailSent: false,
            replied: false,
            followupCount: 0,
            summary: `Lead from ${domain}`,
            talkingPoints: [],
          });
        });
      }
    }
  } finally {
    await browser.close();
  }

  // Persist into Supabase if campaignId is provided.
  if (campaignId && leads.length) {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('campaigns')
        .select('payload')
        .eq('id', campaignId)
        .single();

      if (fetchError) throw fetchError;

      const mergedPayload = {
        ...(existing?.payload || {}),
        leads,
      };

      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ payload: mergedPayload, stage: 'stage-3', status: 'scraped' })
        .eq('id', campaignId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('[scrape-leads] supabase persist error', err);
      // Continue; we still return leads to the client.
    }
  }

  return res.json({ leads });
});

// Export functions for reuse in other modules
export { searchCompanies, fetchHunterLead, fetchMetaFromSite };

export default router;
