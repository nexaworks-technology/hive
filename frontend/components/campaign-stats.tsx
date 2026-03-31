'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CampaignStats {
  totalProspects: number;
  emailsSent: number;
  replies: number;
  followUpsScheduled: number;
  replyRate: number;
  avgEmailsPerProspect: number;
  statusBreakdown: {
    pending: number;
    outreachSent: number;
    replied: number;
    followUp: number;
    closed: number;
  };
}

interface CampaignStatsProps {
  campaignId: string;
}

export default function CampaignStats({ campaignId }: CampaignStatsProps) {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [campaignId]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`http://localhost:4000/campaigns-v2/${campaignId}/stats`);
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="text-center text-gray-500">Loading stats...</p>;
  if (!stats) return <p className="text-center text-gray-500">Unable to load stats</p>;

  const statusData = [
    { name: 'Pending', value: stats.statusBreakdown.pending },
    { name: 'Outreach Sent', value: stats.statusBreakdown.outreachSent },
    { name: 'Replied', value: stats.statusBreakdown.replied },
    { name: 'Follow-up', value: stats.statusBreakdown.followUp },
    { name: 'Closed', value: stats.statusBreakdown.closed },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Campaign Analytics</h3>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <p className="text-sm text-gray-600 mb-2">Total Prospects</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalProspects}</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-gray-600 mb-2">Emails Sent</p>
          <p className="text-3xl font-bold text-blue-600">{stats.emailsSent}</p>
          <p className="text-xs text-gray-500 mt-1">
            {Math.round((stats.emailsSent / stats.totalProspects) * 100)}% contacted
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-gray-600 mb-2">Replies</p>
          <p className="text-3xl font-bold text-green-600">{stats.replies}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.replyRate ? Math.round(stats.replyRate) : 0}% reply rate
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-gray-600 mb-2">Follow-ups</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.followUpsScheduled}</p>
          <p className="text-xs text-gray-500 mt-1">Scheduled next steps</p>
        </Card>
      </div>

      {/* Status Distribution Chart */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Prospect Status Distribution</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={statusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Conversion Funnel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Conversion Funnel</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">All Prospects</span>
              <div className="flex-1 mx-3 bg-gray-200 rounded h-2">
                <div className="bg-gray-400 h-2 rounded w-full"></div>
              </div>
              <span className="text-sm font-semibold">{stats.totalProspects}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Contacted</span>
              <div className="flex-1 mx-3 bg-blue-200 rounded h-2">
                <div
                  className="bg-blue-500 h-2 rounded"
                  style={{
                    width: `${(stats.emailsSent / stats.totalProspects) * 100}%`,
                  }}
                ></div>
              </div>
              <span className="text-sm font-semibold">
                {stats.emailsSent} (
                {Math.round((stats.emailsSent / stats.totalProspects) * 100)}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Replied</span>
              <div className="flex-1 mx-3 bg-green-200 rounded h-2">
                <div
                  className="bg-green-500 h-2 rounded"
                  style={{
                    width: stats.emailsSent > 0
                      ? `${(stats.replies / stats.emailsSent) * 100}%`
                      : '0%',
                  }}
                ></div>
              </div>
              <span className="text-sm font-semibold">
                {stats.replies} ({Math.round(stats.replyRate || 0)}%)
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="font-semibold mb-4">Key Metrics</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-sm text-gray-700">Avg emails per prospect</span>
              <span className="text-lg font-semibold">
                {(stats.avgEmailsPerProspect || 0).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-sm text-gray-700">Contact rate</span>
              <span className="text-lg font-semibold text-blue-600">
                {Math.round((stats.emailsSent / stats.totalProspects) * 100)}%
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-sm text-gray-700">Reply rate</span>
              <span className="text-lg font-semibold text-green-600">
                {Math.round(stats.replyRate || 0)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Follow-up rate</span>
              <span className="text-lg font-semibold text-yellow-600">
                {stats.replies > 0
                  ? Math.round((stats.followUpsScheduled / stats.replies) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
