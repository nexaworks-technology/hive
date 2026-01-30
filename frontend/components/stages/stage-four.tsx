'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wand2, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { workflowManager, type Lead, type WorkflowState } from '@/lib/workflow-context';
import { toastManager } from '@/components/toast-notification';

type LeadDraft = {
  subject: string;
  body: string;
  summary: string;
  talkingPoints: string[];
};

const fallbackLeads: Lead[] = [
  {
    id: 'fallback-1',
    name: 'Sample Prospect',
    title: 'Growth Lead',
    company: 'Atlas Labs',
    email: 'sample@atlaslabs.io',
    linkedin: 'linkedin.com/in/sample',
    emailSent: false,
    replied: false,
    followupCount: 0,
    summary: 'Looking for steadier outbound performance; open to concise pilots.',
    talkingPoints: ['Keep pitch light', 'Offer a low-risk pilot', 'Share one data point'],
    draftEmail: {
      subject: 'Quick idea to stabilize your outbound',
      body: `Hi there,\n\nNoticed Atlas is tightening outbound. A small tweak—intent signal + 2-step follow-up—lifted meetings for a similar team.\n\nIf helpful, I can share the 3-step checklist. Want it?`,
      readyToSend: false,
    },
  },
];

const leadDraftMap: Record<string, LeadDraft> = {
  '1': {
    summary: 'Lead gen manager concerned about lead quality consistency.',
    talkingPoints: [
      'Reference her post on lead quality',
      'Suggest validation and scoring',
      'Offer to share a checklist, not a pitch',
    ],
    subject: 'Quick thought on keeping lead quality consistent',
    body: `Hi Sarah,\n\nSaw your note about lead quality swings. We helped a 25-person agency stabilize quality by adding real-time validation + light enrichment before handoff. Happy to share the checklist they use if helpful.\n\nWorth a 10-min walkthrough?`,
  },
  '2': {
    summary: 'Ops director aiming for predictable pipeline throughput.',
    talkingPoints: ['Tie to throughput and predictability', 'Share one process tweak', 'Invite him to a short map review'],
    subject: 'Keeping your pipeline predictable this quarter',
    body: `Hi Michael,\n\nYou mentioned wanting a steadier pipeline. We usually get there by tightening handoffs: light scoring + a two-step follow-up sequence tied to buyer signals.\n\nI can share a 1-page ops map that cut variance for a 40-person team—want a copy?`,
  },
  '3': {
    summary: 'Sales lead wants better reply rates without extra manual work.',
    talkingPoints: ['Improve replies without more headcount', 'Point to a similar team win', 'Offer a ready opener'],
    subject: 'One tweak that lifted replies 18% for a peer team',
    body: `Hi Emma,\n\nA sales org we support bumped replies 18% by pairing intent signals with a lighter-touch follow-up. No extra reps—just tighter triggers.\n\nIf useful, I can share the exact opener + triggers they used. Interested?`,
  },
  '4': {
    summary: 'BD rep balancing volume and personalization speed.',
    talkingPoints: ['Balance speed with specificity', 'Share a reusable template', 'Offer a small test on 10 contacts'],
    subject: 'Faster personalization for your next 10 prospects',
    body: `Hi James,\n\nYou called out wanting quick personalization at scale. We built a short pattern: enrich → 2-sentence hook → light CTA. Keeps speed while feeling specific.\n\nWant me to set it up on 10 of your contacts so you can see the lift?`,
  },
  '5': {
    summary: 'Data-minded sales director focused on attribution and pipeline.',
    talkingPoints: ['Emphasize measurable impact', 'Call out data cleanliness', 'Propose a small AB test'],
    subject: 'Making attribution cleaner on your outbound',
    body: `Hi Lisa,\n\nMost outbound falls down at attribution. We add a light enrichment + UTM discipline that lets sales see which plays drive meetings.\n\nIf you want, I can share the mini playbook and a 2-week AB test outline.`,
  },
  '6': {
    summary: 'Growth VP wants repeatable, low-risk outbound plays.',
    talkingPoints: ['Highlight repeatability', 'Offer a low-risk pilot', 'Share a benchmark result'],
    subject: 'A low-risk pilot to harden your outbound',
    body: `Hi David,\n\nYou mentioned wanting repeatable plays. A growth team we worked with hardened their outbound by piloting a short intent-enriched sequence—reproducible, measurable.\n\nIf you want the 3-step pilot plan, I can send it over and set it up on a small slice first.`,
  },
};

export default function StageFour() {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'liked' | 'disliked' | null>>({});
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = workflowManager.subscribe((state) => {
      setWorkflowState(state);
      if (!selectedLeadId && state.leads.length) {
        setSelectedLeadId(state.leads[0].id);
      }
    });
    return unsubscribe;
  }, [selectedLeadId]);

  const leads: Lead[] = useMemo(() => {
    if (workflowState?.leads?.length) return workflowState.leads;
    return fallbackLeads;
  }, [workflowState?.leads]);

  useEffect(() => {
    if (!selectedLeadId && leads.length) {
      setSelectedLeadId(leads[0].id);
    }
  }, [leads, selectedLeadId]);

  const getDraftForLead = (lead: Lead): LeadDraft => {
    if (lead.draftEmail?.subject && lead.draftEmail?.body) {
      return {
        subject: lead.draftEmail.subject,
        body: lead.draftEmail.body,
        summary:
          lead.summary ||
          'Concise summary not provided. Draft kept lightweight for review before sending.',
        talkingPoints:
          lead.talkingPoints || [
            'Reference a recent activity or pain point',
            'Offer a short, no-pitch resource',
            'Close with an easy next step',
          ],
      };
    }

    const mapped = leadDraftMap[lead.id];
    if (mapped) return mapped;

    return {
      summary:
        lead.summary ||
        'Concise summary not provided. Draft kept lightweight for review before sending.',
      talkingPoints:
        lead.talkingPoints || [
          'Reference a recent activity or pain point',
          'Offer a short, no-pitch resource',
          'Close with an easy next step',
        ],
      subject: lead.draftEmail?.subject || 'Quick idea for your team',
      body:
        lead.draftEmail?.body ||
        `Hi ${lead.name.split(' ')[0] || 'there'},\n\nSharing a quick idea tailored to ${lead.company}. Happy to adjust once you review.`,
    };
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const loadingToastId = toastManager.notify({
      title: 'Generating drafts...',
      message: 'Calling Gemini to create personalized emails.',
      type: 'loading',
      duration: 0,
    });
    try {
      const payload = {
        targetAudience: workflowState?.targetAudience || '',
        additionalContext: workflowState?.additionalContext || '',
        leads: leads.map((lead) => ({
          id: lead.id,
          name: lead.name,
          title: lead.title,
          company: lead.company,
          summary: lead.summary || 'No summary provided',
          talkingPoints: lead.talkingPoints || [],
        })),
      };

      const res = await fetch('/api/generate-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const details = await res.json().catch(() => ({} as any));
        const parts = [details.error || 'Failed to generate drafts'];
        if (details.status) parts.push(`status ${details.status}`);
        if (details.details) parts.push(String(details.details).slice(0, 200));
        throw new Error(parts.join(' | '));
      }

      const data = (await res.json()) as {
        drafts?: { id: string; subject: string; body: string }[];
        details?: string;
      };
      const drafts = data.drafts || [];

      const updatedLeads = leads.map((lead) => {
        const draft = drafts.find((d) => d.id === lead.id);
        if (!draft) return lead;
        return {
          ...lead,
          draftEmail: {
            subject: draft.subject,
            body: draft.body,
            readyToSend: false,
          },
        };
      });

      workflowManager.setState({ leads: updatedLeads, emailsDrafted: true, currentStage: 'stage-4' });

      toastManager.notify({
        title: 'Drafts ready',
        message: 'Gemini generated drafts. Review before sending.',
        type: 'success',
      });
    } catch (err) {
      toastManager.notify({
        title: 'Draft generation failed',
        message: (err as Error).message || 'Unexpected error',
        type: 'error',
      });
    } finally {
      if (loadingToastId) {
        toastManager.remove(loadingToastId);
      }
      setIsGenerating(false);
    }
  };

  const handleCopy = (lead: Lead) => {
    const draft = getDraftForLead(lead);
    navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 1500);
    toastManager.notify({
      title: 'Draft copied',
      message: `Ready to paste for ${lead.name}. Sending is disabled until email is integrated.`,
      type: 'info',
    });
  };

  const handleSend = async (lead: Lead) => {
    if (lead.id.startsWith('fallback')) {
      toastManager.notify({ title: 'Connect real leads', message: 'Use real leads before sending.', type: 'info' });
      return;
    }

    if (!lead.email) {
      toastManager.notify({ title: 'Missing email', message: 'Lead email is required to send.', type: 'error' });
      return;
    }

    const draft = getDraftForLead(lead);
    setSendingId(lead.id);
    const loadingToastId = toastManager.notify({
      title: 'Sending...',
      message: `Delivering to ${lead.email} via Zoho SMTP`,
      type: 'loading',
      duration: 0,
    });

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          subject: draft.subject,
          body: draft.body,
          fromName: 'Nexaworks',
        }),
      });

      if (!res.ok) {
        const details = await res.json().catch(() => ({} as any));
        const parts = [details.error || 'Failed to send email'];
        throw new Error(parts.join(' | '));
      }

      const updatedLeads = leads.map((l) => (l.id === lead.id ? { ...l, emailSent: true } : l));
      workflowManager.setState({ leads: updatedLeads, currentStage: 'stage-5' });

      toastManager.notify({
        title: 'Email sent',
        message: `Sent to ${lead.email}. Tracking in Closing.`,
        type: 'success',
      });
    } catch (err) {
      toastManager.notify({
        title: 'Send failed',
        message: (err as Error).message || 'Unexpected error',
        type: 'error',
      });
    } finally {
      if (loadingToastId) toastManager.remove(loadingToastId);
      setSendingId(null);
    }
  };

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Wand2 className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">The Spear</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Review AI-drafted outreach emails. Sending is disabled until email is integrated.
        </p>
      </div>

      <Card className="p-4 border-border bg-secondary/50 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Drafts generate via Gemini using the current lead summaries. You can now send via Zoho SMTP once env keys are set.
        </p>
        <Button onClick={handleGenerate} disabled={isGenerating} size="sm" className="gap-2">
          {isGenerating ? 'Generating...' : 'Generate with Gemini'}
        </Button>
      </Card>

      <Tabs value={selectedLeadId || leads[0]?.id} onValueChange={setSelectedLeadId} className="w-full">
        <TabsList className="w-full overflow-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {leads.map((lead) => (
            <TabsTrigger key={lead.id} value={lead.id} className="truncate">
              {lead.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {leads.map((lead) => {
          const draft = getDraftForLead(lead);

          return (
            <TabsContent key={lead.id} value={lead.id} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 border-border bg-card">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Lead Snapshot</h3>
                  <div className="space-y-4">
                    <div className="border-l-2 border-primary pl-4">
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="text-foreground font-semibold">{lead.name}</p>
                    </div>
                    <div className="border-l-2 border-primary pl-4">
                      <p className="text-sm font-medium text-muted-foreground">Title</p>
                      <p className="text-foreground font-semibold">{lead.title}</p>
                    </div>
                    <div className="border-l-2 border-primary pl-4">
                      <p className="text-sm font-medium text-muted-foreground">Company</p>
                      <p className="text-foreground font-semibold">{lead.company}</p>
                    </div>
                    <div className="border-l-2 border-primary pl-4">
                      <p className="text-sm font-medium text-muted-foreground">Summary</p>
                      <p className="text-foreground text-sm leading-relaxed">{draft.summary}</p>
                    </div>
                    <div className="border-l-2 border-primary pl-4">
                      <p className="text-sm font-medium text-muted-foreground">Talking Points</p>
                      <ul className="text-sm text-foreground list-disc pl-4 space-y-1">
                        {draft.talkingPoints.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-border bg-card flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Draft Email</h3>
                    <div className="text-xs text-muted-foreground">Status: draft (not sent)</div>
                  </div>
                  <div className="bg-secondary/50 border border-border rounded-lg p-4 flex-1 font-mono text-xs overflow-y-auto">
                    <div className="mb-4">
                      <p className="text-muted-foreground font-semibold">Subject:</p>
                      <p className="text-foreground mt-1">{draft.subject}</p>
                    </div>
                    <div className="border-t border-border pt-4">
                      <p className="text-muted-foreground font-semibold mb-2">Body:</p>
                      <div className="text-foreground whitespace-pre-wrap text-[11px] leading-relaxed">
                        {draft.body}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => handleCopy(lead)}
                      variant="outline"
                      className="flex-1 gap-2 bg-transparent"
                    >
                      <Copy className="w-4 h-4" />
                      {copiedId === lead.id ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      onClick={() => handleSend(lead)}
                      disabled={sendingId === lead.id || lead.emailSent}
                      className="flex-1 gap-2"
                    >
                      {sendingId === lead.id ? 'Sending...' : lead.emailSent ? 'Sent' : 'Send via Zoho'}
                    </Button>
                    <Button
                      onClick={() => setFeedback((prev) => ({ ...prev, [lead.id]: 'liked' }))}
                      variant={feedback[lead.id] === 'liked' ? 'default' : 'outline'}
                      size="icon"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setFeedback((prev) => ({ ...prev, [lead.id]: 'disliked' }))}
                      variant={feedback[lead.id] === 'disliked' ? 'destructive' : 'outline'}
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
                    <TabsTrigger value="openRate">Next Steps</TabsTrigger>
                  </TabsList>

                  <TabsContent value="strategy" className="space-y-3 pt-4">
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">Problem-Focused</p>
                      <p className="text-sm text-muted-foreground">
                        Lead with a pain the prospect has voiced. Keep pitch light and resource-first until email integration is live.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">Soft CTA</p>
                      <p className="text-sm text-muted-foreground">
                        Invite them to review a resource or a short outline; avoid hard asks until you can send directly.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="personalization" className="space-y-3 pt-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                      {draft.talkingPoints.map((point, idx) => (
                        <p key={idx} className="text-sm">
                          <span className="font-semibold text-primary">Point {idx + 1}:</span> {point}
                        </p>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="openRate" className="space-y-3 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Sending is currently disabled. Once email delivery is connected, this draft will be queued for send via Gemini.
                    </p>
                  </TabsContent>
                </Tabs>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
