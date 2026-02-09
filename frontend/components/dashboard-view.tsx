'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { workflowManager, type WorkflowState } from '@/lib/workflow-context';
import { Users, Mail, MessageCircle, Calendar, TrendingUp, Bell, Clock, Video } from 'lucide-react';

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

  const upcomingMeetings = [
    {
      id: 'mtg-1',
      title: 'Product demo with Acme Inc',
      contact: 'Alex Johnson · VP Sales',
      time: 'Tomorrow · 10:00 AM',
      channel: 'Zoom',
      status: 'Confirmed',
    },
    {
      id: 'mtg-2',
      title: 'Onboarding call with Nova Labs',
      contact: 'Priya Menon · Head of Ops',
      time: 'Fri · 2:30 PM',
      channel: 'Google Meet',
      status: 'Waiting on reply',
    },
    {
      id: 'mtg-3',
      title: 'Pilot recap with Brightflow',
      contact: 'Sam Lee · RevOps',
      time: 'Mon · 9:00 AM',
      channel: 'Zoom',
      status: 'Confirmed',
    },
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

      {/* Upcoming meetings */}
      <Card className="p-6 border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            Upcoming meetings
          </h3>
          <Button variant="outline" size="sm">View calendar</Button>
        </div>
        <div className="space-y-3">
          {upcomingMeetings.map((meeting) => (
            <div key={meeting.id} className="flex items-center gap-4 rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                {meeting.channel.toLowerCase().includes('zoom') ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{meeting.title}</p>
                <p className="text-sm text-muted-foreground">
                  {meeting.contact} · {meeting.time} · {meeting.channel}
                </p>
              </div>
              <Badge variant={meeting.status === 'Confirmed' ? 'default' : 'secondary'}>{meeting.status}</Badge>
            </div>
          ))}
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
