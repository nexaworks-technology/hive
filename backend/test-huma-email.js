import dotenv from 'dotenv';
dotenv.config();

import { sendHumaEmail } from './utils/huma-gmail.js';

async function testSendEmail() {
  try {
    console.log('🧪 Testing Huma email send...');
    console.log(`📧 Sender: ${process.env.HUMA_EMAIL}`);
    
    // Send test email to yourself (change this to your email if needed)
    const testEmail = 'pavan@nexaworks.tech';
    
    const result = await sendHumaEmail({
      to: testEmail,
      subject: '🧪 Test Email from Huma - Google Workspace Integration',
      body: `Hi Pavan,

This is a test email sent from Huma's Google Workspace account using the new Service Account integration.

✅ If you received this, the integration is working correctly!

Test Details:
- Sender: ${process.env.HUMA_EMAIL}
- Recipient: ${testEmail}
- Method: Google Service Account + Gmail API
- Timestamp: ${new Date().toISOString()}

Best regards,
Huma Email Integration System`
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.id);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testSendEmail();
