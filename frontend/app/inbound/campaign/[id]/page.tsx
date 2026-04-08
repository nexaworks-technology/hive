'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Rocket, Mail, MessageSquare, CalendarCheck, AlertCircle,
  ArrowLeft, Loader2, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, Clock, Send, ExternalLink, Users, Zap,
  Inbox, ThumbsUp, HelpCircle, X, Minus, BotMessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSessionContext } from '@/components/auth-provider';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadRecord {
  id: string;
  name: string;
  email: string;
  company?: string;
  title?: string;
  linkedin?: string;
  emailSent: boolean;
  emailSentAt?: string;
  emailSubject?: string;
  emailBody?: string;
  sendError?: string;
  replied: boolean;
  replyReceivedAt?: string;
  replyText?: string;
  replySubject?: string;
  replyIntent?: 'positive' | 'question' | 'objection' | 'not-interested' | 'out-of-office';
  autoReplySubject?: string;
  autoReplyBody?: string;
  autoReplySent?: boolean;
  autoReplySentAt?: string;
  autoReplyError?: string;
  meetingBooked: boolean;
  meetingEventId?: string;
  meetingLink?: string;
  meetingTime?: string;
  followup1Sent: boolean;
  followup1SentAt?: string;
  followup1SendAt?: string;
  followup2Sent: boolean;
  followup2SentAt?: string;
  followup2SendAt?: string;
}

interface CampaignData {
  campaignId: string;
  title: string;
  createdAt: string;
  status: string;
  settings: { agencyName: string; service: string; ctaStyle: string };
  leads: LeadRecord[];
  stats: { total: number; sent: number; failed: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

const INTENT_META: Record<string, { label: string; color: string; emoji: string }> = {
  positive:      { label: 'Positive',      color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',   emoji: '🟢' },
  question:      { label: 'Question',      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',       emoji: '🔵' },
  objection:     { label: 'Objection',     color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',   emoji: '🟡' },
  'not-interested': { label: 'Not Interested', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',       emoji: '🔴' },
  'out-of-office':  { label: 'Out of Office',  color: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',emoji: '⚪' },
};

function getLeadStatus(lead: LeadRecord): { label: string; color: string } {
  if (lead.meetingBooked)  return { label: 'Meeting Booked', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
  if (lead.replied)        return { label: 'Replied',        color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' };
  if (lead.followup2Sent)  return { label: 'Follow-up 2',   color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
  if (lead.followup1Sent)  return { label: 'Follow-up 1',   color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' };
  if (lead.emailSent)      return { label: 'Sent',           color: 'bg-primary/10 text-primary border-primary/20' };
  if (lead.sendError)      return { label: 'Failed',         color: 'bg-destructive/10 text-destructive border-destructive/20' };
  return { label: 'Pending', color: 'bg-muted text-muted-foreground border-border' };
}

// ─── Collapsible text ─────────────────────────────────────────────────────────

function Expandable({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((p) => !p)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {open ? `Hide ${label}` : `View ${label}`}
      </button>
      {open && <div className="mt-2 animate-in slide-in-from-top-1 duration-150">{children}</div>}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, sub }: { label: string; value: number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Reply Card ───────────────────────────────────────────────────────────────

function ReplyCard({ lead, onMarkBooked, campaignId, onAutoReplySent }: { lead: LeadRecord; onMarkBooked: () => void; campaignId: string; onAutoReplySent: () => void }) {
  const intent = lead.replyIntent || 'question';
  const meta = INTENT_META[intent] || INTENT_META['question'];
  const { session } = useSessionContext();
  const [sendingAutoReply, setSendingAutoReply] = useState(false);

  const handleSendAutoReply = async () => {
    if (!lead.replyText) {
      alert('No reply text to respond to');
      return;
    }

    setSendingAutoReply(true);
    try {
      const res = await fetch(
        `http://localhost:4000/campaigns-v2/${campaignId}/prospects/${lead.id}/send-auto-reply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            replyText: lead.replyText,
            replyIntent: intent
          })
        }
      );

      if (res.ok) {
        const result = await res.json();
        console.log('✅ Auto-reply sent:', result.autoReply.subject);
        alert('✅ Auto-reply sent successfully!');
        onAutoReplySent();
      } else {
        const error = await res.json();
        console.error('❌ Failed to send auto-reply:', error);
        alert('Failed to send auto-reply: ' + (error.details || error.error));
      }
    } catch (err) {
      console.error('Error sending auto-reply:', err);
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSendingAutoReply(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Lead header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{lead.name}</span>
            {lead.title && <span className="text-xs text-muted-foreground">{lead.title}</span>}
            {lead.company && <span className="text-xs text-muted-foreground">@ {lead.company}</span>}
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{lead.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${meta.color}`}>{meta.emoji} {meta.label}</Badge>
          {lead.meetingBooked ? (
            <div className="flex flex-col items-end md:flex-row md:items-center gap-2 ml-2">
              {lead.meetingTime && <span className="text-xs font-medium text-muted-foreground">{formatDate(lead.meetingTime)}</span>}
              {lead.meetingLink && (
                <a href={lead.meetingLink} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1">
                  Join Meet <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ) : (
            intent === 'positive' && (
              <button onClick={onMarkBooked} className="text-xs px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all font-medium ml-2">
                📅 Mark Booked
              </button>
            )
          )}
        </div>
      </div>

      {/* Their reply */}
      <div className="px-5 py-4 border-b border-border bg-muted/20">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3" /> Their Reply {lead.replyReceivedAt && <span className="font-normal normal-case">· {formatDate(lead.replyReceivedAt)}</span>}
        </p>
        {lead.replySubject && <p className="text-xs text-muted-foreground mb-1"><span className="font-medium">Subject:</span> {lead.replySubject}</p>}
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{lead.replyText || '(no body)'}</p>
      </div>

      {/* AI auto-reply */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <BotMessageSquare className="w-3 h-3" /> AI Auto-Reply
            {lead.autoReplySent
              ? <span className="text-green-500 font-normal normal-case flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sent {formatDate(lead.autoReplySentAt)}</span>
              : lead.autoReplyError
              ? <span className="text-destructive font-normal normal-case flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>
              : <span className="text-muted-foreground font-normal normal-case">(not sent)</span>
            }
          </p>
          {!lead.autoReplySent && lead.replyText && (
            <button
              onClick={handleSendAutoReply}
              disabled={sendingAutoReply}
              className="text-xs px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all font-medium disabled:opacity-50"
            >
              {sendingAutoReply ? '⏳ Sending...' : '🤖 Send Auto-Reply'}
            </button>
          )}
        </div>
        
        {lead.autoReplySubject && <p className="text-xs text-muted-foreground mb-1"><span className="font-medium">Subject:</span> {lead.autoReplySubject}</p>}
        {lead.autoReplyBody && <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">{lead.autoReplyBody}</p>}
        {lead.autoReplyError && <p className="text-xs text-destructive mt-1">Error: {lead.autoReplyError}</p>}

        {/* Original email sent (collapsed) */}
        {lead.emailSubject && (
          <div className="mt-3">
            <Expandable label="original email sent">
              <div className="rounded-xl border border-border bg-background text-xs overflow-hidden">
                <div className="px-3 py-2 border-b border-border"><span className="text-muted-foreground">Subject: </span><span className="font-semibold">{lead.emailSubject}</span></div>
                {lead.emailBody && <div className="px-3 py-3 whitespace-pre-wrap text-foreground/70 leading-relaxed">{lead.emailBody}</div>}
              </div>
            </Expandable>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InboundCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSessionContext();
  const [data, setData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSendingFollowup, setIsSendingFollowup] = useState(false);
  const [followupResult, setFollowupResult] = useState<{ sent: number } | null>(null);
  const [isCheckingReplies, setIsCheckingReplies] = useState(false);
  const [checkReplyResult, setCheckReplyResult] = useState<{ newReplies: number } | null>(null);
  const [checkReplyError, setCheckReplyError] = useState<string | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'leads' | 'replies'>('leads');
  const [filter, setFilter] = useState<'all' | 'sent' | 'replied' | 'booked' | 'failed'>('all');

  const safeJson = async (res: Response) => {
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error(`Backend returned non-JSON (${res.status}). Make sure the backend is running.`);
    }
    return res.json();
  };

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`${API_BASE}/inbound/${id}/leads`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const d = await safeJson(res);
      if (!res.ok) throw new Error(d.error || 'Failed to load');
      setData(d);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [id, session]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFollowup = async () => {
    if (!session?.access_token) return;
    setIsSendingFollowup(true);
    setFollowupResult(null);
    try {
      const res = await fetch(`${API_BASE}/inbound/${id}/followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      });
      const result = await safeJson(res);
      setFollowupResult({ sent: result.sent || 0 });
      await fetchData();
    } catch {
      setFollowupResult({ sent: 0 });
    } finally {
      setIsSendingFollowup(false);
    }
  };

  const handleCheckReplies = async () => {
    if (!session?.access_token) return;
    setIsCheckingReplies(true);
    setCheckReplyResult(null);
    setCheckReplyError(null);
    try {
      const res = await fetch(`${API_BASE}/inbound/${id}/check-replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      });
      const result = await safeJson(res);
      if (!res.ok) throw new Error(result.error || 'Check failed');
      setCheckReplyResult({ newReplies: result.newReplies || 0 });
      await fetchData();
      
      // Auto-send replies for all leads with new replies
      if ((result.newReplies || 0) > 0) {
        const updatedData = await (await fetch(`${API_BASE}/inbound/${id}/leads`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })).json();
        
        const leadsWithNewReplies = updatedData.leads.filter(
          (l: LeadRecord) => l.replied && !l.autoReplySent && l.replyText && l.replyIntent
        );
        
        for (const lead of leadsWithNewReplies) {
          try {
            console.log(`🤖 Auto-replying to ${lead.name}...`);
            await fetch(
              `${API_BASE}/campaigns-v2/${id}/prospects/${lead.id}/send-auto-reply`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                  replyText: lead.replyText,
                  replyIntent: lead.replyIntent
                })
              }
            );
            console.log(`✅ Auto-reply sent to ${lead.name}`);
          } catch (err) {
            console.error(`❌ Failed to auto-reply to ${lead.name}:`, err);
          }
        }
        
        // Refresh data to show auto-reply status
        await fetchData();
      }
      
      if ((result.newReplies || 0) > 0) setActiveTab('replies');
    } catch (e: any) {
      setCheckReplyError(e.message || 'Failed to check replies');
    } finally {
      setIsCheckingReplies(false);
    }
  };

  const handleMarkLead = async (leadId: string, field: 'replied' | 'meetingBooked', value: boolean) => {
    if (!session?.access_token) return;
    setUpdatingLeadId(leadId);
    try {
      await fetch(`${API_BASE}/inbound/${id}/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ [field]: value }),
      });
      await fetchData();
    } finally {
      setUpdatingLeadId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <p className="text-muted-foreground">{error || 'Campaign not found'}</p>
          <Button variant="outline" onClick={() => router.push('/inbound')}>← Back to Inbound</Button>
        </div>
      </div>
    );
  }

  const leads = data.leads || [];
  const sentCount    = leads.filter((l) => l.emailSent).length;
  const repliedCount = leads.filter((l) => l.replied).length;
  const bookedCount  = leads.filter((l) => l.meetingBooked).length;
  const failedCount  = leads.filter((l) => l.sendError && !l.emailSent).length;
  const fu1DueCount  = leads.filter((l) => l.emailSent && !l.replied && !l.meetingBooked && !l.followup1Sent && l.followup1SendAt && new Date(l.followup1SendAt) <= new Date()).length;
  const fu2DueCount  = leads.filter((l) => l.followup1Sent && !l.replied && !l.meetingBooked && !l.followup2Sent && l.followup2SendAt && new Date(l.followup2SendAt) <= new Date()).length;
  const followupsDue = fu1DueCount + fu2DueCount;

  const repliedLeads = leads.filter((l) => l.replyReceivedAt);

  const filteredLeads = leads.filter((l) => {
    if (filter === 'sent')    return l.emailSent && !l.replied && !l.meetingBooked;
    if (filter === 'replied') return l.replied;
    if (filter === 'booked')  return l.meetingBooked;
    if (filter === 'failed')  return l.sendError && !l.emailSent;
    return true;
  });

  const replyRate = sentCount > 0 ? Math.round((repliedCount / sentCount) * 100) : 0;

  return (
    <div className="flex-1 min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button onClick={() => router.push('/inbound')} className="mt-1 w-9 h-9 rounded-xl border border-border hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Rocket className="w-4 h-4 text-primary" /></div>
                <h1 className="text-2xl font-bold tracking-tight truncate">{data.title}</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Launched {formatDate(data.createdAt)}
                {data.settings?.agencyName && <> · <span className="font-medium text-foreground">{data.settings.agencyName}</span></>}
                {data.settings?.service && <> · {data.settings.service}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" />Refresh
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Emails Sent"     value={sentCount}    color="bg-primary/10"    icon={<Mail className="w-6 h-6 text-primary" />}           sub={failedCount > 0 ? `${failedCount} failed` : undefined} />
          <StatCard label="Replied"         value={repliedCount} color="bg-green-500/10"  icon={<MessageSquare className="w-6 h-6 text-green-500" />}  sub={replyRate > 0 ? `${replyRate}% reply rate` : undefined} />
          <StatCard label="Meetings Booked" value={bookedCount}  color="bg-purple-500/10" icon={<CalendarCheck className="w-6 h-6 text-purple-500" />} />
          <StatCard label="Total Leads"     value={leads.length} color="bg-muted"         icon={<Users className="w-6 h-6 text-muted-foreground" />} />
        </div>

        {/* Follow-up Banner */}
        {followupsDue > 0 && (
          <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-primary/5 border border-primary/20 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Zap className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="font-semibold text-sm">{followupsDue} follow-up{followupsDue > 1 ? 's' : ''} ready to send</p>
                <p className="text-xs text-muted-foreground">Leads who haven't replied yet — keep the momentum going.</p>
              </div>
            </div>
            <Button onClick={handleFollowup} disabled={isSendingFollowup} size="sm" className="gap-2 flex-shrink-0">
              {isSendingFollowup ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending...</> : <><Send className="w-3.5 h-3.5" />Send Follow-ups</>}
            </Button>
          </div>
        )}

        {followupResult && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {followupResult.sent > 0 ? `Sent ${followupResult.sent} follow-up email${followupResult.sent > 1 ? 's' : ''} successfully.` : 'No follow-ups were due yet.'}
          </div>
        )}

        {/* Tabs: Leads / Replies */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1 w-fit">
          <button onClick={() => setActiveTab('leads')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'leads' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            All Leads <span className="ml-1 text-xs opacity-60">{leads.length}</span>
          </button>
          <button onClick={() => setActiveTab('replies')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'replies' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            Replies
            {repliedLeads.length > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'replies' ? 'bg-primary/10 text-primary' : 'bg-primary/10 text-primary'}`}>{repliedLeads.length}</span>}
          </button>
        </div>

        {/* ── LEADS TAB ── */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                {([['all', 'All'], ['sent', 'Sent'], ['replied', 'Replied'], ['booked', 'Booked'], ['failed', 'Failed']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setFilter(val)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === val ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {filteredLeads.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No leads in this category.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredLeads.map((lead) => {
                    const status = getLeadStatus(lead);
                    const isUpdating = updatingLeadId === lead.id;
                    return (
                      <div key={lead.id} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold">{lead.name}</span>
                              {lead.title && <span className="text-xs text-muted-foreground">{lead.title}</span>}
                              {lead.company && <span className="text-xs text-muted-foreground">@ {lead.company}</span>}
                              {lead.linkedin && (
                                <a href={lead.linkedin.startsWith('http') ? lead.linkedin : `https://${lead.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5 text-xs">
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">{lead.email}</p>

                            {/* Timeline chips */}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {lead.emailSentAt && <span className="text-xs text-muted-foreground">📨 {formatDate(lead.emailSentAt)}</span>}
                              {lead.followup1SentAt && <span className="text-xs text-muted-foreground">↩️ FU1 {formatDate(lead.followup1SentAt)}</span>}
                              {lead.followup2SentAt && <span className="text-xs text-muted-foreground">↩️ FU2 {formatDate(lead.followup2SentAt)}</span>}
                              {lead.replyReceivedAt && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${INTENT_META[lead.replyIntent || 'question']?.color}`}>
                                  {INTENT_META[lead.replyIntent || 'question']?.emoji} {INTENT_META[lead.replyIntent || 'question']?.label} reply
                                </span>
                              )}
                              {lead.autoReplySent && <span className="text-xs text-green-600 dark:text-green-400">🤖 AI replied {formatDate(lead.autoReplySentAt)}</span>}
                              {!lead.followup1Sent && lead.followup1SendAt && !lead.replied && (
                                <span className="text-xs text-amber-600 dark:text-amber-400">⏳ FU1 due {formatDate(lead.followup1SendAt)}</span>
                              )}
                              {lead.sendError && <span className="text-xs text-destructive">⚠ {lead.sendError}</span>}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <Badge variant="outline" className={`text-xs ${status.color}`}>{status.label}</Badge>
                            {lead.meetingBooked && (
                              <div className="flex flex-col items-end mt-1">
                                {lead.meetingTime && <span className="text-xs text-muted-foreground font-medium mb-1.5">{formatDate(lead.meetingTime)}</span>}
                                {lead.meetingLink && (
                                  <a href={lead.meetingLink} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 flex items-center gap-1 transition-colors w-fit">
                                    Join Meet <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            )}
                            {lead.emailSent && !lead.meetingBooked && (
                              <div className="flex items-center gap-1.5">
                                {!lead.replied && (
                                  <button onClick={() => handleMarkLead(lead.id, 'replied', true)} disabled={isUpdating} className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-600 transition-all disabled:opacity-50">
                                    {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : '✓ Replied'}
                                  </button>
                                )}
                                <button onClick={() => handleMarkLead(lead.id, 'meetingBooked', true)} disabled={isUpdating} className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-600 transition-all disabled:opacity-50">
                                  {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : '📅 Booked'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REPLIES TAB ── */}
        {activeTab === 'replies' && (
          <div className="space-y-4">
            {repliedLeads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-20 text-center">
                <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground font-medium">No replies yet</p>
                <p className="text-sm text-muted-foreground mt-1">Replies are checked automatically every minute and AI auto-replies are sent instantly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {repliedLeads.map((lead) => (
                  <ReplyCard
                    key={lead.id}
                    lead={lead}
                    onMarkBooked={() => handleMarkLead(lead.id, 'meetingBooked', true)}
                    campaignId={id}
                    onAutoReplySent={fetchData}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
