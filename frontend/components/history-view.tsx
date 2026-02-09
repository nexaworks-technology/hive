'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { workflowManager, type WorkflowState, type Lead } from '@/lib/workflow-context';
import { Clock, Mail, MessageCircle, Repeat2, Linkedin, Send } from 'lucide-react';

export default function HistoryView() {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [remoteCampaigns, setRemoteCampaigns] = useState<any[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  useEffect(() => {
    const unsubscribe = workflowManager.subscribe(setWorkflowState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchCampaigns = async () => {
      setIsLoadingRemote(true);
      try {
        const res = await fetch(`${apiBaseUrl}/campaigns`);
        if (!res.ok) throw new Error('Failed to fetch campaigns');
        const payload = await res.json().catch(() => ({}));
        setRemoteCampaigns(payload.campaigns || []);
      } catch (err) {
        console.error('Failed to load campaigns', err);
      } finally {
        setIsLoadingRemote(false);
      }
    };

    fetchCampaigns();
  }, [apiBaseUrl]);

  if (!workflowState) return null;

  const campaignSource = (remoteCampaigns.length ? remoteCampaigns : workflowState.campaignHistory) || [];
  const activeCampaign = campaignSource.find((c) => c.id === workflowState.currentCampaignId) || campaignSource[0];
  const campaignTitle = activeCampaign?.title || activeCampaign?.targetAudience || 'History';

  // Combine current leads with historical leads (from backend payload when available)
  const selectedCampaignLeads = activeCampaign
    ? ((activeCampaign.payload?.leads as Lead[]) || (activeCampaign.leads as Lead[]) || [])
    : [];

  const includeCurrent = workflowState.currentCampaignId && activeCampaign?.id === workflowState.currentCampaignId;
  const combinedLeads = includeCurrent ? [...workflowState.leads, ...selectedCampaignLeads] : selectedCampaignLeads;

  const sentEmailsByEmail = new Set((workflowState.sentEmails || []).map((e) => (e.email || '').toLowerCase()).filter(Boolean));

  // De-dupe and merge, prefer latest send status or sent log
  const mergedOrder: string[] = [];
  const mergedMap = new Map<string, Lead>();

  combinedLeads.forEach((lead, idx) => {
    const key = (lead.id || '').toString().trim() || (lead.email || '').toLowerCase() || `idx-${idx}`;
    const existing = mergedMap.get(key);

    const emailSent = Boolean(
      lead.emailSent || existing?.emailSent || (lead.email && sentEmailsByEmail.has(lead.email.toLowerCase())) || (existing?.email && sentEmailsByEmail.has(existing.email.toLowerCase()))
    );

    const merged: Lead = {
      ...existing,
      ...lead,
      emailSent,
      replied: lead.replied ?? existing?.replied ?? false,
      followupCount: lead.followupCount ?? existing?.followupCount ?? 0,
    } as Lead;

    if (!existing) mergedOrder.push(key);
    mergedMap.set(key, merged);
  });

  const allLeads = mergedOrder.map((key) => mergedMap.get(key)!).filter(Boolean);

  const leadKey = (lead: Lead, idx: number) => (lead.id || lead.email || `lead-${idx}`).toString();

  const sentLog = workflowState.sentEmails || [];

  if (allLeads.length === 0) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{campaignTitle}</h1>
          <p className="text-sm text-muted-foreground mt-2">{isLoadingRemote ? 'Loading stored campaigns...' : 'View all past leads and campaigns'}</p>
        </div>

        <Card className="p-12 border-border bg-secondary text-center">
          <Clock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isLoadingRemote ? 'Loading stored campaigns...' : 'No leads history yet. Start a campaign to see results here.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{campaignTitle}</h1>
        <p className="text-sm text-muted-foreground mt-2">Follow-ups, replies, and meetings for this campaign</p>
      </div>

      <Card className="p-6 border-border bg-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">All Leads ({allLeads.length})</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
                <TableRow className="border-border hover:bg-transparent text-sm">
                  <TableHead className="text-foreground whitespace-nowrap">Name</TableHead>
                  <TableHead className="text-foreground whitespace-nowrap w-48">Company</TableHead>
                  <TableHead className="text-foreground whitespace-nowrap">Email</TableHead>
                  <TableHead className="text-foreground whitespace-nowrap">
                    <span className="flex items-center gap-2 justify-start">
                      <Linkedin className="w-4 h-4" />
                      LinkedIn
                    </span>
                  </TableHead>
                  <TableHead className="text-foreground whitespace-nowrap">
                    <span className="flex items-center gap-2 justify-start">
                      <Mail className="w-4 h-4" />
                      Email Sent
                    </span>
                  </TableHead>
                  <TableHead className="text-foreground whitespace-nowrap">
                    <span className="flex items-center gap-2 justify-start">
                      <MessageCircle className="w-4 h-4" />
                      Replied
                    </span>
                  </TableHead>
                  <TableHead className="text-foreground whitespace-nowrap">
                    <span className="flex items-center gap-2 justify-start">
                      <Repeat2 className="w-4 h-4" />
                      Follow-ups
                    </span>
                  </TableHead>
                  <TableHead className="text-foreground whitespace-nowrap">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allLeads.map((lead, idx) => {
                const key = leadKey(lead, idx);
                return (
                <TableRow key={key} className="border-border">
                  <TableCell className="font-medium text-foreground">{lead.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate whitespace-nowrap">{lead.company}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{lead.email}</TableCell>
                  <TableCell>
                    <a
                      href={lead.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm flex items-center gap-1"
                    >
                      <Linkedin className="w-3 h-3" />
                      Profile
                    </a>
                  </TableCell>
                  <TableCell>
                    {lead.emailSent ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                        ✓ Yes
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        No
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.replied ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent">
                        ✓ Yes
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        No
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.followupCount > 0 ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                        {lead.followupCount}x
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        -
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => setExpandedLeadId(expandedLeadId === key ? null : key)}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      {expandedLeadId === key ? 'Hide' : 'View'}
                    </button>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Expanded Lead Details */}
      {expandedLeadId && (
        <Card className="p-6 border-border bg-secondary/50">
          <div className="space-y-4">
            {(() => {
              const lead = allLeads.find((l, idx) => leadKey(l, idx) === expandedLeadId);
              if (!lead) return null;

              return (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{lead.name}</h3>
                    <p className="text-sm text-muted-foreground">{lead.title} at {lead.company}</p>
                    {lead.summary && (
                      <p className="text-sm text-muted-foreground mt-2">{lead.summary}</p>
                    )}
                    {lead.talkingPoints && lead.talkingPoints.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold text-foreground">Talking points</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {lead.talkingPoints.map((point, idx) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {lead.personalizationDetails && (
                    <div className="pt-4 border-t border-border">
                      <h4 className="font-semibold text-foreground mb-2">Personalization Details</h4>
                      <p className="text-sm text-muted-foreground">{lead.personalizationDetails}</p>
                    </div>
                  )}

                  {(() => {
                    const sentForLead = (workflowState.sentEmails || []).filter(
                      (e) => e.leadId === lead.id || (!!lead.email && e.email === lead.email)
                    );
                    if (!sentForLead.length) return null;
                    return (
                      <div className="pt-4 border-t border-border">
                        <h4 className="font-semibold text-foreground mb-2">Emails Sent</h4>
                        <div className="space-y-3">
                          {sentForLead.map((msg) => (
                            <div key={msg.id} className="p-3 bg-card border border-border rounded-lg">
                              <p className="text-sm text-foreground font-medium">{msg.subject || 'No subject'}</p>
                              <p className="text-xs text-muted-foreground mt-1">{new Date(msg.sentAt).toLocaleString()}</p>
                              {msg.body && (
                                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap break-words">{msg.body}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {lead.followupEmails && lead.followupEmails.length > 0 && (
                    <div className="pt-4 border-t border-border">
                      <h4 className="font-semibold text-foreground mb-3">Follow-up Emails</h4>
                      <div className="space-y-3">
                        {lead.followupEmails.map((email, idx) => (
                          <div key={idx} className="p-3 bg-card border border-border rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Follow-up #{idx + 1}</p>
                            <p className="text-sm text-foreground">{email}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {lead.meeting && (
                    <div className="pt-4 border-t border-border">
                      <h4 className="font-semibold text-foreground mb-2">Meeting Scheduled</h4>
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-sm text-foreground">
                          <strong>Date:</strong> {lead.meeting.date}
                        </p>
                        <p className="text-sm text-foreground">
                          <strong>Time:</strong> {lead.meeting.time}
                        </p>
                        <p className="text-sm text-foreground">
                          <strong>Type:</strong> {lead.meeting.meetingType}
                        </p>
                        {lead.meeting.meetingLink && (
                          <p className="text-sm text-foreground">
                            <strong>Link:</strong>{' '}
                            <a href={lead.meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              Join Meeting
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </Card>
      )}
    </div>
  );
}
