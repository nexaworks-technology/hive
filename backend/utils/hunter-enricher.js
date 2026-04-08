/**
 * Hunter Enricher
 * Fallback enrichment from Hunter.io API when LinkedIn data unavailable
 * Extracts position and company context for personalization
 */

/**
 * Enrich prospect data from Hunter API results
 * @param {string} email - Prospect email address
 * @param {string} domain - Company domain (for Hunter calls)
 * @param {Object} hunterData - Data from Hunter.io API (if already fetched)
 * @returns {Promise<Object>} Enriched data object with position and company context
 */
export async function enrichFromHunter(email, domain, hunterData = null) {
  try {
    if (!email || !domain) {
      return null;
    }

    let data = hunterData;

    // If no pre-fetched data, we can use it from the scraping process
    // This function expects enrichment data already available from scraping
    if (!data) {
      return null; // Server already scraped this, data should be passed in
    }

    // Extract position from Hunter data
    const position = data.position || data.title || '';
    const company = data.company || domain;

    if (!position) {
      return null; // Not enough data to enrich
    }

    // Create achievment statement from position and company
    let achievementStatement = null;
    
    // Common executive/leadership keywords
    const executiveKeywords = ['ceo', 'cto', 'cfo', 'vp', 'vice president', 'founder', 'head of', 'director', 'manager'];
    const isExecutive = executiveKeywords.some(kw => position.toLowerCase().includes(kw));

    if (isExecutive) {
      achievementStatement = `leading as ${position} at ${company}`;
    } else {
      achievementStatement = `working as ${position} at ${company}`;
    }

    return {
      prospectHeadline: position,
      prospectAchievement: achievementStatement,
      recentJobChange: null,
      isRecentChange: false,
      enrichedAt: new Date().toISOString(),
      source: 'hunter'
    };
  } catch (error) {
    console.error('[hunter-enricher] Error enriching from Hunter:', error.message);
    return null;
  }
}

/**
 * Create default enrichment when no external data available
 * Uses basic prospect info to create generic personalization
 */
export async function enrichDefault(prospectName, prospectTitle, prospectCompany) {
  try {
    if (!prospectName || !prospectTitle || !prospectCompany) {
      return null;
    }

    const achievementStatement = `working as ${prospectTitle} at ${prospectCompany}`;

    return {
      prospectHeadline: prospectTitle,
      prospectAchievement: achievementStatement,
      recentJobChange: null,
      isRecentChange: false,
      enrichedAt: new Date().toISOString(),
      source: 'default'
    };
  } catch (error) {
    console.error('[hunter-enricher] Error creating default enrichment:', error.message);
    return null;
  }
}

export default { enrichFromHunter, enrichDefault };
