"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toastManager } from '@/components/toast-notification';

export default function ProfileBuilderPage() {
  // Sidebar is now always visible via layout.tsx
  const [companyName, setCompanyName] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [valueProp, setValueProp] = useState('');
  const [cta, setCta] = useState('');
  const [socialProof, setSocialProof] = useState('');
  const [companyOverview, setCompanyOverview] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Save profile to backend or local storage
    setLoading(false);
    toastManager.notify({ title: 'Profile saved', message: 'Your company profile will help generate more accurate outreach emails.', type: 'success' });
    // Optionally redirect or update state
  };

  return (
    <div className="min-h-screen bg-background p-6 w-[calc(100vw-16rem)]">
      <div className="w-full space-y-4">
        <h1 className="text-2xl font-semibold text-foreground text-left">Build Your Company Profile</h1>
        <p className="text-sm text-muted-foreground mb-2 text-left">Fill in your company details to help Hive generate more accurate outreach emails.</p>
        <form className="space-y-4 w-full" onSubmit={onSubmit}>
          <div className="rounded-lg border border-muted p-4 mb-2">
            <div className="font-semibold mb-2">Gather content from your website</div>
            <Label htmlFor="websiteUrl" className="block text-sm font-medium mb-1">Website URL (optional)</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="websiteUrl"
                type="url"
                placeholder="e.g., hive.io"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                className="flex-1"
                autoComplete="off"
              />
              <Button
                type="button"
                disabled={!websiteUrl.trim() || fetching}
                onClick={async () => {
                  setFetching(true);
                  // TODO: Call backend to fetch and parse website, then autofill fields
                  // Simulate fetch for now
                  setTimeout(() => {
                    setCompanyName('hive.io');
                    setPainPoints('Sales teams often struggle with inefficient prospecting, low lead quality, and high manual workload, which can hinder their ability to close deals effectively.');
                    setValueProp('hive.io offers an AI-driven sales platform that streamlines the sales process, enhances lead quality, and automates outreach, enabling teams to close deals faster and more efficiently.');
                    setCta('Sign up for a free trial to experience how hive.io can transform your sales process and boost your team\'s productivity.');
                    setSocialProof('What case studies and results can you mention?');
                    setCompanyOverview('');
                    setFetching(false);
                  }, 1200);
                }}
                className="whitespace-nowrap"
              >
                {fetching ? 'Fetching...' : 'Find information'}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company or product name *</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              placeholder="e.g., hive.io"
              className="h-12 text-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="painPoints">Customer pain points *</Label>
            <Textarea
              id="painPoints"
              value={painPoints}
              onChange={(e) => setPainPoints(e.target.value)}
              required
              placeholder="Sales teams often struggle with inefficient prospecting, low lead quality, and high manual workload..."
              className="h-12 text-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valueProp">Value proposition *</Label>
            <Textarea
              id="valueProp"
              value={valueProp}
              onChange={(e) => setValueProp(e.target.value)}
              required
              placeholder="hive.io offers an AI-driven sales platform that streamlines the sales process..."
              className="h-12 text-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cta">Call-to-action *</Label>
            <Input
              id="cta"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              required
              placeholder="Sign up for a free trial..."
              className="h-12 text-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="socialProof">Social proof</Label>
            <Textarea
              id="socialProof"
              value={socialProof}
              onChange={(e) => setSocialProof(e.target.value)}
              placeholder="What case studies and results can you mention?"
              className="h-12 text-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyOverview">Company overview</Label>
            <Textarea
              id="companyOverview"
              value={companyOverview}
              onChange={(e) => setCompanyOverview(e.target.value)}
              placeholder="Describe your company in a few sentences..."
              className="h-12 text-2xl"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" className="w-40" disabled={loading}>
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
