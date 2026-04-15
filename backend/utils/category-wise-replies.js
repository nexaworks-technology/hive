/**
 * Category-wise auto-reply generator
 * Generates professional responses based on detected intent
 * Reference: ./reply-system-instructions.md
 * 
 * This system generates responses following the SutraHR Huma Madad email pattern:
 * 1. Warm greeting + context
 * 2. Value proposition overview
 * 3. How it works (step-by-step)
 * 4. Why choose us (benefits)
 * 5. Clear expectations
 * 6. Transparent pricing (if applicable)
 * 7. Social proof / case studies
 * 8. Call to action
 */

// Configuration - Customize these for your service
const MEETING_LINK = process.env.MEETING_LINK || 'https://calendly.com/nexaworks28/15min-meet-with-sutrahr';

const SERVICE_CONFIG = {
  companyName: 'SutraHR',
  serviceName: 'Dedicated Outreach & Recruitment',
  uniqueTechnique: 'Hive Ninja sourcing techniques',
  resultsPromise: 'qualified meetings and placements within a week',
  mainPricingModel: 'Performance-based with monthly retainer',
  caseStudiesLink: 'https://sutrahr.com/case-study',
  brochureLink: 'https://sutrahr.com/brochure',
};

function generateCategoryWiseReply(intent, prospectName, prospectCompany, originalSubject) {
  const firstName = prospectName?.split(' ')[0] || 'Sir/Ma\'am';
  
  switch (intent.toLowerCase()) {
    case 'positive':
      return generatePositiveReply(firstName, prospectCompany, originalSubject);
    
    case 'question':
      return generateQuestionReply(firstName, prospectCompany, originalSubject);
    
    case 'objection':
    case 'not-interested':
      return generateNegativeReply(firstName, prospectCompany, originalSubject);
    
    case 'out-of-office':
      return generateOutOfOfficeReply(firstName, originalSubject);
    
    default:
      return generateDefaultReply(firstName, originalSubject);
  }
}

function generatePositiveReply(firstName, company, originalSubject) {
  return {
    subject: `Re: ${originalSubject} - Let's Jump on a Call!`,
    body: `Hello ${firstName},

Hope you are doing great! Thanks so much for the positive response — we're excited about the opportunity to work with ${company || 'your team'}.

Before we jump on a call, let me share a brief overview of how our service works:

**In our Dedicated Outreach & Recruitment Model (DOM)**, we provide you with a dedicated manager who will handle your campaign end-to-end. With our ${SERVICE_CONFIG.uniqueTechnique}, we are confident of delivering ${SERVICE_CONFIG.resultsPromise}.

**How does this work?**
• You pay a fixed monthly retainer + performance-based fees
• We assign a dedicated manager (minimum 4+ years recruitment experience)
• The manager understands your needs and uses our Hive Ninja techniques
• Access to our premium sourcing database and job portals

**Why choose ${SERVICE_CONFIG.companyName}?**
• Fastest results to save you time and cost
• No long-term contracts — Pay only for results
• No hidden charges or surprise billing
• Dedicated 24/7 support and real-time updates
• Access to proven case studies and client testimonials

**What we need from you:**
• Feedback within 24 hours
• Availability for calls and candidate discussions
• Clear communication of your hiring priorities
• Openness to market-driven recommendations

Our investment starts at a competitive monthly retainer, with performance-based adjustments. You can review our case studies and success stories here:
📊 ${SERVICE_CONFIG.caseStudiesLink}

Let me know which model works best for you, and we can jump on a call anytime.

Meeting link: ${MEETING_LINK}

Thanks and Regards,
${SERVICE_CONFIG.companyName} Team
📱 +91 9222299365
📧 hello@sutrahr.com
🌐 sutrahr.com`
  };
}

function generateQuestionReply(firstName, company, originalSubject) {
  return {
    subject: `Re: ${originalSubject} - Here's what you need to know`,
    body: `Hello ${firstName},

Great question! I appreciate you taking the time to ask. Let me provide a comprehensive overview:

**Our Dedicated Model (DOM) — The short version:**

In our model, we provide you with a dedicated manager who handles your end-to-end hiring/outreach. We've built a strong internal database combined with our unique ${SERVICE_CONFIG.uniqueTechnique}, so we're confident of delivering results fast.

**How it works:**
1. You pay a fixed monthly retainer
2. We assign a dedicated manager (4+ years experience)
3. Manager uses our proprietary sourcing to find qualified candidates/leads
4. Access to premium job portals (LinkedIn, Naukri, AngelList, etc.)

**Your return on investment:**
• Fastest recruitment/outreach in the industry
• No per-hire fees or surprise charges
• Flexible — Pay only for what you get
• 24-hour response time on all feedback

**Investment:** Starting at a competitive monthly retainer with performance adjustments

**Why are we different?**
✓ No long-term contracts
✓ Transparent pricing (see everything upfront)
✓ Real references you can call (not just case studies)
✓ Dedicated resource (not a job board)
✓ Proven results with 50+ successful placements

You can review our success stories and client testimonials here:
📊 ${SERVICE_CONFIG.caseStudiesLink}
📄 Download our brochure: ${SERVICE_CONFIG.brochureLink}

The best way to understand our value is to see it in action. Can we schedule a 15-minute call to walk through your specific situation?

${MEETING_LINK}

Happy to answer any other questions!

Thanks and Regards,
${SERVICE_CONFIG.companyName} Team
📱 +91 9222299365
📧 hello@sutrahr.com
🌐 sutrahr.com`
  };
}

function generateNegativeReply(firstName, company, originalSubject) {
  return {
    subject: `Re: ${originalSubject} - Let me address your concerns`,
    body: `Hello ${firstName},

Thanks for being transparent with me. I completely understand — objections usually fall into one of these categories:

**1. "This seems expensive"**
Here's the reality: Our model is performance-based. You only pay for actual results. Plus, unlike traditional recruiting/outreach, there are no per-placement fees. Most ${company || 'companies like yours'} see ROI within the first month.

**2. "We're not ready right now"**
That's fair. But even if hiring isn't urgent today, building a talent pipeline for ${company || 'your organization'} is smart. Many of our clients start with a retainer-only model (low commitment) and scale up when needs increase.

**3. "We already have a solution"**
We've heard this before. Here's the difference: We're not a job board. We provide a *dedicated, human-centric* approach with real results. 50+ of our clients switched from traditional recruiting because we produce 2-3x faster.

**Why are we different from what you're already using?**
✓ Dedicated resource (not software/algorithm)
✓ Real sourcing (not just posting jobs)
✓ No multi-year contracts
✓ Transparent pricing
✓ References you can call
✓ 24-hour feedback loops

**The best next step:**
Rather than saying "yes" or "no" right now, what if we just had a 15-minute conversation? No sales pitch — just a real discussion about whether there's a fit.

If there's not, no worries. But if there is, you'll be grateful you picked up the phone.

Available here: ${MEETING_LINK}

Thanks for considering us!

Best Regards,
${SERVICE_CONFIG.companyName} Team
📱 +91 9222299365
📧 hello@sutrahr.com
🌐 sutrahr.com`
  };
}

function generateOutOfOfficeReply(firstName, originalSubject) {
  return {
    subject: `Re: ${originalSubject}`,
    body: `Hello ${firstName},

Thanks for getting back to me — I see you're out of office.

No worries at all! I'll follow up when you're back. Hope you have a great trip!

When you return, let's catch up at: ${MEETING_LINK}

Best regards,
${SERVICE_CONFIG.companyName} Team`
  };
}

function generateDefaultReply(firstName, originalSubject) {
  return {
    subject: `Re: ${originalSubject} - Let's Connect`,
    body: `Hello ${firstName},

Thanks so much for your reply! We appreciate you getting back to us.

I'd love to continue the conversation and explore how we can help ${firstName ? 'you' : 'your organization'} achieve your goals.

**Quick recap of what we offer:**
• Dedicated resource management
• Fastest results in the industry
• No hidden fees or long-term contracts
• Transparent, performance-based pricing
• Real case studies and client references

Let's jump on a quick 15-minute call to discuss your specific needs:
${MEETING_LINK}

Looking forward to connecting!

Best Regards,
${SERVICE_CONFIG.companyName} Team
📱 +91 9222299365
📧 hello@sutrahr.com
🌐 sutrahr.com`
  };
}

export {
  generateCategoryWiseReply,
  generatePositiveReply,
  generateQuestionReply,
  generateNegativeReply,
  generateOutOfOfficeReply,
  generateDefaultReply
};
