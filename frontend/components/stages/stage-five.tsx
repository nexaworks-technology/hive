'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MessageSquare, Calendar, CheckCircle2, Mail, MessageCircle, Repeat2, Video, X } from 'lucide-react';
import { workflowManager, type WorkflowState, type Lead, type Meeting } from '@/lib/workflow-context';
import { toastManager } from '@/components/toast-notification';
import { Clock } from 'lucide-react'; // Import Clock component
import { useSessionContext } from '@/components/auth-provider';

type ReplySentiment = 'Positive' | 'Negative';

const sentimentColors = {
  'Very Interested': 'bg-green-100 text-green-800',
  'Interested': 'bg-yellow-100 text-yellow-800',
  'Neutral': 'bg-gray-100 text-gray-800',
  'Uninterested': 'bg-red-100 text-red-800',
}; // Define sentimentColors object

export default function StageFive() {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [meetingForm, setMeetingForm] = useState({
    date: '',
    time: '',
    meetingType: 'Google Meet' as const,
  });
  const [replySendingId, setReplySendingId] = useState<string | null>(null);
  const apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const { session } = useSessionContext();

  const persistenceLeads = workflowState?.leads.filter((lead) => !lead.replied) || []; // Define persistenceLeads variable
  const hotLeads = workflowState?.leads.filter((lead) => lead.replied && lead.sentiment === 'Very Interested') || []; // Define hotLeads variable

  useEffect(() => {
    const unsubscribe = workflowManager.subscribe(setWorkflowState);
    return unsubscribe;
  }, []);

  // Simulate replies and followups over time
  useEffect(() => {
    if (!workflowState?.emailsDrafted) return;
    if (!workflowState.leads.some((lead) => lead.emailSent)) return; // Only simulate once sends are real

    const intervals: NodeJS.Timeout[] = [];

    // Simulate some leads replying after 8 seconds
    intervals.push(
      setTimeout(() => {
        const updatedLeads = workflowState.leads.map((lead, idx) => {
          if (idx === 0 || idx === 3) {
            return {
              ...lead,
              replied: true,
              sentiment: 'Very Interested' as const,
              followupCount: 0 as const,
            };
          }
          return lead;
        });

        workflowManager.setState({ leads: updatedLeads });

        toastManager.notify({
          title: 'Replies Received',
          message: 'Sarah Johnson and James Rodriguez replied to your email!',
          type: 'success',
        });
      }, 8000)
    );

    // Simulate followups after 12 seconds
    intervals.push(
      setTimeout(() => {
        const updatedLeads = workflowState.leads.map((lead) => {
          if (!lead.replied) {
            return {
              ...lead,
              followupCount: 1 as const,
            };
          }
          return lead;
        });

        workflowManager.setState({ leads: updatedLeads });

        toastManager.notify({
          title: 'Follow-ups Sent',
          message: 'Automatic follow-up emails sent to non-responders.',
          type: 'info',
        });
      }, 12000)
    );

    return () => {
      intervals.forEach(clearTimeout);
    };
  }, [workflowState?.emailsDrafted]);

  // Persist leads + engagement to backend once sends are underway so follow-up can be revisited later.
  useEffect(() => {
    if (!workflowState?.currentCampaignId) return;
    if (!workflowState.leads.some((lead) => lead.emailSent)) return;

    const persistProgress = async () => {
      try {
        const stats = {
          leadsScraped: workflowState.leads.length,
          emailsSent: workflowState.leads.filter((l) => l.emailSent).length,
          repliesReceived: workflowState.leads.filter((l) => l.replied).length,
          meetingsScheduled: workflowState.leads.filter((l) => l.meeting).length,
        };

        await fetch(`${apiBaseUrl}/campaigns/${workflowState.currentCampaignId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            stage: 'stage-5',
            status: 'follow-up',
            payload: {
              leads: workflowState.leads,
              sentEmails: workflowState.sentEmails,
              stats,
            },
          }),
        });
      } catch (err) {
        console.error('Failed to persist campaign progress', err);
      }
    };

    persistProgress();
  }, [apiBaseUrl, session, workflowState?.currentCampaignId, workflowState?.leads, workflowState?.sentEmails]);

  const buildReplyDraft = (lead: Lead, sentiment: ReplySentiment) => {
    const firstName = lead.name.split(' ')[0] || 'there';

    if (sentiment === 'Positive') {
      const subject = 'Great to hear it — pick a time';
      const body = `Hi ${firstName},

Great to hear that you’re interested. Let’s lock a quick sync (15-20 mins):
- Tomorrow, 10:00 AM
- Tomorrow, 2:00 PM
- Day after tomorrow, 11:00 AM

Reply with the slot that works best (or share your preferred time) and I’ll send a Meet link right away.`;
      return { subject, body };
    }

    const subject = 'Thanks for letting me know';
    const body = `Hi ${firstName},

Appreciate the quick response. I’ll pause outreach for now. If priorities change or you want a 10-minute rundown, I’m happy to help.`;
    return { subject, body };
  };

  const handleSendReply = async (lead: Lead, sentiment: ReplySentiment) => {
    if (replySendingId) return;
    setReplySendingId(lead.id);

    const draft = buildReplyDraft(lead, sentiment);
    const loadingToastId = toastManager.notify({
      title: 'Sending reply...',
      message: `Delivering to ${lead.email}`,
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
        const parts = [details.error || 'Failed to send reply'];
        throw new Error(parts.join(' | '));
      }

      const updatedLeads = workflowState?.leads.map((l) =>
        l.id === lead.id
          ? { ...l, replied: true, replySentiment: sentiment, replyText: draft.body }
          : l
      ) || [];

      const state = workflowManager.getState();
      const updatedSent = [
        ...(state.sentEmails || []),
        {
          id: `reply-${Date.now()}-${lead.id}`,
          leadId: lead.id,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          subject: draft.subject,
          sentAt: new Date().toISOString(),
        },
      ];

      workflowManager.setState({ leads: updatedLeads, sentEmails: updatedSent });

      toastManager.notify({
        title: 'Reply sent',
        message: `Sent to ${lead.email}.`,
        type: 'success',
      });
    } catch (err) {
      toastManager.notify({
        title: 'Reply failed',
        message: (err as Error).message || 'Unexpected error',
        type: 'error',
      });
    } finally {
      if (loadingToastId) toastManager.remove(loadingToastId);
      setReplySendingId(null);
    }
  };

  if (!workflowState?.leads.length) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">The Closing</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage follow-ups and engage with hot leads
          </p>
        </div>

        <Card className="p-8 border-border bg-secondary text-center">
          <p className="text-muted-foreground mb-4">
            Complete the previous stages to see your leads and engagement status
          </p>
        </Card>
      </div>
    );
  }

  const leads = workflowState.leads;
  const selectedLead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">The Closing</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Monitor engagement and schedule meetings with hot leads
        </p>
      </div>

      <Card className="p-6 border-border bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Leads Overview & Engagement Tracking
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Drafts are ready but not sent. Once sending is enabled, this table will track engagement and meetings.
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground">Name</TableHead>
                <TableHead className="text-foreground">Company</TableHead>
                <TableHead className="text-foreground">Email</TableHead>
                <TableHead className="text-foreground text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="text-xs">Sent</div>
                </TableHead>
                <TableHead className="text-foreground text-center">
                  <div className="flex items-center justify-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="text-xs">Replied</div>
                </TableHead>
                <TableHead className="text-foreground text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Repeat2 className="w-4 h-4" />
                  </div>
                  <div className="text-xs">Follow-ups</div>
                </TableHead>
                <TableHead className="text-foreground text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="text-xs">Meeting</div>
                </TableHead>
                <TableHead className="text-foreground text-center">
                  <div className="text-xs">Time</div>
                </TableHead>
                <TableHead className="text-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} className="border-border hover:bg-secondary/20">
                  <TableCell className="font-medium text-foreground">{lead.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{lead.company}</TableCell>
                  <TableCell className="text-muted-foreground text-sm text-xs">{lead.email}</TableCell>
                  <TableCell className="text-center">
                    {lead.emailSent ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary inline-block">
                        ✓
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground inline-block">
                        ✗
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {lead.replied ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent inline-block">
                        ✓
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground inline-block">
                        ✗
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {lead.followupCount > 0 ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary inline-block">
                        {lead.followupCount}x
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground inline-block">
                        -
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {lead.meeting ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary inline-block">
                        ✓ Scheduled
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground inline-block">
                        -
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {lead.meeting ? lead.meeting.time : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      {lead.meeting ? (
                        lead.meeting.meetingLink ? (
                          <Button
                            size="sm"
                            className="gap-2 bg-accent/10 text-accent hover:bg-accent/20"
                            variant="ghost"
                            asChild
                          >
                            <a href={lead.meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                              <Video className="w-3 h-3" />
                              Join
                            </a>
                          </Button>
                        ) : (
                          <Button size="sm" className="gap-2" variant="outline" disabled>
                            <Video className="w-3 h-3" />
                            Link pending
                          </Button>
                        )
                      ) : lead.replied ? (
                        <Button
                          onClick={() => {
                            setSelectedLeadId(lead.id);
                            setShowCalendarModal(true);
                          }}
                          size="sm"
                          variant="outline"
                          className="gap-2"
                        >
                          <Calendar className="w-3 h-3" />
                          Schedule
                        </Button>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendReply(lead, 'Positive')}
                          disabled={replySendingId === lead.id}
                        >
                          {replySendingId === lead.id ? 'Sending...' : 'Send slots reply'}
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Meeting Scheduler Modal */}
      {showCalendarModal && selectedLeadId && (
        <Card className="p-6 border-border bg-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-foreground">{leads.find((l) => l.id === selectedLeadId)?.name}</h3>
              <p className="text-sm text-muted-foreground">{leads.find((l) => l.id === selectedLeadId)?.company}</p>
            </div>
            <button
              onClick={() => {
                setShowCalendarModal(false);
                setMeetingForm({ date: '', time: '', meetingType: 'Google Meet' });
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Preferred Date
              </label>
              <input
                type="date"
                value={meetingForm.date}
                onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Time
              </label>
              <select
                value={meetingForm.time}
                onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              >
                <option value="">Select time</option>
                <option value="9:00 AM - 10:00 AM">9:00 AM - 10:00 AM</option>
                <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</option>
                <option value="2:00 PM - 3:00 PM">2:00 PM - 3:00 PM</option>
                <option value="3:00 PM - 4:00 PM">3:00 PM - 4:00 PM</option>
                <option value="4:00 PM - 5:00 PM">4:00 PM - 5:00 PM</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Meeting Type
              </label>
              <select
                value={meetingForm.meetingType}
                onChange={(e) => setMeetingForm({ ...meetingForm, meetingType: e.target.value as any })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              >
                <option value="Google Meet">Google Meet</option>
                <option value="Zoom">Zoom</option>
                <option value="Phone Call">Phone Call</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  if (!meetingForm.date || !meetingForm.time) {
                    toastManager.notify({
                      title: 'Please fill all fields',
                      message: 'Date and time are required',
                      type: 'error',
                    });
                    return;
                  }

                  // Update lead with meeting
                  const updatedLeads = workflowState.leads.map((lead) => {
                    if (lead.id === selectedLeadId) {
                      return {
                        ...lead,
                        meeting: {
                          id: `meeting-${lead.id}`,
                          leadId: lead.id,
                          date: meetingForm.date,
                          time: meetingForm.time,
                          meetingType: meetingForm.meetingType,
                          meetingLink: meetingForm.meetingType === 'Phone Call' ? undefined : `https://meet.google.com/${selectedLeadId}`,
                        },
                      };
                    }
                    return lead;
                  });

                  workflowManager.setState({ leads: updatedLeads });

                  toastManager.notify({
                    title: 'Meeting Scheduled',
                    message: `Meeting scheduled with ${leads.find((l) => l.id === selectedLeadId)?.name} on ${meetingForm.date}`,
                    type: 'success',
                  });

                  setShowCalendarModal(false);
                  setMeetingForm({ date: '', time: '', meetingType: 'Google Meet' });
                }}
                className="flex-1 gap-2"
              >
                <Calendar className="w-4 h-4" />
                Schedule Meeting
              </Button>
              <Button
                onClick={() => {
                  setShowCalendarModal(false);
                  setMeetingForm({ date: '', time: '', meetingType: 'Google Meet' });
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 border-border bg-secondary/50">
        <h3 className="text-lg font-semibold text-foreground mb-3">Automated Workflow</h3>
        <ul className="space-y-2 text-sm text-foreground">
          <li className="flex gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            Emails sent to all leads automatically
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            Replies monitored and tracked in real-time
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            Follow-ups sent automatically to non-respondents
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            Your only task: Attend scheduled meetings
          </li>
        </ul>
      </Card>
    </div>
  );
}
