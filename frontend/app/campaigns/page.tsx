'use client';

import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { ToastContainer } from '@/components/toast-notification';
import { RequireAuth } from '@/components/auth-provider';
import { ChevronLeft, Loader2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSelectCampaign = async (campaignId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`http://localhost:4000/campaigns-v2/${campaignId}`);
      const data = await res.json();
      setCampaignDetails(data.campaign);
      setSelectedCampaignId(campaignId);
      setView('details');
      
      // Start auto-refresh polling if prospect count is 0 (still loading)
      if (data.campaign?.prospectCount === 0) {
        setIsAutoRefreshing(true);
        startPolling(campaignId);
      }
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = (campaignId: string) => {
    // Clear any existing poll
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:4000/campaigns-v2/${campaignId}`);
        const data = await res.json();
        setCampaignDetails(data.campaign);

        // Stop polling once prospects are loaded (count > 0)
        if (data.campaign?.prospectCount > 0) {
          setIsAutoRefreshing(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  };

  const handleBack = () => {
    setView('list');
    setSelectedCampaignId(null);
    setCampaignDetails(null);
    setIsAutoRefreshing(false);
    
    // Clear polling on back
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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
                    <Button variant="outline" size="sm" onClick={handleBack} disabled={isLoading}>
                      <ChevronLeft size={16} />
                    </Button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold">{campaignDetails?.name}</h1>
                        {isAutoRefreshing && (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Scraping prospects...</span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-600">Target: {campaignDetails?.targetCompany}</p>
                    </div>

                  </div>

                  {/* Overview Content */}
                  <div className="space-y-6">
                    {/* Stats Section */}
                    {selectedCampaignId && <CampaignStats campaignId={selectedCampaignId} />}

                    {/* Prospects Table with Loading State */}
                    {selectedCampaignId && (
                      <div className="bg-white rounded-lg">
                        {isAutoRefreshing && campaignDetails?.prospectCount === 0 ? (
                          <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-96">
                            <Loader2 size={32} className="animate-spin text-blue-600" />
                            <div className="text-center">
                              <p className="font-semibold text-lg">Discovering prospects...</p>
                              <p className="text-gray-600 text-sm">
                                Web scraping is finding contacts for {campaignDetails?.targetCompany}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <ProspectsTable campaignId={selectedCampaignId} />
                        )}
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
