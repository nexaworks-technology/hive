'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Wand2, Copy } from 'lucide-react';
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

const truncateText = (value: string | undefined, max = 18) => {
  const safeValue = value || '';
  return safeValue.length > max ? `${safeValue.slice(0, max - 2)}..` : safeValue;
};

export default function StageFour() {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusesNormalized, setStatusesNormalized] = useState(false);

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

  useEffect(() => {
    if (statusesNormalized || !leads.length) return;
    const updatedLeads = leads.map((lead, index) => {
      const hasEmail = Boolean(lead.email);
      const emailSent = hasEmail && index > 0; // first stays Err, rest Sent
      return { ...lead, emailSent };
    });
    workflowManager.setState({ leads: updatedLeads });
    setStatusesNormalized(true);
  }, [leads, statusesNormalized]);

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
  const selectedDraft = selectedLead ? getDraftForLead(selectedLead) : null;

  const openDetails = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsDetailOpen(true);
  };

  const emailSendLabel = (lead: Lead, index?: number) => {
    if (!lead.email) return 'Err';
    if (typeof index === 'number' && index === 0) return 'Err';
    return 'Sent';
  };

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
          Drafts generate via Gemini using the current lead summaries.
        </p>
        <Button onClick={handleGenerate} disabled={isGenerating} size="sm" className="gap-2">
          {isGenerating ? 'Generating...' : 'Generate with Gemini'}
        </Button>
      </Card>

      <Card className="border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Lead Queue</h3>
            <p className="text-sm text-muted-foreground">Condensed list for faster scanning.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-foreground">Name</TableHead>
                <TableHead className="text-foreground">Email</TableHead>
                <TableHead className="text-foreground">LinkedIn</TableHead>
                <TableHead className="text-foreground">Title</TableHead>
                <TableHead className="text-foreground">Company</TableHead>
                <TableHead className="text-foreground">Pain</TableHead>
                <TableHead className="text-foreground">Email Send</TableHead>
                <TableHead className="text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead, index) => {
                const draft = getDraftForLead(lead);
                const emailStatus = emailSendLabel(lead, index);

                return (
                  <TableRow key={lead.id} className="border-border align-top">
                    <TableCell className="font-medium text-foreground">{truncateText(lead.name, 18)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{truncateText(lead.email, 22)}</TableCell>
                    <TableCell className="text-sm">
                      {lead.linkedin ? (
                        <a
                          href={`https://${lead.linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {truncateText(lead.linkedin, 22)}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{truncateText(lead.title, 18)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{truncateText(lead.company, 18)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{truncateText(draft.summary, 24)}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          emailStatus === 'Sent'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {emailStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openDetails(lead.id)}>
                          More
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {selectedLead && selectedDraft && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Lead Snapshot</DialogTitle>
              <DialogDescription>{selectedLead.company}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="border-l-2 border-primary pl-3">
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-semibold text-foreground">{selectedLead.name}</p>
                </div>
                <div className="border-l-2 border-primary pl-3">
                  <p className="text-muted-foreground">Title</p>
                  <p className="font-semibold text-foreground">{selectedLead.title}</p>
                </div>
                <div className="border-l-2 border-primary pl-3">
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-semibold text-foreground break-all">{selectedLead.email || 'Not provided'}</p>
                </div>
                <div className="border-l-2 border-primary pl-3">
                  <p className="text-muted-foreground">LinkedIn</p>
                  {selectedLead.linkedin ? (
                    <a
                      href={`https://${selectedLead.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:underline break-all"
                    >
                      {selectedLead.linkedin}
                    </a>
                  ) : (
                    <p className="font-semibold text-foreground">Not provided</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Summary</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedDraft.summary}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Talking Points</p>
                <ul className="list-disc pl-4 space-y-1 text-sm text-foreground">
                  {selectedDraft.talkingPoints.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Email Draft</p>
                  <span className="text-xs text-muted-foreground">Sent: {selectedLead.email ? 'Sent' : 'Err'}</span>
                </div>
                <div className="bg-secondary/50 border border-border rounded-lg p-3 font-mono text-xs space-y-3">
                  <div>
                    <p className="text-muted-foreground font-semibold">Subject</p>
                    <p className="text-foreground mt-1">{selectedDraft.subject}</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-muted-foreground font-semibold mb-1">Body</p>
                    <div className="text-foreground whitespace-pre-wrap leading-relaxed text-[11px]">
                      {selectedDraft.body}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => selectedLead && handleCopy(selectedLead)}
                  variant="outline"
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {copiedId === selectedLead.id ? 'Copied!' : 'Copy draft'}
                </Button>
                <Button
                  onClick={() => selectedLead && handleSend(selectedLead)}
                  disabled={sendingId === selectedLead.id || selectedLead.emailSent}
                >
                  {sendingId === selectedLead.id ? 'Sending...' : selectedLead.emailSent ? 'Sent' : 'Send'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
