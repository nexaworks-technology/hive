'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Building2, Save, AlertCircle } from 'lucide-react';
import { toastManager } from '@/components/toast-notification';

interface UserAccount {
  fullName: string;
  email: string;
  phone?: string;
  company: string;
  location?: string;
  bio?: string;
  planName: string;
  planStatus: 'active' | 'expired' | 'trial';
  campaignsCreated: number;
  prospectsScraped: number;
  emailsSent: number;
}

export default function AccountSettings() {
  const [account, setAccount] = useState<UserAccount>({
    fullName: 'Your Name',
    email: 'your-email@example.com',
    phone: '+1 (555) 123-4567',
    company: 'Your Company',
    location: 'San Francisco, CA',
    bio: 'Sales Development Representative focused on B2B outreach',
    planName: 'Professional',
    planStatus: 'active',
    campaignsCreated: 5,
    prospectsScraped: 150,
    emailsSent: 342,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toastManager.notify({
        title: 'Profile Updated',
        message: 'Your account settings have been saved successfully.',
        type: 'success',
      });
      setIsEditing(false);
    } catch (error) {
      toastManager.notify({
        title: 'Update Failed',
        message: 'Failed to save your account settings. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getPlanColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">{account.fullName}</h2>
            <p className="text-gray-600">{account.company}</p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <User size={16} /> Full Name
            </Label>
            {isEditing ? (
              <Input
                value={account.fullName}
                onChange={(e) =>
                  setAccount({ ...account, fullName: e.target.value })
                }
                placeholder="Your name"
              />
            ) : (
              <p className="text-gray-700">{account.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Mail size={16} /> Email Address
            </Label>
            {isEditing ? (
              <Input
                type="email"
                value={account.email}
                onChange={(e) => setAccount({ ...account, email: e.target.value })}
                placeholder="your-email@example.com"
              />
            ) : (
              <p className="text-gray-700">{account.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Phone size={16} /> Phone (Optional)
            </Label>
            {isEditing ? (
              <Input
                value={account.phone || ''}
                onChange={(e) =>
                  setAccount({ ...account, phone: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
              />
            ) : (
              <p className="text-gray-700">{account.phone || 'Not provided'}</p>
            )}
          </div>

          {/* Company */}
          <div>
            <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Building2 size={16} /> Company
            </Label>
            {isEditing ? (
              <Input
                value={account.company}
                onChange={(e) =>
                  setAccount({ ...account, company: e.target.value })
                }
                placeholder="Your company name"
              />
            ) : (
              <p className="text-gray-700">{account.company}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <MapPin size={16} /> Location (Optional)
            </Label>
            {isEditing ? (
              <Input
                value={account.location || ''}
                onChange={(e) =>
                  setAccount({ ...account, location: e.target.value })
                }
                placeholder="City, State"
              />
            ) : (
              <p className="text-gray-700">{account.location || 'Not provided'}</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <Label className="text-sm font-semibold mb-2">Bio (Optional)</Label>
            {isEditing ? (
              <Textarea
                value={account.bio || ''}
                onChange={(e) => setAccount({ ...account, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            ) : (
              <p className="text-gray-700">{account.bio || 'Not provided'}</p>
            )}
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Subscription/Plan Section */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Plan & Billing</h2>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Current Plan */}
          <div className="border-r pr-6">
            <p className="text-sm text-gray-600 mb-2">Current Plan</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">{account.planName}</h3>
              <Badge className={`text-xs ${getPlanColor(account.planStatus)}`}>
                {account.planStatus.charAt(0).toUpperCase() +
                  account.planStatus.slice(1)}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Renews on April 15, 2026
            </p>
          </div>

          {/* Usage Stats */}
          <div>
            <p className="text-sm text-gray-600 mb-2">This Month</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Campaigns Created:</span>
                <span className="font-semibold">{account.campaignsCreated}/10</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Prospects Scraped:</span>
                <span className="font-semibold">
                  {account.prospectsScraped}/5000
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Emails Sent:</span>
                <span className="font-semibold">{account.emailsSent}/1000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Features */}
        <div className="mb-6 pt-6 border-t">
          <p className="font-semibold mb-3">Plan Includes:</p>
          <ul className="grid grid-cols-2 gap-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Unlimited campaigns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>5,000 prospects/mo</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Email personalization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Reply tracking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Multi-channel outreach</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Priority support</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline">Upgrade Plan</Button>
          <Button variant="outline" className="text-red-600">
            Cancel Subscription
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 mt-1" />
          <div className="flex-1">
            <h3 className="font-bold text-red-900 mb-2">Danger Zone</h3>
            <p className="text-sm text-red-800 mb-4">
              Deleting your account is permanent and cannot be undone.
            </p>
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-100">
              Delete Account
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
