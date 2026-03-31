'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CampaignModal({ isOpen, onClose }: CampaignModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    targetCompany: '',
    companyWebsite: '',
    campaignType: 'direct',
    description: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, campaignType: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/campaigns-v2/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetCompany: formData.targetCompany,
          companyWebsite: formData.companyWebsite,
          campaignType: formData.campaignType,
          description: formData.description,
        }),
      });

      if (!res.ok) throw new Error('Failed to create campaign');

      toast({
        title: 'Campaign created',
        description: `${formData.targetCompany} campaign is ready to go!`,
      });

      setFormData({ targetCompany: '', companyWebsite: '', campaignType: 'direct', description: '' });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create campaign',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="targetCompany">Target Company *</Label>
            <Input
              id="targetCompany"
              name="targetCompany"
              value={formData.targetCompany}
              onChange={handleInputChange}
              placeholder="e.g., SutraHR"
              required
            />
          </div>

          <div>
            <Label htmlFor="companyWebsite">Company Website</Label>
            <Input
              id="companyWebsite"
              name="companyWebsite"
              value={formData.companyWebsite}
              onChange={handleInputChange}
              placeholder="https://company.com"
              type="url"
            />
          </div>

          <div>
            <Label htmlFor="campaignType">Campaign Type *</Label>
            <Select value={formData.campaignType} onValueChange={handleSelectChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct Outreach</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="hiring">Recruiting</SelectItem>
                <SelectItem value="event">Event Promotion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Campaign goals and notes..."
              rows={4}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
