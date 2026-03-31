'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { ToastContainer } from '@/components/toast-notification';
import { RequireAuth } from '@/components/auth-provider';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CampaignList from '@/components/campaign-list';
import ProspectsTable from '@/components/prospects-table';
import CampaignStats from '@/components/campaign-stats';

type ViewType = 'list' | 'details';

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [view, setView] = useState<ViewType>('list');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<any>(null);

  const handleSelectCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/campaigns-v2/${campaignId}`);
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
    <RequireAuth>
      <div className="flex h-screen bg-background">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto">
            <div className="p-6">
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

                  {/* Overview Content */}
                  <div className="space-y-6">
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
          </div>
        </main>
        <ToastContainer />
      </div>
    </RequireAuth>
  );
}
