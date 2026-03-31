'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import CampaignList from '@/components/campaign-list';
import ProspectsTable from '@/components/prospects-table';
import CampaignStats from '@/components/campaign-stats';

type ViewType = 'list' | 'details';

export default function CampaignsPage() {
  const [view, setView] = useState<ViewType>('list');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<any>(null);

  const handleSelectCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/campaigns-v2/${campaignId}`);
      const data = await res.json();
      setCampaignDetails(data.campaign);
      setSelectedCampaignId(campaignId);
      setView('details');
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
    }
  };

  const handleBack = () => {
    setView('list');
    setSelectedCampaignId(null);
    setCampaignDetails(null);
  };

  return (
    <div className="w-full">
      {view === 'list' ? (
        <CampaignList onSelectCampaign={handleSelectCampaign} />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ChevronLeft size={16} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{campaignDetails?.name}</h1>
              <p className="text-gray-600">Target: {campaignDetails?.targetCompany}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b">
            <button
              onClick={() => {}}
              className="pb-3 px-1 border-b-2 border-blue-600 text-blue-600 font-semibold"
            >
              Overview
            </button>
            <button className="pb-3 px-1 text-gray-600 hover:text-gray-900">
              Prospects
            </button>
            <button className="pb-3 px-1 text-gray-600 hover:text-gray-900">
              Analytics
            </button>
          </div>

          {/* Overview Tab Content */}
          <div className="space-y-6">
            {/* Campaign Info Card */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Campaign Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="text-lg font-semibold capitalize">{campaignDetails?.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-semibold capitalize">{campaignDetails?.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Prospects</p>
                  <p className="text-lg font-semibold">{campaignDetails?.prospectCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-lg font-semibold">
                    {campaignDetails?.createdAt
                      ? new Date(campaignDetails.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Stats Section */}
            {selectedCampaignId && <CampaignStats campaignId={selectedCampaignId} />}

            {/* Prospects Table */}
            {selectedCampaignId && (
              <div className="bg-white rounded-lg">
                <ProspectsTable campaignId={selectedCampaignId} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
