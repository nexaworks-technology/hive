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

  useEffect(() => {
    const unsubscribe = workflowManager.subscribe(setWorkflowState);
    return unsubscribe;
  }, []);

  if (!workflowState) return null;

  // Combine current leads with historical leads
  const allLeads = [
    ...workflowState.leads,
    ...workflowState.campaignHistory.flatMap((campaign) => campaign.leads),
  ];

  const sentLog = workflowState.sentEmails || [];

  if (allLeads.length === 0) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">History</h1>
          <p className="text-sm text-muted-foreground mt-2">View all past leads and campaigns</p>
        </div>

        <Card className="p-12 border-border bg-secondary text-center">
          <Clock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">No leads history yet. Start a campaign to see results here.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">History</h1>
        <p className="text-sm text-muted-foreground mt-2">View all past leads and campaigns</p>
      </div>

      <Card className="p-6 border-border bg-secondary/50">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Recent Sends</h3>
        </div>
        {sentLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">No emails sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Email</TableHead>
                  <TableHead className="text-foreground">Company</TableHead>
                  <TableHead className="text-foreground">Subject</TableHead>
                  <TableHead className="text-foreground">Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentLog.slice().reverse().map((entry) => (
                  <TableRow key={entry.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{entry.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{entry.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{entry.company}</TableCell>
                    <TableCell className="text-muted-foreground text-sm truncate max-w-[260px]">
                      {entry.subject || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(entry.sentAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card className="p-6 border-border bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">All Leads ({allLeads.length})</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground">Name</TableHead>
                <TableHead className="text-foreground">Company</TableHead>
                <TableHead className="text-foreground">Email</TableHead>
                <TableHead className="text-foreground flex items-center gap-1">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </TableHead>
                <TableHead className="text-foreground flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email Sent
                </TableHead>
                <TableHead className="text-foreground flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  Replied
                </TableHead>
                <TableHead className="text-foreground flex items-center gap-1">
                  <Repeat2 className="w-4 h-4" />
                  Follow-ups
                </TableHead>
                <TableHead className="text-foreground">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allLeads.map((lead) => (
                <TableRow key={lead.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{lead.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{lead.company}</TableCell>
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
                      onClick={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      {expandedLeadId === lead.id ? 'Hide' : 'View'}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Expanded Lead Details */}
      {expandedLeadId && (
        <Card className="p-6 border-border bg-secondary/50">
          <div className="space-y-4">
            {(() => {
              const lead = allLeads.find((l) => l.id === expandedLeadId);
              if (!lead) return null;

              return (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{lead.name}</h3>
                    <p className="text-sm text-muted-foreground">{lead.title} at {lead.company}</p>
                  </div>

                  {lead.personalizationDetails && (
                    <div className="pt-4 border-t border-border">
                      <h4 className="font-semibold text-foreground mb-2">Personalization Details</h4>
                      <p className="text-sm text-muted-foreground">{lead.personalizationDetails}</p>
                    </div>
                  )}

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
