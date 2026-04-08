/**
 * Enhanced professional email template with social proof
 */

export function getSimpleEmailTemplate(prospectName, prospectCompany) {
  const name = prospectName || 'there';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      color: #2c3e50; 
      line-height: 1.6; 
      background-color: #f8f9fa;
    }
    .wrapper { background-color: #f8f9fa; padding: 20px 0; }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    /* HEADER */
    .header { 
      background: linear-gradient(135deg, #FF6243 0%, #FF7F5C 100%);
      color: white; 
      padding: 40px 30px;
      text-align: center; 
    }
    .header h1 { 
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .header p { 
      font-size: 14px;
      opacity: 0.95;
      font-weight: 300;
    }
    
    /* CONTENT SECTION */
    .section { padding: 35px 30px; border-bottom: 1px solid #f0f0f0; }
    .section:last-of-type { border-bottom: none; }
    
    .section-title { 
      font-size: 16px; 
      font-weight: 700; 
      color: #2c3e50; 
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 12px;
      color: #7f8c8d;
    }
    
    .intro-text { 
      font-size: 15px;
      line-height: 1.7;
      color: #34495e;
      margin-bottom: 15px;
    }
    
    .intro-text strong { 
      color: #FF6243;
      font-weight: 600;
    }
    
    /* FEATURES LIST */
    .features { list-style: none; margin: 25px 0; }
    .features li { 
      padding: 12px 0;
      padding-left: 30px;
      position: relative;
      font-size: 14px;
      color: #34495e;
      border-left: 2px solid #FF6243;
      margin-left: 8px;
    }
    .features li:before {
      content: '✓';
      position: absolute;
      left: 8px;
      color: #FF6243;
      font-weight: 700;
      font-size: 16px;
    }
    
    /* SOCIAL PROOF */
    .social-proof {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 20px;
      margin: 25px 0;
    }
    
    .testimonial {
      margin-bottom: 18px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .testimonial:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
    
    .testimonial-text {
      font-size: 13px;
      color: #555;
      font-style: italic;
      margin-bottom: 10px;
      line-height: 1.6;
    }
    
    .testimonial-author {
      font-size: 12px;
      color: #888;
      font-weight: 500;
    }
    
    .testimonial-author strong {
      color: #2c3e50;
    }
    
    /* STATS */
    .stats-grid {
      display: table;
      width: 100%;
      margin: 25px 0;
    }
    
    .stat-box {
      display: table-cell;
      text-align: center;
      padding: 20px;
      border-right: 1px solid #f0f0f0;
    }
    
    .stat-box:last-child {
      border-right: none;
    }
    
    .stat-number {
      font-size: 24px;
      font-weight: 700;
      color: #FF6243;
      display: block;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* CTA BUTTON */
    .cta-section { 
      text-align: center; 
      padding: 30px;
      background: linear-gradient(135deg, #FF6243 0%, #FF7F5C 100%);
    }
    
    .cta-button {
      display: inline-block;
      background: white;
      color: #FF6243;
      padding: 14px 40px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 700;
      font-size: 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }
    
    .cta-button:hover {
      box-shadow: 0 6px 16px rgba(0,0,0,0.15);
    }
    
    .cta-text {
      color: white;
      margin-top: 12px;
      font-size: 13px;
    }
    
    /* FOOTER */
    .footer { 
      background: #f8f9fa;
      padding: 25px 30px;
      text-align: center;
      border-top: 1px solid #f0f0f0;
    }
    
    .footer p { 
      font-size: 13px;
      color: #7f8c8d;
      margin-bottom: 8px;
    }
    
    .footer-name {
      color: #2c3e50;
      font-weight: 600;
    }
    
    .footer-links { 
      margin-top: 12px; 
      font-size: 11px;
    }
    
    .footer-links a { 
      color: #3498db; 
      text-decoration: none;
      margin: 0 8px;
    }
    
    .footer-links a:hover {
      text-decoration: underline;
    }
    
    /* RESPONSIVE */
    @media (max-width: 600px) {
      .container { border-radius: 0; }
      .section { padding: 25px 20px; }
      .header { padding: 30px 20px; }
      .header h1 { font-size: 24px; }
      .stat-box { display: block; border-right: none; border-bottom: 1px solid #f0f0f0; padding: 15px; }
      .stat-box:last-child { border-bottom: none; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      
      <!-- HEADER -->
      <div class="header">
        <h1>Hi ${name} 👋</h1>
        <p>We're helping ${prospectCompany} scale hiring</p>
      </div>
      
      <!-- INTRO SECTION -->
      <div class="section">
        <p class="intro-text">
          We help teams like <strong>${prospectCompany}</strong> find and hire top talent 40% faster with AI-powered screening and streamlined workflows.
        </p>
      </div>
      
      <!-- FEATURES SECTION -->
      <div class="section">
        <div class="section-title">Why Teams Choose Us</div>
        <ul class="features">
          <li><strong>AI-Powered Screening:</strong> Automatically rank candidates by fit and culture match</li>
          <li><strong>Background Checks:</strong> Instant verification within 24 hours</li>
          <li><strong>Interview Scheduling:</strong> Auto-sync with your calendar, zero back-and-forth</li>
          <li><strong>Analytics Dashboard:</strong> Track hiring metrics in real-time</li>
        </ul>
      </div>
      
      <!-- STATS SECTION -->
      <div class="section">
        <div class="stats-grid">
          <div class="stat-box">
            <span class="stat-number">5,200+</span>
            <span class="stat-label">Companies Hiring</span>
          </div>
          <div class="stat-box">
            <span class="stat-number">98%</span>
            <span class="stat-label">Satisfaction Rate</span>
          </div>
          <div class="stat-box">
            <span class="stat-number">40%</span>
            <span class="stat-label">Time Saved</span>
          </div>
        </div>
      </div>
      
      <!-- SOCIAL PROOF SECTION -->
      <div class="section">
        <div class="section-title">What Hiring Leaders Say</div>
        <div class="social-proof">
          <div class="testimonial">
            <div class="testimonial-text">"Cut our time-to-hire from 45 days to 18 days. Their AI screening is a game-changer."</div>
            <div class="testimonial-author"><strong>Sarah Chen</strong> - Director of Talent, TechCorp</div>
          </div>
          <div class="testimonial">
            <div class="testimonial-text">"Finally, a tool that actually understands our hiring needs. Highly recommend."</div>
            <div class="testimonial-author"><strong>Mike Rodriguez</strong> - HR Manager, StartupXYZ</div>
          </div>
        </div>
      </div>
      
      <!-- CTA SECTION -->
      <div class="cta-section">
        <a href="https://calendly.com/pavan" class="cta-button">Schedule a 15-Min Demo</a>
        <p class="cta-text">See how we can streamline your hiring process</p>
      </div>
      
      <!-- FOOTER -->
      <div class="footer">
        <p><span class="footer-name">Pavan</span></p>
        <p>Hiring Optimization Platform</p>
        <div class="footer-links">
          <a href="#">Website</a>
          <a href="#">LinkedIn</a>
          <a href="#">Help Center</a>
          <a href="#">Unsubscribe</a>
        </div>
      </div>
      
    </div>
  </div>
</body>
</html>
  `.trim();
}

export default { getSimpleEmailTemplate };
