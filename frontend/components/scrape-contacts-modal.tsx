'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Users } from 'lucide-react';

interface ScraperResult {
  success: boolean;
  domain: string;
  totalFound: number;
  totalEnrolled: number;
  results: {
    tier1: {
      count: number;
      pitch: string;
      contacts: Array<{
        name: string;
        email: string;
        position: string;
        linkedin: string;
      }>;
    };
    tier2: {
      count: number;
      pitch: string;
      contacts: Array<{
        name: string;
        email: string;
        position: string;
        linkedin: string;
      }>;
    };
    tier3: {
      count: number;
      pitch: string;
      contacts: Array<{
        name: string;
        email: string;
        position: string;
        linkedin: string;
      }>;
    };
  };
  enrolledContacts: any[];
  summary: string;
}

interface ScrapeContactsModalProps {
  campaignId: string;
  onSuccess?: () => void;
}

export function ScrapeContactsModal({ campaignId, onSuccess }: ScrapeContactsModalProps) {
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScraperResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!domain.trim()) {
      setError('Please enter a domain');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `http://localhost:4000/campaigns-v2/${campaignId}/scrape-company-by-titles`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: domain.trim() })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to scrape contacts');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDomain('');
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    setOpen(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="w-4 h-4" />
          Scrape Contacts by Title
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scrape Contacts by Title Tier</DialogTitle>
          <DialogDescription>
            Enter a company domain to find and auto-enroll contacts in your 7-touch sequence
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., incard.co, n8n.io"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              />
              <Button onClick={handleScrape} disabled={loading || !domain.trim()}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? 'Scraping...' : 'Scrape'}
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <CheckCircle2 className="w-4 h-4 inline mr-2 mb-1" />
                {result.summary}
              </p>
            </div>

            {/* Tier 1 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-lg">Tier 1 • Technical Leaders (CTOs/VPs)</h3>
                <Badge variant="secondary">{result.results.tier1.count}</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">{result.results.tier1.pitch}</p>
              {result.results.tier1.contacts.length > 0 ? (
                <div className="space-y-2">
                  {result.results.tier1.contacts.map((contact, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="font-medium text-sm">{contact.name}</div>
                      <div className="text-xs text-gray-600">{contact.position}</div>
                      <div className="text-xs text-blue-600 mt-1">{contact.email}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No contacts found</p>
              )}
            </div>

            {/* Tier 2 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-lg">Tier 2 • Business Leaders (Founders/CEOs)</h3>
                <Badge variant="secondary">{result.results.tier2.count}</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">{result.results.tier2.pitch}</p>
              {result.results.tier2.contacts.length > 0 ? (
                <div className="space-y-2">
                  {result.results.tier2.contacts.map((contact, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="font-medium text-sm">{contact.name}</div>
                      <div className="text-xs text-gray-600">{contact.position}</div>
                      <div className="text-xs text-blue-600 mt-1">{contact.email}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No contacts found</p>
              )}
            </div>

            {/* Tier 3 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-lg">Tier 3 • Talent Leaders (TA/Recruiting)</h3>
                <Badge variant="secondary">{result.results.tier3.count}</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">{result.results.tier3.pitch}</p>
              {result.results.tier3.contacts.length > 0 ? (
                <div className="space-y-2">
                  {result.results.tier3.contacts.map((contact, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="font-medium text-sm">{contact.name}</div>
                      <div className="text-xs text-gray-600">{contact.position}</div>
                      <div className="text-xs text-blue-600 mt-1">{contact.email}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No contacts found</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleReset}>
                Scrape Another Domain
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
