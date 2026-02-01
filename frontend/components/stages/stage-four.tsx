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
    email: 'sahil@nexaworks.tech',
    linkedin: 'linkedin.com/in/sample',
    emailSent: false,
    replied: false,
    followupCount: 0,
    summary: 'Looking for steadier outbound performance; open to concise pilots.',
    talkingPoints: ['Keep pitch light', 'Offer a low-risk pilot', 'Share one data point'],
  },
];

const demoLeads: Lead[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    title: 'Lead Generation Manager',
    company: 'Phoenix Digital',
    email: 'pavanfg1@gmail.com',
    linkedin: 'linkedin.com/in/sarahjohnson',
    emailSent: false,
    replied: false,
    followupCount: 0,
    summary: 'Runs lead gen at a boutique agency; recently shared concerns about lead quality consistency.',
    talkingPoints: [
      'Reference her LinkedIn post on lead quality',
      'Offer ideas on validation and scoring',
      'Keep tone consultative, not salesy',
    ],
  },
  {
    id: '2',
    name: 'Michael Chen',
    title: 'Operations Director',
    company: 'Growth Catalyst Ltd',
    email: 'pavanbabar319@gmail.com',
    linkedin: 'linkedin.com/in/michaelchen',
    emailSent: false,
    replied: false,
    followupCount: 0,
    summary: 'Ops lead focused on throughput; looking for predictable pipeline health.',
    talkingPoints: [
      'Mention ops throughput and predictable pipeline',
      'Offer one concrete process tweak',
      'Invite him to review a short system map',
    ],
  },
  {
    id: '3',
    name: 'Emma Williams',
    title: 'Head of Sales',
    company: 'Outreach Pro',
    email: 'testppb013@gmail.com',
    linkedin: 'linkedin.com/in/emmawilliams',
    emailSent: false,
    replied: false,
    followupCount: 0,
    summary: 'Sales leader aiming to lift reply rates without ballooning manual work.',
    talkingPoints: [
      'Show how to improve replies without extra headcount',
      'Point to a similar sales org win',
      'Offer a ready-to-use opener',
    ],
  },
  {
    id: '4',
    name: 'James Rodriguez',
    title: 'Business Development',
    company: 'London Lead Systems',
    email: 'pavan@nexaworks.tech',
    linkedin: 'linkedin.com/in/jamesrodriguez',
    emailSent: false,
    replied: false,
    followupCount: 0,
    summary: 'BD rep juggling volume; wants outreach that feels personal but is fast.',
    talkingPoints: [
      'Lean on speed + personalization balance',
      'Share a template he can reuse',
      'Offer a quick test on 10 contacts',
    ],
  },
  {
    id: '5',
    name: 'Lisa Park',
    title: 'Sales Director',
    company: 'DataDrive Solutions',
    email: 'sahil@nexaworks.tech',
    linkedin: 'linkedin.com/in/lisapark',
    emailSent: false,
    replied: false,
    followupCount: 0,
    summary: 'Data-minded director; cares about attributable pipeline.',
    talkingPoints: [
      'Emphasize measurable pipeline contribution',
      'Reference data cleanliness for attribution',
      'Suggest a small AB test',
    ],
  },
  {
    id: '6',
    name: 'David Turner',
    title: 'VP Growth',
    company: 'Scale Intelligence',
    email: 'pavanfg1@gmail.com',
    linkedin: 'linkedin.com/in/davidturner',
    emailSent: false,
    replied: false,
    followupCount: 0,
    summary: 'Growth lead focused on repeatable plays; open to experiments that de-risk.',
    talkingPoints: [
      'Highlight repeatability and experiment design',
      'Offer a low-risk pilot',
      'Share a benchmark result',
    ],
  },
];

const truncateText = (value: string | undefined, max = 18) => {
  const safeValue = value || '';
  return safeValue.length > max ? `${safeValue.slice(0, max - 2)}..` : safeValue;
};

const buildFallbackDraft = (lead: Lead): LeadDraft => {
  const name = lead.name.split(' ')[0] || 'there';
  const summary = lead.summary || 'Prospect with recent activity worth a tailored note.';
  const points = lead.talkingPoints && lead.talkingPoints.length
    ? lead.talkingPoints.join('; ')
    : 'Keep it short, mention one pain, offer a quick next step.';

  return {
    subject: `Quick idea for ${lead.company}`,
    body: `Hi ${name},\n\nNoticed ${lead.company} and your role as ${lead.title}. ${summary}\n\nA simple tweak could help: ${points}.\n\nIf helpful, I can share a 3-step outline. Interested?`,
    summary,
    talkingPoints: lead.talkingPoints || [],
  };
};

export default function StageFour() {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [autoGenerateTriggered, setAutoGenerateTriggered] = useState(false);
  const [autoSendTriggered, setAutoSendTriggered] = useState(false);
  const [autoDemoLoaded, setAutoDemoLoaded] = useState(false);

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
    return demoLeads;
  }, [workflowState?.leads]);

  const loadDemoLeads = () => {
    const leadsWithDrafts = demoLeads.map((lead) => ({
      ...lead,
      draftEmail: buildFallbackDraft(lead),
    }));

    workflowManager.setState({
      leads: leadsWithDrafts,
      emailsDrafted: true,
      currentStage: 'stage-4',
    });

    toastManager.notify({
      title: 'Loaded provided leads',
      message: 'Using your provided emails with placeholder drafts.',
      type: 'success',
    });
  };

  useEffect(() => {
    if (autoDemoLoaded) return;
    if (!workflowState?.leads?.length) {
      setAutoDemoLoaded(true);
      loadDemoLeads();
    }
  }, [workflowState?.leads?.length, autoDemoLoaded]);

  const sentEmails = workflowState?.sentEmails || [];

  useEffect(() => {
    if (!selectedLeadId && leads.length) {
      setSelectedLeadId(leads[0].id);
    }
  }, [leads, selectedLeadId]);

  useEffect(() => {
    if (!leads.length || workflowState?.emailsDrafted || autoGenerateTriggered) return;
    setAutoGenerateTriggered(true);
    handleGenerate().catch((err) => {
      console.error('Auto-generate failed', err);
      setAutoGenerateTriggered(false);
    });
  }, [leads.length, workflowState?.emailsDrafted, autoGenerateTriggered]);

  useEffect(() => {
    if (!workflowState?.emailsDrafted || autoSendTriggered) return;
    setAutoSendTriggered(true);

    const sendAll = async () => {
      for (const lead of leads) {
        if (!lead.emailSent && lead.email && !lead.id.startsWith('fallback')) {
          await handleSend(lead);
        }
      }
    };

    sendAll().catch((err) => {
      console.error('Auto-send failed', err);
      setAutoSendTriggered(false);
    });
  }, [workflowState?.emailsDrafted, autoSendTriggered, leads]);

  const getDraftForLead = (lead: Lead): LeadDraft => {
    if (lead.draftEmail?.subject && lead.draftEmail?.body) {
      return {
        subject: lead.draftEmail.subject,
        body: lead.draftEmail.body,
        summary:
          lead.summary ||
          'Concise summary not provided. Draft kept lightweight for review before sending.',
        talkingPoints: lead.talkingPoints || [],
      };
    }

    return {
      summary:
        lead.summary ||
        'Concise summary not provided. Draft uses placeholder content while Gemini is paused.',
      talkingPoints: lead.talkingPoints || [],
      subject: '',
      body: '',
    };
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const loadingToastId = toastManager.notify({
      title: 'Preparing placeholder drafts...',
      message: 'Gemini is paused; creating simple drafts locally.',
      type: 'loading',
      duration: 0,
    });

    const updatedLeads = leads.map((lead) => ({
      ...lead,
      draftEmail: buildFallbackDraft(lead),
    }));

    workflowManager.setState({ leads: updatedLeads, emailsDrafted: true, currentStage: 'stage-4' });

    toastManager.notify({
      title: 'Drafts ready',
      message: 'Using placeholder drafts while Gemini is paused.',
      type: 'success',
    });

    if (loadingToastId) {
      toastManager.remove(loadingToastId);
    }
    setIsGenerating(false);
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
    if (!draft.subject || !draft.body) {
      toastManager.notify({ title: 'Draft missing', message: 'Generate drafts before sending.', type: 'error' });
      return;
    }
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
      const state = workflowManager.getState();
      const updatedSent = [
        ...(state.sentEmails || []),
        {
          id: `send-${Date.now()}-${lead.id}`,
          leadId: lead.id,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          subject: draft.subject,
          sentAt: new Date().toISOString(),
        },
      ];

      workflowManager.setState({ leads: updatedLeads, currentStage: 'stage-5', sentEmails: updatedSent });

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
          Review placeholder outreach emails while Gemini is paused. Sending flows through SMTP.
        </p>
      </div>

      <Card className="p-4 border-border bg-secondary/50 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Drafts use simple placeholder text until Gemini is re-enabled.
        </p>
        <Button onClick={handleGenerate} disabled={isGenerating} size="sm" className="gap-2">
          {isGenerating ? 'Generating...' : 'Generate placeholders'}
        </Button>
        <Button onClick={loadDemoLeads} variant="outline" size="sm" className="gap-2">
          Load provided leads
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

      <Card className="p-4 border-border bg-secondary/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-foreground">Recently Sent</h3>
          <span className="text-xs text-muted-foreground">Live during this session</span>
        </div>
        {sentEmails.length === 0 ? (
          <p className="text-sm text-muted-foreground">No emails sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Email</TableHead>
                  <TableHead className="text-foreground">Company</TableHead>
                  <TableHead className="text-foreground">Subject</TableHead>
                  <TableHead className="text-foreground">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentEmails.slice().reverse().slice(0, 6).map((entry) => (
                  <TableRow key={entry.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{truncateText(entry.name, 22)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{truncateText(entry.email, 24)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{truncateText(entry.company, 18)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm truncate max-w-[220px]">
                      {entry.subject || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(entry.sentAt).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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
