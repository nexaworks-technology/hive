/**
 * Category-wise auto-reply generator
 * Generates different responses based on detected intent
 */

// Placeholder for meeting link - you can configure this
const MEETING_LINK = process.env.MEETING_LINK || 'https://calendly.com/your-link';

function generateCategoryWiseReply(intent, prospectName, prospectCompany, originalSubject) {
  const firstName = prospectName?.split(' ')[0] || 'there';
  
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
    subject: `Re: ${originalSubject}`,
    body: `Hi ${firstName},

Thanks so much for the positive response! We're excited about the opportunity to work together with ${company || 'your team'}.

I'd love to discuss this further and understand your needs better. Would you be available for a quick call?

Meeting link: ${MEETING_LINK}

Looking forward to connecting!

Best regards`
  };
}

function generateQuestionReply(firstName, company, originalSubject) {
  return {
    subject: `Re: ${originalSubject}`,
    body: `Hi ${firstName},

Great question! I appreciate you taking the time to ask.

I'd be happy to dive deeper into the details and address all your concerns. Let's schedule a quick call so I can walk you through everything and make sure I understand your specific needs for ${company || 'your organization'}.

Here's a link to book a time: ${MEETING_LINK}

Looking forward to our conversation!

Best regards`
  };
}

function generateNegativeReply(firstName, company, originalSubject) {
  return {
    subject: `Re: ${originalSubject} - Happy to help clarify`,
    body: `Hi ${firstName},

Thanks for being transparent with me. I completely understand – we get it all the time.

Before we close the door, would you mind sharing what specific concerns you have? We've worked with similar companies at ${company || 'organizations like yours'} and have solved some unexpected problems.

If you're open to it, I'd love to have a quick conversation to see if there's a fit. No pressure at all.

Meeting link (only if interested): ${MEETING_LINK}

Either way, I appreciate your time!

Best regards`
  };
}

function generateOutOfOfficeReply(firstName, originalSubject) {
  return {
    subject: `Re: ${originalSubject}`,
    body: `Hi ${firstName},

Thanks for getting back to me. I see you're out of office.

No worries – I'll reconnect when you're back. Safe travels!

Best regards`
  };
}

function generateDefaultReply(firstName, originalSubject) {
  return {
    subject: `Re: ${originalSubject}`,
    body: `Hi ${firstName},

Thanks so much for your reply! We appreciate you getting back to us.

I'd love to continue the conversation and explore how we can work together.

Meeting link: ${MEETING_LINK}

Cheers!

Best regards`
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
