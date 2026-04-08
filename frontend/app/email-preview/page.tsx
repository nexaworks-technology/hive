'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EmailPreview() {
  const [selectedTier, setSelectedTier] = useState<'tier1' | 'tier2' | 'tier3'>('tier1');
  const [selectedDay, setSelectedDay] = useState<1 | 3 | 7 | 14>(1);

  // Tier 1 Email HTML
  const tier1Day1 = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FF6243 0%, #FF7F5C 100%); color: white; padding: 40px 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 15px; }
        .header-tagline { font-size: 14px; opacity: 0.9; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; color: #333; margin-bottom: 20px; font-weight: 500; }
        .body-text { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 15px; }
        .highlight { color: #FF6243; font-weight: 600; }
        .cta-button { background: linear-gradient(135deg, #FF6243 0%, #FF7F5C 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; font-weight: 600; transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
        .footer { background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eee; font-size: 12px; color: #999; }
        .footer-name { color: #333; font-weight: 600; margin-bottom: 5px; }
        .divider { height: 1px; background-color: #eee; margin: 20px 0; }
        strong { color: #333; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">SutraHR</div>
          <div class="header-tagline">Pre-vetted Talent Pipeline</div>
        </div>
        
        <div class="content">
          <div class="greeting">Hey Sarah,</div>
          
          <div class="body-text">
            Quick question: How much of <strong>TechCorp's</strong> recruiting cycles are taken up by reviewing mediocre resumes and calls with unvetted candidates?
          </div>
          
          <div class="body-text">
            SutraHR's talent sourcing model focuses on cutting that time by <strong>3 weeks on average</strong> through pre-vetted, curated candidate pipelines.
          </div>
          
          <div class="body-text">
            We've helped 40+ engineering teams (Stripe, GitLab, Notion, etc.) cut their time-to-hire while improving hire quality. Most report <span class="highlight">higher retention rates</span> and <span class="highlight">better team fit</span>.
          </div>
          
          <div class="body-text">
            Worth a 20-min call to explore? I can show you exactly how we identify and vet top engineering talent before you even see them.
          </div>
          
          <a href="https://calendly.com/pavan" class="cta-button">Book your call</a>
          
          <div class="divider"></div>
          
          <div class="body-text" style="margin-top: 0; font-size: 13px; color: #777;">
            Best,<br>
            <strong style="color: #333;">Pavan Kumar</strong><br>
            CEO, SutraHR<br>
            📧 pavan@sutrahr.com<br>
            📱 +1-555-123-4567
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-name">SutraHR</div>
          <div>Sales & Talent Solutions</div>
          <div style="margin-top: 10px;">© 2026 SutraHR. All rights reserved.</div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Tier 2 Email HTML
  const tier2Day1 = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FF6243 0%, #FF7F5C 100%); color: white; padding: 40px 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 15px; }
        .header-tagline { font-size: 14px; opacity: 0.9; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; color: #333; margin-bottom: 20px; font-weight: 500; }
        .body-text { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 15px; }
        .highlight { color: #FF6243; font-weight: 600; }
        .cta-button { background: linear-gradient(135deg, #FF6243 0%, #FF7F5C 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; font-weight: 600; transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
        .footer { background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eee; font-size: 12px; color: #999; }
        .footer-name { color: #333; font-weight: 600; margin-bottom: 5px; }
        .divider { height: 1px; background-color: #eee; margin: 20px 0; }
        strong { color: #333; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">SutraHR</div>
          <div class="header-tagline">Zero-Risk Talent Solutions</div>
        </div>
        
        <div class="content">
          <div class="greeting">Hey Alex,</div>
          
          <div class="body-text">
            Payroll is usually the biggest expense line for growing companies. What if you could cut that by <span class="highlight">60% while maintaining quality</span>?
          </div>
          
          <div class="body-text">
            That's exactly what SutraHR does for founders & CEOs. We take the entire recruiting & onboarding burden off your plate, delivering pre-screened, culturally-aligned talent at a fraction of traditional costs.
          </div>
          
          <div class="body-text">
            <strong>Zero risk:</strong> We back every placement with a 60-day replacement guarantee. If a hire doesn't work out, we replace them free.
          </div>
          
          <div class="body-text">
            Most founders see ROI within 90 days. Want to see how? I can walk you through the numbers in 15 minutes.
          </div>
          
          <a href="https://calendly.com/pavan" class="cta-button">Book your strategy call</a>
          
          <div class="divider"></div>
          
          <div class="body-text" style="margin-top: 0; font-size: 13px; color: #777;">
            Best,<br>
            <strong style="color: #333;">Pavan Kumar</strong><br>
            CEO, SutraHR<br>
            📧 pavan@sutrahr.com<br>
            📱 +1-555-123-4567
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-name">SutraHR</div>
          <div>Sales & Talent Solutions</div>
          <div style="margin-top: 10px;">© 2026 SutraHR. All rights reserved.</div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Tier 3 Email HTML
  const tier3Day1 = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FF6243 0%, #FF7F5C 100%); color: white; padding: 40px 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 15px; }
        .header-tagline { font-size: 14px; opacity: 0.9; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; color: #333; margin-bottom: 20px; font-weight: 500; }
        .body-text { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 15px; }
        .highlight { color: #FF6243; font-weight: 600; }
        .cta-button { background: linear-gradient(135deg, #FF6243 0%, #FF7F5C 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; font-weight: 600; transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
        .footer { background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eee; font-size: 12px; color: #999; }
        .footer-name { color: #333; font-weight: 600; margin-bottom: 5px; }
        .divider { height: 1px; background-color: #eee; margin: 20px 0; }
        strong { color: #333; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">SutraHR</div>
          <div class="header-tagline">Your Recruiting Team Extension</div>
        </div>
        
        <div class="content">
          <div class="greeting">Hey Morgan,</div>
          
          <div class="body-text">
            Recruiting is taking up way too much of your team's time. You're sifting through hundreds of resumes, scheduling interviews, doing background checks... when what you really need is <span class="highlight">a seamless pipeline of quality candidates</span>.
          </div>
          
          <div class="body-text">
            That's where SutraHR comes in. We act as your dedicated recruiting extension, handling sourcing, screening, and initial interviews so your team can focus on final-round decisions.
          </div>
          
          <div class="body-text">
            <strong>Result:</strong> Most teams cut their time-to-hire by 50-60% and stop feeling behind on headcount goals.
          </div>
          
          <div class="body-text">
            Let me show you how this works. Grab 20 minutes and I'll walk you through our process and what it looks like for your team.
          </div>
          
          <a href="https://calendly.com/pavan" class="cta-button">Schedule a walkthrough</a>
          
          <div class="divider"></div>
          
          <div class="body-text" style="margin-top: 0; font-size: 13px; color: #777;">
            Best,<br>
            <strong style="color: #333;">Pavan Kumar</strong><br>
            CEO, SutraHR<br>
            📧 pavan@sutrahr.com<br>
            📱 +1-555-123-4567
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-name">SutraHR</div>
          <div>Sales & Talent Solutions</div>
          <div style="margin-top: 10px;">© 2026 SutraHR. All rights reserved.</div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Follow-up Email
  const followUpDay3 = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FF6243 0%, #FF7F5C 100%); color: white; padding: 40px 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 15px; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 16px; color: #333; margin-bottom: 20px; font-weight: 500; }
        .body-text { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 15px; }
        .highlight { color: #FF6243; font-weight: 600; }
        .cta-button { background: linear-gradient(135deg, #FF6243 0%, #FF7F5C 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; font-weight: 600; }
        .footer { background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eee; font-size: 12px; color: #999; }
        .divider { height: 1px; background-color: #eee; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">SutraHR</div>
        </div>
        
        <div class="content">
          <div class="greeting">Quick follow-up, Sarah</div>
          
          <div class="body-text">
            Didn't hear back on my last message - wanted to check in before I clean up my list.
          </div>
          
          <div class="body-text">
            In case it got buried, the core idea is simple: <span class="highlight">we find and vet top talent for you</span>, so your team never stalls on headcount again.
          </div>
          
          <div class="body-text">
            Even if you're not actively hiring right now, it's worth a quick conversation to see if we could help future hiring cycles move faster.
          </div>
          
          <a href="https://calendly.com/pavan" class="cta-button">Find a time that works</a>
          
          <div class="divider"></div>
          
          <div class="body-text" style="margin-top: 0; font-size: 13px; color: #777;">
            Pavan<br>
            🚀 SutraHR
          </div>
        </div>
        
        <div class="footer">
          <div style="margin-top: 10px;">© 2026 SutraHR. All rights reserved.</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const getEmailHTML = () => {
    if (selectedDay === 1) {
      if (selectedTier === 'tier1') return tier1Day1;
      if (selectedTier === 'tier2') return tier2Day1;
      if (selectedTier === 'tier3') return tier3Day1;
    }
    return followUpDay3;
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">HTML Email Preview</h1>
          <p className="text-slate-600">Beautiful personalized cold email templates with SutraHR branding</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">Email Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-3">
                    Prospect Tier
                  </label>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedTier('tier1')}
                      className={`w-full p-3 rounded-lg text-left text-sm font-medium transition ${
                        selectedTier === 'tier1'
                          ? 'bg-orange-100 text-orange-900 border-2 border-orange-500'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      ⚙️ Tier 1: CTO/VP Eng
                    </button>
                    <button
                      onClick={() => setSelectedTier('tier2')}
                      className={`w-full p-3 rounded-lg text-left text-sm font-medium transition ${
                        selectedTier === 'tier2'
                          ? 'bg-orange-100 text-orange-900 border-2 border-orange-500'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      🚀 Tier 2: Founder/CEO
                    </button>
                    <button
                      onClick={() => setSelectedTier('tier3')}
                      className={`w-full p-3 rounded-lg text-left text-sm font-medium transition ${
                        selectedTier === 'tier3'
                          ? 'bg-orange-100 text-orange-900 border-2 border-orange-500'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      👥 Tier 3: TA Leader
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-3">
                    Email Day
                  </label>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedDay(1)}
                      className={`w-full p-3 rounded-lg text-left text-sm font-medium transition ${
                        selectedDay === 1
                          ? 'bg-orange-100 text-orange-900 border-2 border-orange-500'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      📧 Day 1: Initial
                    </button>
                    <button
                      onClick={() => setSelectedDay(3)}
                      className={`w-full p-3 rounded-lg text-left text-sm font-medium transition ${
                        selectedDay === 3
                          ? 'bg-orange-100 text-orange-900 border-2 border-orange-500'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      📧 Day 3: Follow-up
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-slate-500">
                    Brand Color: <span className="text-orange-500 font-bold">#FF6243</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Mobile responsive & email-client compatible
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Preview */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>
                  {selectedTier === 'tier1' && 'CTO/VP Engineering - Speed & Quality pitch'}
                  {selectedTier === 'tier2' && 'Founder/CEO - Cost Savings pitch'}
                  {selectedTier === 'tier3' && 'TA Leader - Team Extension pitch'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-slate-200 p-4 min-h-[600px] overflow-auto">
                  <iframe
                    srcDoc={getEmailHTML()}
                    className="w-full bg-white rounded-lg shadow-lg"
                    style={{ height: '700px', border: 'none' }}
                    title="Email preview"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6 bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <p className="text-sm text-blue-900">
                  <strong>✅ Ready to Send:</strong> These are production-ready HTML emails. Paste the HTML above directly into your email client or use the backend `/outbound/send-prospecting-email` endpoint.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
