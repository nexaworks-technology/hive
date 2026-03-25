'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Inbox, Rocket, Mail, MessageSquare, CalendarCheck, Users,
  TrendingUp, Plus, ArrowRight, Loader2, AlertCircle, RefreshCw,
  BarChart3, Zap, Clock, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { RequireAuth, useSessionContext } from '@/components/auth-provider';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface CampaignStats {
  total: number;
  sent: number;
  replied: number;
  booked: number;
}

interface Campaign {
  campaignId: string;
  title: string;
  createdAt: string;
  status: string;
  settings: { agencyName?: string; service?: string };
  stats: CampaignStats;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5">
      <span className={`text-lg font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}

function replyRate(stats: CampaignStats) {
  return stats.sent > 0 ? Math.round((stats.replied / stats.sent) * 100) : 0;
}

function statusBadge(status: string) {
  if (status === 'active') return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Active</Badge>;
  if (status === 'failed') return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Failed</Badge>;
  return <Badge variant="secondary" className="text-xs">{status}</Badge>;
}

function AggregateBanner({ campaigns }: { campaigns: Campaign[] }) {
  const total = campaigns.reduce((s, c) => s + c.stats.total, 0);
  const sent = campaigns.reduce((s, c) => s + c.stats.sent, 0);
  const replied = campaigns.reduce((s, c) => s + c.stats.replied, 0);
  const booked = campaigns.reduce((s, c) => s + c.stats.booked, 0);
  const rate = sent > 0 ? Math.round((replied / sent) * 100) : 0;

  const stats = [
    { label: 'Total Leads', value: total, icon: <Users className="w-5 h-5 text-primary" />, bg: 'bg-primary/10' },
    { label: 'Emails Sent', value: sent, icon: <Mail className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-500/10' },
    { label: 'Replies', value: replied, icon: <MessageSquare className="w-5 h-5 text-green-500" />, bg: 'bg-green-500/10', sub: rate > 0 ? `${rate}% rate` : undefined },
    { label: 'Meetings Booked', value: booked, icon: <CalendarCheck className="w-5 h-5 text-purple-500" />, bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
          <div>
            <p className="text-2xl font-bold leading-tight">{s.value}</p>
            <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
            {(s as any).sub && <p className="text-xs text-muted-foreground">{(s as any).sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const rate = replyRate(campaign.stats);

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Rocket className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{campaign.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {campaign.settings?.service && <span>{campaign.settings.service} · </span>}
              Launched {formatDate(campaign.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {statusBadge(campaign.status)}
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 bg-muted/40 rounded-xl p-3">
        <StatPill label="Leads" value={campaign.stats.total} color="text-foreground" />
        <StatPill label="Sent" value={campaign.stats.sent} color="text-primary" />
        <StatPill label={`Replied ${rate > 0 ? `(${rate}%)` : ''}`} value={campaign.stats.replied} color="text-green-600 dark:text-green-400" />
        <StatPill label="Booked" value={campaign.stats.booked} color="text-purple-600 dark:text-purple-400" />
      </div>

      {/* Reply rate bar */}
      {campaign.stats.sent > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Reply rate</span>
            <span className="font-medium">{rate}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(rate, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InboundDashboardContent() {
  const router = useRouter();
  const { session } = useSessionContext();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('inbound-overview');

  const fetchCampaigns = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/inbound/campaigns`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setCampaigns(data.campaigns || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

            {/* Page Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Inbox className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Inbound Campaigns</h1>
                  <p className="text-sm text-muted-foreground">
                    {campaigns.length > 0
                      ? `${campaigns.length} campaign${campaigns.length !== 1 ? 's' : ''} · AI-powered email outreach`
                      : 'AI-powered personalized email outreach'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchCampaigns} className="gap-2">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </Button>
                <Button size="sm" onClick={() => router.push('/inbound/new')} className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Campaign
                </Button>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span>Loading campaigns...</span>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && campaigns.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border py-24 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Inbox className="w-8 h-8 text-primary opacity-60" />
                </div>
                <div>
                  <p className="font-semibold text-lg">No inbound campaigns yet</p>
                  <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                    Upload a CSV of leads and Hive will generate personalized emails, send them, track replies, and book meetings — automatically.
                  </p>
                </div>
                <Button onClick={() => router.push('/inbound/new')} className="gap-2 mx-auto">
                  <Rocket className="w-4 h-4" />
                  Launch Your First Campaign
                </Button>
              </div>
            )}

            {/* Aggregate Stats */}
            {!loading && campaigns.length > 0 && (
              <>
                <AggregateBanner campaigns={campaigns} />

                {/* Campaign Cards */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold">All Campaigns</h2>
                    <span className="text-sm text-muted-foreground">{campaigns.length} total</span>
                  </div>
                  <div className="grid gap-4">
                    {campaigns.map((c) => (
                      <CampaignCard
                        key={c.campaignId}
                        campaign={c}
                        onClick={() => router.push(`/inbound/campaign/${c.campaignId}`)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default function InboundPage() {
  return (
    <RequireAuth>
      <InboundDashboardContent />
    </RequireAuth>
  );
}
