'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, MailOpen, Loader2, X } from 'lucide-react';
import { toastManager } from '@/components/toast-notification';

interface IntegratedEmail {
  id: string;
  provider: 'gmail' | 'outlook' | 'custom';
  email: string;
  status: 'connected' | 'disconnected' | 'expired';
  connectedAt: string;
  lastUsed?: string;
  isDefault: boolean;
}

export default function EmailIntegrations() {
  const [emails, setEmails] = useState<IntegratedEmail[]>([
    {
      id: 'gm_1',
      provider: 'gmail',
      email: 'your-email@gmail.com',
      status: 'connected',
      connectedAt: '2026-03-15',
      lastUsed: '2026-04-02',
      isDefault: true,
    },
    {
      id: 'out_1',
      provider: 'outlook',
      email: 'your-email@outlook.com',
      status: 'connected',
      connectedAt: '2026-03-20',
      lastUsed: '2026-03-28',
      isDefault: false,
    },
  ]);
  const [connecting, setConnecting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'gmail' | 'outlook' | null>(null);

  const handleConnect = async (provider: 'gmail' | 'outlook') => {
    setConnecting(true);
    setSelectedProvider(provider);
    try {
      // Simulate OAuth flow
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      toastManager.notify({
        title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Connected`,
        message: 'Your email account has been successfully connected.',
        type: 'success',
      });
    } catch (error) {
      toastManager.notify({
        title: 'Connection Failed',
        message: 'Failed to connect your email account. Please try again.',
        type: 'error',
      });
    } finally {
      setConnecting(false);
      setSelectedProvider(null);
    }
  };

  const handleDisconnect = (id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
    toastManager.notify({
      title: 'Email Disconnected',
      message: 'The email account has been removed from your integrations.',
      type: 'success',
    });
  };

  const handleSetDefault = (id: string) => {
    setEmails((prev) =>
      prev.map((e) => ({
        ...e,
        isDefault: e.id === id,
      }))
    );
    toastManager.notify({
      title: 'Default Email Updated',
      message: 'This email will be used for new campaigns.',
      type: 'success',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'gmail':
        return <MailOpen size={20} className="text-red-500" />;
      case 'outlook':
        return <Mail size={20} className="text-blue-500" />;
      default:
        return <Mail size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Connected Emails */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Connected Email Accounts</h2>
        {emails.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            <Mail size={32} className="mx-auto mb-3 opacity-50" />
            <p>No email accounts connected yet.</p>
            <p className="text-sm">Connect an email to start sending campaigns.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {emails.map((email) => (
              <Card
                key={email.id}
                className={`p-4 flex items-center justify-between ${
                  email.isDefault ? 'border-blue-200 bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
                    {getProviderIcon(email.provider)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{email.email}</p>
                      {email.isDefault && (
                        <Badge className="bg-blue-600 text-white text-xs">Default</Badge>
                      )}
                      <Badge className={`text-xs ${getStatusColor(email.status)}`}>
                        {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Connected on {new Date(email.connectedAt).toLocaleDateString()}
                      {email.lastUsed && ` • Last used ${new Date(email.lastUsed).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!email.isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(email.id)}
                    >
                      Set as Default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDisconnect(email.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Connect New Account */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Connect New Email Account</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Gmail */}
          <Card className="p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
            <MailOpen size={32} className="text-red-500 mb-3" />
            <h3 className="font-semibold mb-2">Gmail</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              Send emails using your Gmail account
            </p>
            <Button
              size="sm"
              onClick={() => handleConnect('gmail')}
              disabled={connecting && selectedProvider === 'gmail'}
            >
              {connecting && selectedProvider === 'gmail' ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                'Connect Gmail'
              )}
            </Button>
          </Card>

          {/* Outlook */}
          <Card className="p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
            <Mail size={32} className="text-blue-500 mb-3" />
            <h3 className="font-semibold mb-2">Outlook</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              Send emails using your Outlook account
            </p>
            <Button
              size="sm"
              onClick={() => handleConnect('outlook')}
              disabled={connecting && selectedProvider === 'outlook'}
            >
              {connecting && selectedProvider === 'outlook' ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                'Connect Outlook'
              )}
            </Button>
          </Card>
        </div>
      </div>

      {/* Info Box */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Why connect an email?</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Send personalized outreach emails directly from your account</li>
          <li>Track opens and replies in real-time</li>
          <li>Maintain your sender reputation</li>
          <li>Use multiple email accounts for different campaigns</li>
        </ul>
      </Card>
    </div>
  );
}
