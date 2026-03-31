'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CampaignModal from './campaign-modal';

interface Campaign {
  id: string;
  name: string;
  targetCompany: string;
  type: string;
  prospectCount: number;
  emailsSent: number;
  replies: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: string;
}

interface CampaignListProps {
  onSelectCampaign: (campaignId: string) => void;
}

export default function CampaignList({ onSelectCampaign }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('http://localhost:4000/campaigns-v2');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-200',
      active: 'bg-green-200',
      paused: 'bg-yellow-200',
      completed: 'bg-blue-200',
    };
    return colors[status] || 'bg-gray-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Campaigns</h2>
        <Button onClick={() => setShowCreateModal(true)}>+ New Campaign</Button>
      </div>

      <CampaignModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          fetchCampaigns();
        }}
      />

      {loading ? (
        <p className="text-center text-gray-500">Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <p>No campaigns yet. Create one to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onSelectCampaign(campaign.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{campaign.name}</h3>
                  <p className="text-sm text-gray-600">Target: {campaign.targetCompany}</p>
                </div>
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Prospects</p>
                  <p className="text-xl font-bold">{campaign.prospectCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Emails Sent</p>
                  <p className="text-xl font-bold">{campaign.emailsSent}</p>
                </div>
                <div>
                  <p className="text-gray-600">Replies</p>
                  <p className="text-xl font-bold">{campaign.replies}</p>
                </div>
                <div>
                  <p className="text-gray-600">Reply Rate</p>
                  <p className="text-xl font-bold">
                    {campaign.emailsSent > 0
                      ? Math.round((campaign.replies / campaign.emailsSent) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
