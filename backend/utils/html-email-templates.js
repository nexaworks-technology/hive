/**
 * HTML Email Templates for SutraHR Outreach
 * Brand color: #FF6243 (Coral Red)
 * Includes personalization with user profile data
 */

import { getProfileForEmailPersonalization } from './user-profile.js';

// Email template styles
const STYLES = {
  container: `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background-color: #f9fafb;
  `,
  emailWrapper: `
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  `,
  header: `
    background: linear-gradient(135deg, #FF6243 0%, #FF4520 100%);
    padding: 32px 24px;
    text-align: center;
  `,
  headerText: `
    color: #ffffff;
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    opacity: 0.9;
  `,
  body: `
    padding: 32px 24px;
    color: #1f2937;
    line-height: 1.6;
  `,
  heading: `
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 16px 0;
    color: #1f2937;
  `,
  paragraph: `
    font-size: 14px;
    margin: 0 0 16px 0;
    color: #4b5563;
  `,
  cta: `
    display: inline-block;
    background-color: #FF6243;
    color: #ffffff;
    padding: 12px 24px;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
    margin: 24px 0;
    border: none;
    cursor: pointer;
  `,
  footer: `
    background-color: #f9fafb;
    border-top: 1px solid #e5e7eb;
    padding: 24px;
    text-align: center;
    font-size: 12px;
    color: #6b7280;
  `,
  signature: `
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
    font-size: 13px;
  `,
  signatureName: `
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 4px;
  `,
  signatureTitle: `
    color: #6b7280;
    margin-bottom: 8px;
  `,
  signatureLink: `
    color: #FF6243;
    text-decoration: none;
  `
};

/**
 * Generate HTML email template
 */
function generateEmailHTML(subject, body, ctaText, ctaLink, recipientName) {
  const profile = getProfileForEmailPersonalization();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f9fafb;">
  <div style="${STYLES.container}">
    <div style="${STYLES.emailWrapper}">
      <!-- Header -->
      <div style="${STYLES.header}">
        <p style="${STYLES.headerText}">SutraHR</p>
      </div>

      <!-- Body -->
      <div style="${STYLES.body}">
        <!-- Greeting -->
        <p style="${STYLES.paragraph}">
          Hi ${recipientName},
        </p>

        <!-- Content -->
        ${body}

        <!-- CTA Button -->
        ${ctaLink ? `
          <div>
            <a href="${ctaLink}" style="${STYLES.cta}">
              ${ctaText}
            </a>
            <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">
              Or copy & paste this link: <span style="word-break: break-all;">${ctaLink}</span>
            </p>
          </div>
        ` : ''}

        <!-- Signature -->
        <div style="${STYLES.signature}">
          <div style="${STYLES.signatureName}">${profile.senderName}</div>
          <div style="${STYLES.signatureTitle}">${profile.senderTitle}${profile.companyName ? ` at ${profile.companyName}` : ''}</div>
          ${profile.senderEmail ? `<div><a href="mailto:${profile.senderEmail}" style="${STYLES.signatureLink}">${profile.senderEmail}</a></div>` : ''}
          ${profile.senderPhone ? `<div><a href="tel:${profile.senderPhone}" style="${STYLES.signatureLink}">${profile.senderPhone}</a></div>` : ''}
        </div>
      </div>

      <!-- Footer -->
      <div style="${STYLES.footer}">
        <p style="margin: 0; margin-bottom: 8px;">
          © 2026 SutraHR. All rights reserved.
        </p>
        <p style="margin: 0; color: #9ca3af;">
          You received this because you were identified as a potential fit for our services.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Tier 1 Email - Day 1 (CTOs/VPs of Engineering)
 * Focus: Speed, vetting quality, efficiency
 */
export function generateTier1Email_Day1(recipientName, companyName) {
  const profile = getProfileForEmailPersonalization();
  
  const body = `
    <p style="${STYLES.paragraph}">
      Quick question: How much of <strong>${companyName}</strong>'s recruiting cycles are taken up by reviewing mediocre resumes and calls with unvetted candidates?
    </p>

    <p style="${STYLES.paragraph}">
      ${profile.companyName || 'SutraHR'}'s talent sourcing model focuses on cutting that time by <strong>3 weeks on average</strong> through pre-vetted, curated candidate pipelines.
    </p>

    <p style="${STYLES.paragraph}">
      Since your team likely needs developers ASAP, would a 2-week faster hiring cycle be valuable?
    </p>
  `;

  return generateEmailHTML(
    `Quick question about your dev hires - ${recipientName}`,
    body,
    'Book your slot',
    profile.calendlyLink,
    recipientName
  );
}

/**
 * Tier 2 Email - Day 1 (Founders/CEOs)
 * Focus: Financial arbitrage, payroll savings, risk mitigation
 */
export function generateTier2Email_Day1(recipientName, companyName) {
  const profile = getProfileForEmailPersonalization();
  
  const body = `
    <p style="${STYLES.paragraph}">
      Quick thought for ${companyName}: Most founders we talk to spend 40-60% of their quarterly budget on full-time payroll. What if you could cut that by 40% while actually improving quality?
    </p>

    <p style="${STYLES.paragraph}">
      ${profile.companyName || 'SutraHR'} helps startups access B-tier talent at a ~60% payroll discount. No long-term commitments. Zero hiring risk.
    </p>

    <p style="${STYLES.paragraph}">
      Worth a quick conversation to see if it makes sense for your hiring roadmap?
    </p>
  `;

  return generateEmailHTML(
    `${recipientName} - idea on ${companyName}'s payroll`,
    body,
    'Book your slot',
    profile.calendlyLink,
    recipientName
  );
}

/**
 * Tier 3 Email - Day 1 (TA/Recruiting Leaders)
 * Focus: Team extension, volume hiring, efficiency
 */
export function generateTier3Email_Day1(recipientName, companyName) {
  const profile = getProfileForEmailPersonalization();
  
  const body = `
    <p style="${STYLES.paragraph}">
      ${recipientName}, how many open reqs are sitting unfilled because your sourcing team is drowning in resume reviews?
    </p>

    <p style="${STYLES.paragraph}">
      ${profile.companyName || 'SutraHR'} acts as an extension of your recruiting team—we handle sourcing, screening, and delivery of qualified candidates so your team hits MoM targets without overextending.
    </p>

    <p style="${STYLES.paragraph}">
      Would cutting your time-to-hire by 50% change your Q2 plans?
    </p>
  `;

  return generateEmailHTML(
    `Idea for speedier hiring at ${companyName}, ${recipientName}`,
    body,
    'Book your slot',
    profile.calendlyLink,
    recipientName
  );
}

/**
 * Follow-up Email Template - Day 4
 * Light touch, social proof
 */
export function generateFollowUpEmail(recipientName, companySeason, touchNumber = 2) {
  const profile = getProfileForEmailPersonalization();
  
  const body = `
    <p style="${STYLES.paragraph}">
      Quick follow-up on my last note. I know your inbox is packed—just wanted to make sure it didn't get buried.
    </p>

    <p style="${STYLES.paragraph}">
      <strong>Real quick win:</strong> Teams we've worked with recently got 40% faster hiring cycles. Thought it might be worth seeing if we can do the same for ${companySeason}.
    </p>

    <p style="${STYLES.paragraph}">
      Only have 15 minutes? Let's chat about what worked for similar companies.
    </p>
  `;

  return generateEmailHTML(
    `Following up - ${recipientName}`,
    body,
    'Book your slot',
    profile.calendlyLink,
    recipientName
  );
}

/**
 * Objection Handling Email - Tailored responses
 */
export function generateObjectionResponseEmail(recipientName, objectionType, companyName) {
  const profile = getProfileForEmailPersonalization();
  
  let body = '';

  switch (objectionType) {
    case 'not_interested':
      body = `
        <p style="${STYLES.paragraph}">
          Got it—not the right time. No worries. Just wanted to say: when you're ready to explore faster hiring without blowing your budget, I'll be here.
        </p>
        <p style="${STYLES.paragraph}">
          One quick thought though—what's your biggest bottleneck with hiring in Q2? Might help us align better down the road.
        </p>
      `;
      break;

    case 'budget_tight':
      body = `
        <p style="${STYLES.paragraph}">
          Budget constraints—totally get it. Here's the thing: we're built *because* budgets are tight.
        </p>
        <p style="${STYLES.paragraph}">
          Instead of adding headcount, you get a curated pipeline at 40-60% lower cost. Talk when the budget opens up?
        </p>
      `;
      break;

    case 'internal_hiring':
      body = `
        <p style="${STYLES.paragraph}">
          Smart move building in-house. We work well *alongside* internal teams—essentially giving your team a boost for high-volume periods.
        </p>
        <p style="${STYLES.paragraph}">
          When you hit those crunch periods and internal sourcing can't keep up, remember us. We specialize in exactly those scenarios.
        </p>
      `;
      break;

    default:
      body = `
        <p style="${STYLES.paragraph}">
          Thanks for getting back to me. I appreciate the feedback.
        </p>
        <p style="${STYLES.paragraph}">
          If anything changes or you want to explore further, I'm just an email away.
        </p>
      `;
  }

  return generateEmailHTML(
    `Re: ${recipientName}`,
    body,
    'Book your slot',
    profile.calendlyLink,
    recipientName
  );
}

export { generateEmailHTML };
