'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Prospect {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  linkedIn: string;
  mailSent: boolean;
  replied: boolean;
  followUpCount: number;
  personalizationInfo: {
    recentActivity: string;
    hiringMessage: string;
    insight: string;
  };
}

interface ProspectModalProps {
  prospect: Prospect;
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ProspectModal({
  prospect,
  campaignId,
  isOpen,
  onClose,
  onUpdate,
}: ProspectModalProps) {
  const [expandedPersonalization, setExpandedPersonalization] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleScheduleFollowUp = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/campaigns-v2/${campaignId}/prospects/${prospect.id}/schedule-followup`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'email',
            days: 3,
          }),
        }
      );

      if (!res.ok) throw new Error('Failed to schedule follow-up');

      toast({
        title: 'Follow-up scheduled',
        description: 'Follow-up has been scheduled for 3 days from now',
      });

      onUpdate();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to schedule follow-up',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prospect Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Name</p>
                <p className="text-lg font-semibold">{prospect.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Role</p>
                <p className="text-lg font-semibold">{prospect.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Company</p>
                <p className="text-lg font-semibold">{prospect.company}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Email</p>
                <a href={`mailto:${prospect.email}`} className="text-blue-600 hover:underline">
                  {prospect.email}
                </a>
              </div>
            </div>
          </Card>

          {/* LinkedIn & Contact */}
          <Card className="p-6">
            <div className="space-y-3">
              {prospect.linkedIn && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">LinkedIn Profile</span>
                  <a
                    href={prospect.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                  >
                    View Profile
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Contact Status */}
          <Card className="p-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Contact Status</p>
                {prospect.mailSent ? (
                  <Badge className="bg-green-200 text-green-800">Email Sent</Badge>
                ) : (
                  <Badge className="bg-gray-200 text-gray-800">Not Contacted</Badge>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Reply Status</p>
                {prospect.replied ? (
                  <Badge className="bg-blue-200 text-blue-800">Replied</Badge>
                ) : (
                  <Badge className="bg-gray-200 text-gray-800">No Reply</Badge>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Follow-ups</p>
                <Badge className="bg-yellow-200 text-yellow-800">{prospect.followUpCount}</Badge>
              </div>
            </div>
          </Card>

          {/* Expandable Personalization Info */}
          <Card className="p-6">
            <button
              onClick={() => setExpandedPersonalization(!expandedPersonalization)}
              className="w-full flex items-center justify-between hover:text-blue-600"
            >
              <h4 className="font-semibold">Personalization Info</h4>
              {expandedPersonalization ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {expandedPersonalization && (
              <div className="mt-4 space-y-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Recent Activity</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {prospect.personalizationInfo.recentActivity}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Hiring Message</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {prospect.personalizationInfo.hiringMessage}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Key Insight</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {prospect.personalizationInfo.insight}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {!prospect.replied && prospect.mailSent && (
              <Button onClick={handleScheduleFollowUp} disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule Follow-up'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
