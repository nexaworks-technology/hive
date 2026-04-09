'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSessionContext } from '@/components/auth-provider';
import ProspectModal from './prospect-modal';
import EmailComposer from './email-composer';

interface Prospect {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  linkedinProfile: string;
  mailSent: string; // "Yes" or "No" from backend
  replied: string; // "Yes" or "No" from backend
  followUps: number;
  personalizationInfo: {
    source?: string;
    scrapedAt?: string;
    industry?: string;
  };
  status: string;
  emailsSent: number;
  replyCount: number;
}

interface ProspectsTableProps {
  campaignId: string;
}

export default function ProspectsTable({ campaignId }: ProspectsTableProps) {
  const { session } = useSessionContext();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showProspectModal, setShowProspectModal] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'replied'>('name');
  const [checkingReplies, setCheckingReplies] = useState(false);

  useEffect(() => {
    fetchProspects();
    
    // Auto-poll every 2 seconds while loading to catch newly scraped prospects
    const pollInterval = setInterval(() => {
      fetchProspects();
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [campaignId]);

  // Auto-check for replies every 60 seconds
  useEffect(() => {
    const autoCheckReplies = async () => {
      if (!session?.access_token) {
        console.log('[prospects-table] Not checking replies - user not authenticated');
        return;
      }

      try {
        console.log(`[prospects-table] Checking for replies in campaign ${campaignId}...`);
        const res = await fetch(`http://localhost:4000/campaigns-v2/${campaignId}/check-replies`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ prospectsList: prospects })
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            console.error('[prospects-table] Unauthorized - Gmail may not be connected. Please reconnect in Settings.');
          } else {
            console.error(`[prospects-table] Check replies failed: ${res.statusText}`);
          }
          return;
        }

        const result = await res.json();
        if (result.repliesProcessed > 0) {
          console.log(`✅ Found ${result.repliesProcessed} replies, auto-responses sent!`);
          await fetchProspects();
        }
      } catch (e) {
        console.error('[prospects-table] Auto-check error:', e);
      }
    };

    const replyCheckInterval = setInterval(() => {
      autoCheckReplies();
    }, 60000); // Check every 60 seconds

    // Initial check immediately
    autoCheckReplies();

    return () => clearInterval(replyCheckInterval);
  }, [campaignId]);

  const fetchProspects = async () => {
    try {
      const res = await fetch(`http://localhost:4000/campaigns-v2/${campaignId}/prospects/list`);
      const data = await res.json();
      setProspects(data.prospectsList || []);
    } catch (error) {
      console.error('Failed to fetch prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSortedProspects = () => {
    const sorted = [...prospects];
    if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'status') sorted.sort((a, b) => (a.mailSent === b.mailSent ? 0 : a.mailSent === 'Yes' ? 1 : -1));
    if (sortBy === 'replied') sorted.sort((a, b) => (a.replied === b.replied ? 0 : a.replied === 'Yes' ? -1 : 1));
    return sorted;
  };

  const manualCheckReplies = async () => {
    if (!session?.access_token) {
      alert('Not authenticated. Please log in first.');
      return;
    }

    setCheckingReplies(true);
    try {
      console.log(`[Manual Check] Checking for replies in campaign ${campaignId}...`);
      const res = await fetch(`http://localhost:4000/campaigns-v2/${campaignId}/check-replies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ prospectsList: prospects })
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          alert('Unauthorized - Gmail may not be connected. Please reconnect in Settings.');
        } else {
          alert(`Error checking replies: ${res.statusText}`);
        }
        return;
      }

      const result = await res.json();
      console.log(`[Manual Check] Result:`, result);
      alert(`✅ Check complete! Replies processed: ${result.repliesProcessed || 0}`);
      await fetchProspects();
    } catch (e) {
      console.error('[Manual Check] Error:', e);
      alert(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setCheckingReplies(false);
    }
  };

  if (loading) return <p className="text-center text-gray-500">Loading prospects...</p>;

  const sorted = getSortedProspects();
  const sentCount = prospects.filter((p) => p.mailSent === 'Yes').length;
  const repliedCount = prospects.filter((p) => p.replied === 'Yes').length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          Prospects ({prospects.length} total, {sentCount} contacted, {repliedCount} replied)
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={manualCheckReplies}
            disabled={checkingReplies}
            variant="outline"
            size="sm"
            className="bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            {checkingReplies ? 'Checking...' : '🔄 Check Replies'}
          </Button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Contact Status</option>
            <option value="replied">Sort by Replies</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Name</th>
              <th className="px-4 py-2 text-left font-semibold">Email</th>
              <th className="px-4 py-2 text-left font-semibold">Role</th>
              <th className="px-4 py-2 text-left font-semibold">Company</th>
              <th className="px-4 py-2 text-center font-semibold">Mail Sent</th>
              <th className="px-4 py-2 text-center font-semibold">Replied</th>
              <th className="px-4 py-2 text-center font-semibold">Follow-ups</th>
              <th className="px-4 py-2 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((prospect) => (
              <tr key={prospect.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{prospect.name}</td>
                <td className="px-4 py-3 text-blue-600">{prospect.email}</td>
                <td className="px-4 py-3 text-sm">{prospect.role}</td>
                <td className="px-4 py-3 text-sm">{prospect.company}</td>
                <td className="px-4 py-3 text-center">
                  {prospect.mailSent === 'Yes' ? (
                    <Badge className="bg-green-200 text-green-800">Yes</Badge>
                  ) : (
                    <Badge className="bg-gray-200 text-gray-800">No</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {prospect.replied === 'Yes' ? (
                    <Badge className="bg-blue-200 text-blue-800">Yes</Badge>
                  ) : (
                    <Badge className="bg-gray-200 text-gray-800">No</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-center">{prospect.followUps}</td>
                <td className="px-4 py-3 text-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedProspect(prospect);
                      setShowProspectModal(true);
                    }}
                  >
                    View
                  </Button>
                  {prospect.mailSent !== 'Yes' && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setShowEmailComposer(prospect.id)}
                    >
                      Send Email
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedProspect && (
        <ProspectModal
          prospect={selectedProspect}
          campaignId={campaignId}
          isOpen={showProspectModal}
          onClose={() => setShowProspectModal(false)}
          onUpdate={fetchProspects}
        />
      )}

      <EmailComposer
        prospectId={showEmailComposer || ''}
        campaignId={campaignId}
        isOpen={!!showEmailComposer}
        onClose={() => {
          setShowEmailComposer(null);
          fetchProspects();
        }}
      />
    </div>
  );
}
