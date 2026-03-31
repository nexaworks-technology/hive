'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [prospectData, setProspectData] = useState<any>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState('');

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
    preview = preview.replace(/{{prospectName}}/g, prospectData.name);
    preview = preview.replace(/{{prospectCompanyName}}/g, prospectData.company);
    preview = preview.replace(/{{prospectRole}}/g, prospectData.role);
    return preview;
  };

  const handleSendEmail = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        title: 'Error',
        description: 'Subject and body are required',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const res = await fetch(
        `http://localhost:4000/campaigns-v2/${campaignId}/prospects/${prospectId}/send-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject,
            body,
          }),
        }
      );

      if (!res.ok) throw new Error('Failed to send email');

      toast({
        title: 'Email sent!',
        description: `Email sent to ${prospectData.email}`,
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
          <div className="grid grid-cols-2 gap-4 space-y-4">
            {/* Compose Side */}
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
                  placeholder="Email body. Use {{prospectName}}, {{prospectCompanyName}}, {{prospectRole}} for personalization."
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
            </div>

            {/* Preview Side */}
            <div className="space-y-4">
              <div>
                <Label>Preview</Label>
                <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Subject:</p>
                    <p className="text-sm font-semibold text-gray-900">{subject || '(empty)'}</p>
                  </div>

                  <hr />

                  <div>
                    <p className="text-xs text-gray-600 mb-2">Email Body:</p>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono max-h-[300px] overflow-y-auto">
                      {generatePreview() || '(empty)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Personalization Info */}
              <div className="bg-green-50 p-4 rounded border border-green-200">
                <p className="text-xs font-semibold text-green-900 mb-2">Prospect Info:</p>
                <ul className="text-xs text-green-800 space-y-1">
                  <li>
                    <strong>Name:</strong> {prospectData.name}
                  </li>
                  <li>
                    <strong>Company:</strong> {prospectData.company}
                  </li>
                  <li>
                    <strong>Role:</strong> {prospectData.role}
                  </li>
                </ul>
              </div>
            </div>
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
