'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useSessionContext } from '@/components/auth-provider';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Generate follow-up email templates
 */
function generateFollowUpEmail(prospect: any, userProfile: UserProfile | Record<string, any>, dayNumber: number): { html: string; subject: string; body: string } {
  const name = prospect.name || 'there';
  const company = prospect.company || 'your company';
  const profile = userProfile as UserProfile;
  
  let followUpMessage = '';
  let followUpBody = '';
  
  if (dayNumber === 2) {
    followUpMessage = `Just checking back on my previous message - I think there's a real opportunity here for ${company}.`;
    followUpBody = `Hi ${name},\n\nJust following up on my message from a couple days ago.\n\nI know you're busy, but I genuinely think we could help ${company} with your hiring velocity.\n\nWould a 15-min call work this week?\n\nBest,\n${userProfile.name}`;
  } else if (dayNumber === 4) {
    followUpMessage = `One more thing I wanted to highlight about working with us...`;
    followUpBody = `Hi ${name},\n\nOne final follow-up - I wanted to share something specific about how we've helped companies similar to ${company}.\n\nOur last 10 placements: Average 18 days from job opening to hired and onboarded.\n\nWould you be open to a quick chat to see if that timeline works for you?\n\nBest,\n${userProfile.name}`;
  } else {
    followUpMessage = `Let's connect - I think we should talk about this opportunity.`;
    followUpBody = `Hi ${name},\n\nI've tried reaching out a couple times, and I get it if timing isn't right now.\n\nBut ${company} sounds like you're in growth mode, and we're literally built to help with fast, quality hiring.\n\nIf you're open to it, I'd love a brief conversation. If not, no worries - keep us in mind when hiring does become a priority.\n\nBest,\n${userProfile.name}`;
  }
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email from ${profile.companyName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FF6243 0%, #FF7F5C 100%); color: white; padding: 30px; text-align: center; }
        .logo { font-size: 20px; font-weight: bold; }
        .header-tagline { font-size: 12px; opacity: 0.9; margin-top: 5px; }
        .content { padding: 30px; }
        .greeting { font-size: 16px; color: #333; margin-bottom: 15px; font-weight: 500; }
        .body-text { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 15px; }
        .highlight { color: #FF6243; font-weight: 600; }
        .cta-button { background: linear-gradient(135deg, #FF6243 0%, #FF7F5C 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; font-weight: 600; }
        .divider { height: 1px; background-color: #eee; margin: 15px 0; }
        .footer { background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee; font-size: 11px; color: #999; }
        .footer-name { color: #333; font-weight: 600; margin-bottom: 3px; }
        .badge { background: #ff6243; color: white; padding: 4px 8px; border-radius: 3px; font-size: 11px; display: inline-block; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${profile.companyName}</div>
          <div class="header-tagline">Follow-up #${dayNumber === 2 ? 1 : dayNumber === 4 ? 2 : 3}</div>
        </div>
        
        <div class="content">
          <div class="badge">Follow-up Message</div>
          <div class="greeting">Hey ${name},</div>
          <div class="body-text">${followUpMessage}</div>
          <div class="body-text">
            We specialize in placing talent fast - without the per-hire fees or long contracts that slow things down.
          </div>
          <a href="${profile.calendlyLink}" class="cta-button">Let's Talk (15 min)</a>
          
          <div class="divider"></div>
          
          <div class="body-text" style="margin-top: 0; font-size: 12px; color: #777;">
            Best,<br>
            <strong style="color: #333;">${profile.name}</strong><br>
            ${profile.jobTitle}, ${profile.companyName}<br>
            📧 ${profile.email}<br>
            📱 ${profile.phone}<br>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-name">${profile.companyName}</div>
          <div>Sales & Talent Solutions</div>
          <div style="margin-top: 8px;">© 2026 ${profile.companyName}. All rights reserved.</div>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    html: htmlBody,
    subject: dayNumber === 2 ? `Quick follow-up on ${company}` : dayNumber === 4 ? `One thing about hiring at ${company}` : `Final attempt: Let's connect about ${company}`,
    body: followUpBody
  };
}

/**
 * Generate professional HTML email template with user profile details
 */
function generateHtmlEmail(prospect: any, userProfile: UserProfile): string {
  const name = prospect.name || 'there';
  const company = prospect.company || 'your company';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email from ${userProfile.companyName}</title>
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
        .divider { height: 1px; background-color: #eee; margin: 20px 0; }
        .footer { background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eee; font-size: 12px; color: #999; }
        .footer-name { color: #333; font-weight: 600; margin-bottom: 5px; }
        .stats { display: flex; gap: 20px; margin: 25px 0; justify-content: space-around; }
        .stat { text-align: center; padding: 10px; }
        .stat-number { font-size: 24px; font-weight: bold; color: #FF6243; }
        .stat-label { font-size: 12px; color: #999; margin-top: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${userProfile.companyName}</div>
          <div class="header-tagline">Smart Talent Solutions</div>
        </div>
        
        <div class="content">
          <div class="greeting">Hey ${name},</div>
          
          <div class="body-text">
            I noticed ${company} is scaling rapidly and probably in growth mode with hiring. 
          </div>
          
          <div class="body-text">
            At ${userProfile.companyName}, we specialize in helping companies like ${company} find and hire top talent without the traditional recruiting overhead. Our team handles sourcing, screening, and vetting so your team can focus on interviews and making offers.
          </div>
          
          <div class="body-text">
            <span class="highlight">Here's what sets us apart:</span>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-number">50+</div>
              <div class="stat-label">Placements</div>
            </div>
            <div class="stat">
              <div class="stat-number">21</div>
              <div class="stat-label">Days Average</div>
            </div>
            <div class="stat">
              <div class="stat-number">98%</div>
              <div class="stat-label">Satisfaction</div>
            </div>
          </div>
          
          <div class="body-text">
            Would a quick 15-min call to explore how this works for ${company} make sense?
          </div>
          
          <a href="${userProfile.calendlyLink}" class="cta-button">Book a 15-min Call</a>
          
          <div class="divider"></div>
          
          <div class="body-text" style="margin-top: 0; font-size: 13px; color: #777;">
            Best,<br>
            <strong style="color: #333;">${userProfile.name}</strong><br>
            ${userProfile.jobTitle}, ${userProfile.companyName}<br>
            📧 ${userProfile.email}<br>
            📱 ${userProfile.phone}<br>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-name">${userProfile.companyName}</div>
          <div>Sales & Talent Solutions</div>
          <div style="margin-top: 10px;">© 2026 ${userProfile.companyName}. All rights reserved.</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default function CampaignModal({ isOpen, onClose }: CampaignModalProps) {
  const [loading, setLoading] = useState(false);
  const { session } = useSessionContext();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    targetCompany: '',
    companyWebsite: '',
    campaignType: 'direct',
    description: '',
  });

  // Fetch user profile once when modal opens
  const fetchUserProfile = async () => {
    try {
      const res = await fetch('http://localhost:4000/user-profile');
      if (res.ok) {
        const profile = await res.json();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Fallback to defaults
      setUserProfile({
        name: 'SutraHR Team',
        email: 'hello@sutrahr.com',
        phone: '+91 95379 54953',
        jobTitle: 'Head of Sales',
        companyName: 'SutraHR',
        calendlyLink: 'https://calendly.com/sutrahr'
      });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, campaignType: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check Gmail connection first
      console.log('[campaign-modal] 🔍 Checking Gmail connection...');
      try {
        const gmailCheckRes = await fetch('http://localhost:4000/check-google-tokens', {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });
        
        const gmailData = await gmailCheckRes.json();
        if (!gmailData.connected) {
          toast({
            title: '⚠️ Gmail Not Connected',
            description: 'Please connect your Gmail account to send emails. Refresh and look for the Google Connect button.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      } catch (gmailErr) {
        console.log('[campaign-modal] Gmail check failed, continuing anyway', gmailErr);
      }

      // Fetch profile and wait for it to complete
      let profile = userProfile;
      if (!profile) {
        console.log('[campaign-modal] 📋 Fetching user profile...');
        await fetchUserProfile();
        // Give state a moment to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Fetch fresh profile to ensure we have latest data
      try {
        const profileRes = await fetch('http://localhost:4000/user-profile');
        if (profileRes.ok) {
          profile = await profileRes.json();
          console.log('[campaign-modal] ✅ User profile loaded:', profile.name);
        }
      } catch (err) {
        console.warn('[campaign-modal] Could not fetch profile, using default');
        profile = {
          name: 'SutraHR Team',
          email: 'hello@sutrahr.com',
          phone: '+91 95379 54953',
          jobTitle: 'Head of Sales',
          companyName: 'SutraHR',
          calendlyLink: 'https://calendly.com/sutrahr'
        };
      }

      const res = await fetch('http://localhost:4000/campaigns-v2/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({
          targetCompany: formData.targetCompany,
          companyWebsite: formData.companyWebsite,
          campaignType: formData.campaignType,
          description: formData.description,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }

      const responseData = await res.json();
      const campaignId = responseData.campaign?.id || responseData.id;
      
      toast({
        title: 'Campaign created',
        description: `${formData.targetCompany} campaign is ready to go!`,
      });

      // Auto-send emails once leads are scraped (poll every 2 seconds for 30 seconds)
      console.log(`[campaign-modal] 📧 Starting to monitor for scraped leads...`);
      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        pollCount++;
        try {
          const campaignRes = await fetch(`http://localhost:4000/campaigns-v2/${campaignId}`);
          const campaignData = await campaignRes.json();
          const scraped = campaignData.campaign?.prospects || [];
          
          if (scraped.length > 0) {
            clearInterval(pollInterval);
            console.log(`[campaign-modal] ✅ Found ${scraped.length} leads, auto-sending HTML emails via Gmail...`);
            console.log(`[campaign-modal] Using profile: ${profile?.name || 'unknown'}`);
            
            for (const lead of scraped) {
              try {
                const htmlBody = profile ? generateHtmlEmail(lead, profile) : `<p>Hi ${lead.name},</p><p>Email from SutraHR</p>`;
                const subject = `Quick idea for ${lead.company}`;
                
                console.log(`[campaign-modal] 📤 Sending email to ${lead.email}...`);
                const sendRes = await fetch(
                  `http://localhost:4000/campaigns-v2/${campaignId}/prospects/${lead.id}/send-email`,
                  {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                      subject,
                      body: `Hi ${lead.name},\n\nI noticed ${lead.company} is scaling rapidly.\n\nAt ${profile?.companyName || 'SutraHR'}, we specialize in helping companies like ${lead.company} find and hire top talent without the traditional recruiting overhead.\n\nWould a quick 15-min call to explore how this works make sense?\n\nBest,\n${profile?.name || 'SutraHR Team'}`,
                      htmlBody,
                      emailType: 'initial'
                    })
                  }
                );
                
                if (sendRes.ok) {
                  console.log(`[campaign-modal] ✅ Initial email sent to ${lead.email} via Gmail API from ${profile?.email}`);
                  
                  // Schedule follow-ups for days 2, 4, 6 if no reply
                  const followupDays = [2, 4, 6];
                  for (const day of followupDays) {
                    try {
                      const followupDate = new Date();
                      followupDate.setDate(followupDate.getDate() + day);
                      const followupTemplate = generateFollowUpEmail(lead, profile || {}, day);
                      
                      await fetch(
                        `http://localhost:4000/campaigns-v2/${campaignId}/prospects/${lead.id}/schedule-followup`,
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token}`
                          },
                          body: JSON.stringify({
                            followUpDate: followupDate.toISOString(),
                            followUpType: 'email',
                            followUpTemplate: JSON.stringify(followupTemplate),
                            notes: `Auto-scheduled follow-up ${day} days after initial send`
                          })
                        }
                      );
                      console.log(`[campaign-modal] 📅 Follow-up scheduled for day ${day}`);
                    } catch (err) {
                      console.warn(`[campaign-modal] Could not schedule day ${day} follow-up:`, err);
                    }
                  }
                } else {
                  const errData = await sendRes.json();
                  console.error(`[campaign-modal] ❌ Failed to send to ${lead.email}:`, errData);
                }
              } catch (err) {
                console.error(`[campaign-modal] ❌ Error sending to ${lead.email}:`, err);
              }
            }
            console.log(`[campaign-modal] 📧 Auto-send complete`);
          } else if (pollCount > 15) {
            clearInterval(pollInterval);
            console.log(`[campaign-modal] ⏰ Stopped polling - no leads found after 30 seconds`);
          }
        } catch (err) {
          console.error(`[campaign-modal] Polling error:`, err);
        }
      }, 2000);

      setFormData({ targetCompany: '', companyWebsite: '', campaignType: 'direct', description: '' });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create campaign',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="targetCompany">Target Company *</Label>
            <Input
              id="targetCompany"
              name="targetCompany"
              value={formData.targetCompany}
              onChange={handleInputChange}
              placeholder="e.g., SutraHR"
              required
            />
          </div>

          <div>
            <Label htmlFor="companyWebsite">Company Website</Label>
            <Input
              id="companyWebsite"
              name="companyWebsite"
              value={formData.companyWebsite}
              onChange={handleInputChange}
              placeholder="https://company.com"
              type="url"
            />
          </div>

          <div>
            <Label htmlFor="campaignType">Campaign Type *</Label>
            <Select value={formData.campaignType} onValueChange={handleSelectChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct Outreach</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="hiring">Recruiting</SelectItem>
                <SelectItem value="event">Event Promotion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Campaign goals and notes..."
              rows={4}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
