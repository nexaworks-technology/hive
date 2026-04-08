'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useSessionContext } from '@/components/auth-provider';
import { AlertCircle } from 'lucide-react';

interface EmailComposerProps {
  prospectId: string;
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailComposer({
  prospectId,
  campaignId,
  isOpen,
  onClose,
}: EmailComposerProps) {
  const { session } = useSessionContext();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [prospectData, setProspectData] = useState<any>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState('');
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose');
  const [htmlPreview, setHtmlPreview] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProspectData();
    }
  }, [isOpen, prospectId, campaignId]);

  const fetchProspectData = async () => {
    try {
      const res = await fetch(
        `http://localhost:4000/campaigns-v2/${campaignId}/prospects/${prospectId}/details`
      );
      const data = await res.json();
      setProspectData(data.prospect);

      // Pre-fill with default template
      setSubject(`Scale ${data.prospect.company}'s engineering faster - ${data.prospect.name}`);
      setBody(`Hi ${data.prospect.name},

Noticed your post about scaling the engineering team at ${data.prospect.company}. ${data.prospect.personalizationInfo?.insight || ''}

Here's why companies like yours work with us:
1. Faster hiring (19 days avg vs 90+ traditional)
2. No per-hire fees
3. Dedicated recruiter as part of your team

Quick question: what's your biggest hiring challenge right now?

Best,
Pavan`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load prospect data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = () => {
    if (!prospectData) return '';
    let preview = body;
    
    // Replace basic tokens
    preview = preview.replace(/{{prospectName}}/g, prospectData.name);
    preview = preview.replace(/{{prospectCompanyName}}/g, prospectData.company);
    preview = preview.replace(/{{prospectRole}}/g, prospectData.role);
    
    // Replace enriched tokens if available
    if (prospectData.enrichedData) {
      if (prospectData.enrichedData.prospectHeadline) {
        preview = preview.replace(/{{prospectHeadline}}/g, prospectData.enrichedData.prospectHeadline);
      }
      if (prospectData.enrichedData.prospectAchievement) {
        preview = preview.replace(/{{prospectAchievement}}/g, prospectData.enrichedData.prospectAchievement);
      }
      if (prospectData.enrichedData.recentJobChange) {
        preview = preview.replace(/{{recentJobChange}}/g, prospectData.enrichedData.recentJobChange);
      }
    }
    
    return preview;
  };

  const generateHtmlPreview = () => {
    if (!prospectData) return '';
    
    const plainText = generatePreview();
    
    // Create beautiful email styling matching the preview page
    const htmlBody = plainText
      .split('\n\n')
      .map((paragraph) => {
        // Check if it's a signature
        if (paragraph.trim().match(/^(Best|Thanks|Regards|Thanks,|Best,|Cheers)/)) {
          return `<div class="body-text" style="margin-top: 0; font-size: 13px; color: #777;">${paragraph.replace(/\n/g, '<br>')}</div>`;
        }
        // Regular paragraphs
        return `<div class="body-text">${paragraph.replace(/\n/g, '<br>')}</div>`;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
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
          strong { color: #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SutraHR</div>
            <div class="header-tagline">Smart Talent Solutions</div>
          </div>
          
          <div class="content">
            <div class="greeting">Hey ${prospectData.name},</div>
            ${htmlBody}
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
  };

  useEffect(() => {
    if (activeTab === 'preview') {
      setHtmlPreview(generateHtmlPreview());
    }
  }, [activeTab, subject, body, prospectData]);

  const handleSendEmail = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        title: 'Error',
        description: 'Subject and body are required',
        variant: 'destructive',
      });
      return;
    }

    if (!session?.access_token) {
      toast({
        title: 'Error',
        description: 'Not authenticated. Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      // Generate the SAME beautiful HTML as shown in preview
      const plainText = generatePreview();
      
      // Build the styled content
      const styledContent = plainText
        .split('\n\n')
        .map((paragraph) => {
          if (paragraph.trim().match(/^(Best|Thanks|Regards|Thanks,|Best,|Cheers)/)) {
            return `<div class="body-text" style="margin-top: 0; font-size: 13px; color: #777;">${paragraph.replace(/\n/g, '<br>')}</div>`;
          }
          return `<div class="body-text">${paragraph.replace(/\n/g, '<br>')}</div>`;
        })
        .join('');

      // Build the COMPLETE beautiful HTML - matching the preview page exactly
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
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
            strong { color: #333; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">SutraHR</div>
              <div class="header-tagline">Smart Talent Solutions</div>
            </div>
            
            <div class="content">
              <div class="greeting">Hey ${prospectData.name},</div>
              ${styledContent}
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

      const res = await fetch(
        `http://localhost:4000/campaigns-v2/${campaignId}/prospects/${prospectId}/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            subject,
            body,
            htmlBody, // Send the COMPLETE beautiful HTML with header, card, styling!
          }),
        }
      );

      if (!res.ok) throw new Error('Failed to send email');

      toast({
        title: 'Email sent!',
        description: `Beautiful HTML email sent to ${prospectData.email}`,
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Send Email to{' '}
            {prospectData ? `${prospectData.name} (${prospectData.email})` : '...'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : prospectData ? (
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setActiveTab('compose')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'compose'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                ✏️ Compose
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'preview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                👁️ HTML Preview
              </button>
            </div>

            {/* Compose Tab */}
            {activeTab === 'compose' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject"
                  />
                </div>

                <div>
                  <Label htmlFor="body">Email Body *</Label>
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Email body. Use {{prospectName}}, {{prospectCompanyName}}, {{prospectRole}}, {{prospectHeadline}}, {{prospectAchievement}}, {{recentJobChange}} for personalization."
                    rows={12}
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded flex gap-2 text-sm">
                  <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-700">
                    Use <code className="bg-white px-1 rounded">{'{{prospectName}}'}</code> and similar
                    tags for dynamic personalization
                  </p>
                </div>

                {/* Text Preview */}
                <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-3 max-h-[300px] overflow-y-auto">
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-semibold">Preview:</p>
                    <p className="text-xs text-gray-600 mb-2">Subject: {subject || '(empty)'}</p>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {generatePreview() || '(empty)'}
                    </div>
                  </div>
                </div>

                {/* Prospect Info */}
                <div className="bg-green-50 p-4 rounded border border-green-200">
                  <p className="text-xs font-semibold text-green-900 mb-2">Prospect Info:</p>
                  <ul className="text-xs text-green-800 space-y-1">
                    <li><strong>Name:</strong> {prospectData.name}</li>
                    <li><strong>Email:</strong> {prospectData.email}</li>
                    <li><strong>Company:</strong> {prospectData.company}</li>
                    <li><strong>Role:</strong> {prospectData.role}</li>
                  </ul>
                </div>

                {/* Available Tokens for Personalization */}
                <div className="bg-purple-50 p-4 rounded border border-purple-200">
                  <p className="text-xs font-semibold text-purple-900 mb-3">📌 Available Personalization Tokens:</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Basic Tokens */}
                    <div className="space-y-2">
                      <div className="font-semibold text-purple-800">Basic Tokens:</div>
                      <div className="bg-white p-2 rounded border border-purple-100 font-mono text-purple-700">
                        <div>{'{{prospectName}}'}</div>
                        <div>{'{{prospectCompanyName}}'}</div>
                        <div>{'{{prospectRole}}'}</div>
                      </div>
                    </div>

                    {/* Enriched Tokens (if available) */}
                    <div className="space-y-2">
                      <div className="font-semibold text-purple-800">✨ Smart Tokens:</div>
                      {prospectData.enrichedData ? (
                        <div className="bg-white p-2 rounded border border-purple-100 space-y-1">
                          {prospectData.enrichedData.prospectHeadline && (
                            <div>
                              <div className="font-mono text-purple-700">{'{{prospectHeadline}}'}</div>
                              <div className="text-gray-600 text-xs pl-2">→ {prospectData.enrichedData.prospectHeadline}</div>
                            </div>
                          )}
                          {prospectData.enrichedData.prospectAchievement && (
                            <div>
                              <div className="font-mono text-purple-700">{'{{prospectAchievement}}'}</div>
                              <div className="text-gray-600 text-xs pl-2">→ {prospectData.enrichedData.prospectAchievement}</div>
                            </div>
                          )}
                          {prospectData.enrichedData.recentJobChange && (
                            <div>
                              <div className="font-mono text-purple-700">{'{{recentJobChange}}'}</div>
                              <div className="text-gray-600 text-xs pl-2">→ {prospectData.enrichedData.recentJobChange}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white p-2 rounded border border-purple-100 text-gray-500 italic">
                          No enrichment data (using defaults)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HTML Preview Tab */}
            {activeTab === 'preview' && (
              <div className="relative border rounded-lg overflow-hidden bg-gray-100 h-[500px]">
                <iframe
                  srcDoc={htmlPreview}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  title="Email Preview"
                />
              </div>
            )}
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSendEmail} disabled={sending || loading}>
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
