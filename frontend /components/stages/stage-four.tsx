'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wand2, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Lead {
  name: string;
  title: string;
  company: string;
  companySize: string;
  industry: string;
  linkedinProfile: string;
  recentActivity: string;
}

interface DraftedEmail {
  subject: string;
  body: string;
}

const mockLead: Lead = {
  name: 'Sarah Johnson',
  title: 'Lead Generation Manager',
  company: 'Phoenix Digital',
  companySize: '25 employees',
  industry: 'B2B Lead Generation',
  linkedinProfile: 'linkedin.com/in/sarahjohnson',
  recentActivity: 'Posted about lead quality challenges',
};

const draftedEmail: DraftedEmail = {
  subject: 'Quick thought on lead quality at Phoenix Digital',
  body: `Hi Sarah,

I noticed your recent post about lead quality challenges—it resonated with me because we've helped similar agencies at Phoenix Digital improve their lead consistency by 40%.

The "Valley of Death" problem you mentioned is something we see constantly. Our approach focuses on three key areas:
1. Automated validation and scoring
2. Real-time enrichment pipelines
3. Personalized follow-up sequences

Given your team size and focus on lead gen, I think there could be a real fit. No pitch—just wanted to share a relevant resource that might help.

Best,
[Your Name]`,
};

export default function StageFour() {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'liked' | 'disliked' | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `Subject: ${draftedEmail.subject}\n\n${draftedEmail.body}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Wand2 className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">The Spear</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Personalized email drafts tailored to each prospect
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Profile */}
        <Card className="p-6 border-border bg-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Lead Profile</h3>
          <div className="space-y-4">
            <div className="border-l-2 border-primary pl-4">
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-foreground font-semibold">{mockLead.name}</p>
            </div>
            <div className="border-l-2 border-primary pl-4">
              <p className="text-sm font-medium text-muted-foreground">Title</p>
              <p className="text-foreground font-semibold">{mockLead.title}</p>
            </div>
            <div className="border-l-2 border-primary pl-4">
              <p className="text-sm font-medium text-muted-foreground">Company</p>
              <p className="text-foreground font-semibold">{mockLead.company}</p>
            </div>
            <div className="border-l-2 border-primary pl-4">
              <p className="text-sm font-medium text-muted-foreground">Company Size</p>
              <p className="text-foreground font-semibold">{mockLead.companySize}</p>
            </div>
            <div className="border-l-2 border-primary pl-4">
              <p className="text-sm font-medium text-muted-foreground">Industry</p>
              <p className="text-foreground font-semibold">{mockLead.industry}</p>
            </div>
            <div className="border-l-2 border-primary pl-4">
              <p className="text-sm font-medium text-muted-foreground">Recent Activity</p>
              <p className="text-foreground font-semibold text-sm">{mockLead.recentActivity}</p>
            </div>
          </div>
        </Card>

        {/* Personalized Email */}
        <Card className="p-6 border-border bg-card flex flex-col">
          <h3 className="text-lg font-semibold text-foreground mb-4">AI-Drafted Email</h3>
          <div className="bg-secondary/50 border border-border rounded-lg p-4 flex-1 font-mono text-xs overflow-y-auto">
            <div className="mb-4">
              <p className="text-muted-foreground font-semibold">Subject:</p>
              <p className="text-foreground mt-1">{draftedEmail.subject}</p>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-muted-foreground font-semibold mb-2">Body:</p>
              <div className="text-foreground whitespace-pre-wrap text-[11px] leading-relaxed">
                {draftedEmail.body}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-1 gap-2 bg-transparent"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button
              onClick={() => setFeedback('liked')}
              variant={feedback === 'liked' ? 'default' : 'outline'}
              size="icon"
            >
              <ThumbsUp className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setFeedback('disliked')}
              variant={feedback === 'disliked' ? 'destructive' : 'outline'}
              size="icon"
            >
              <ThumbsDown className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-6 border-border bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Email Strategy & Notes</h3>
        <Tabs defaultValue="strategy" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="personalization">Personalization</TabsTrigger>
            <TabsTrigger value="openRate">Open Rate Prediction</TabsTrigger>
          </TabsList>

          <TabsContent value="strategy" className="space-y-3 pt-4">
            <div className="space-y-2">
              <p className="font-medium text-foreground">Problem-Focused Angle</p>
              <p className="text-sm text-muted-foreground">
                This email leads with a specific pain point (Valley of Death / lead quality) that Sarah mentioned, creating immediate relevance.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">No Hard Sell</p>
              <p className="text-sm text-muted-foreground">
                The draft avoids aggressive selling. Instead, it positions as helpful and consultative, which drives better response rates.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Social Proof Subtle</p>
              <p className="text-sm text-muted-foreground">
                References similar agencies worked with, building credibility without being salesy.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="personalization" className="space-y-3 pt-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
              <p className="text-sm">
                <span className="font-semibold text-primary">Mention of post:</span> References Sarah's recent LinkedIn activity
              </p>
              <p className="text-sm">
                <span className="font-semibold text-primary">Role relevance:</span> Tailored for Lead Generation Manager mindset
              </p>
              <p className="text-sm">
                <span className="font-semibold text-primary">Company insights:</span> Acknowledges Phoenix Digital's specific size
              </p>
            </div>
          </TabsContent>

          <TabsContent value="openRate" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Predicted Open Rate</p>
                <p className="text-2xl font-bold text-accent mt-1">38%</p>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold text-primary mt-1">12%</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Based on subject line, personalization depth, and prospect engagement history
            </p>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
