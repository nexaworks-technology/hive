'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { workflowManager, type WorkflowState } from '@/lib/workflow-context';
import { Users, Mail, MessageCircle, Calendar, TrendingUp, Zap } from 'lucide-react';

export default function DashboardView() {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);

  useEffect(() => {
    const unsubscribe = workflowManager.subscribe(setWorkflowState);
    return unsubscribe;
  }, []);

  if (!workflowState) return null;

  const stats = {
    leadsScraped: workflowState.leads.length,
    emailsSent: workflowState.leads.filter((l) => l.emailSent).length,
    repliesReceived: workflowState.leads.filter((l) => l.replied).length,
    meetingsScheduled: workflowState.leads.filter((l) => l.meeting).length,
    totalCampaigns: workflowState.campaignHistory.length,
  };

  const chartData = [
    { name: 'Leads', value: stats.leadsScraped },
    { name: 'Emails Sent', value: stats.emailsSent },
    { name: 'Replies', value: stats.repliesReceived },
    { name: 'Meetings', value: stats.meetingsScheduled },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-2">Monitor your outreach campaigns and metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-6 border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Leads Scraped</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.leadsScraped}</p>
            </div>
            <Users className="w-10 h-10 text-primary/20" />
          </div>
        </Card>

        <Card className="p-6 border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Emails Sent</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.emailsSent}</p>
            </div>
            <Mail className="w-10 h-10 text-accent/20" />
          </div>
        </Card>

        <Card className="p-6 border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Replies</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.repliesReceived}</p>
            </div>
            <MessageCircle className="w-10 h-10 text-primary/20" />
          </div>
        </Card>

        <Card className="p-6 border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Meetings Scheduled</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.meetingsScheduled}</p>
            </div>
            <Calendar className="w-10 h-10 text-accent/20" />
          </div>
        </Card>

        <Card className="p-6 border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Campaigns</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.totalCampaigns}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-primary/20" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <Card className="p-6 border-border bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent" />
          Campaign Performance
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" />
            <YAxis stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: `1px solid var(--border)`,
                borderRadius: '8px',
                color: 'var(--foreground)',
              }}
            />
            <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6 border-border bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button className="gap-2 h-12" onClick={() => workflowManager.setState({ currentStage: 'stage-1' })}>
            <Zap className="w-4 h-4" />
            Start New Campaign
          </Button>
          <Button variant="outline" className="gap-2 h-12 bg-transparent" onClick={() => workflowManager.setState({ currentStage: 'stage-5' })}>
            <Calendar className="w-4 h-4" />
            View Active Leads
          </Button>
          <Button variant="outline" className="gap-2 h-12 bg-transparent" onClick={() => workflowManager.setState({ currentStage: 'history' })}>
            <MessageCircle className="w-4 h-4" />
            View History
          </Button>
        </div>
      </Card>

      {/* Conversion Rate */}
      {stats.emailsSent > 0 && (
        <Card className="p-6 border-border bg-secondary/50">
          <h3 className="text-lg font-semibold text-foreground mb-4">Conversion Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Reply Rate</p>
              <p className="text-2xl font-bold text-primary">
                {Math.round((stats.repliesReceived / stats.emailsSent) * 100)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Meeting Rate</p>
              <p className="text-2xl font-bold text-accent">
                {Math.round((stats.meetingsScheduled / stats.repliesReceived) * 100) || 0}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Overall Conversion</p>
              <p className="text-2xl font-bold text-primary">
                {Math.round((stats.meetingsScheduled / stats.leadsScraped) * 100)}%
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
