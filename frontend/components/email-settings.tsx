'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Check, X, Loader2, Trash2, Plus, Zap } from 'lucide-react';
import { toastManager } from '@/components/toast-notification';

const apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function EmailSettingsSection({ session }) {
  const router = useRouter();
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState(null);

  // Load email accounts
  useEffect(() => {
    fetchEmailAccounts();
  }, []);

  const fetchEmailAccounts = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/email-accounts`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch email accounts');

      const data = await res.json();
      setEmailAccounts(data.emailAccounts || []);
    } catch (err) {
      console.error('Error fetching email accounts:', err);
      toastManager.notify({
        title: 'Failed to load email accounts',
        type: 'error',
      });
    }
  };

  const handleTestConnection = async (accountId) => {
    setTestingId(accountId);

    try {
      const res = await fetch(`${apiBaseUrl}/email-accounts/${accountId}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Connection test failed');
      }

      const imapStatus = data.results.imap.success ? '✅ IMAP OK' : `❌ ${data.results.imap.error}`;
      const smtpStatus = data.results.smtp.success ? '✅ SMTP OK' : `❌ ${data.results.smtp.error}`;

      toastManager.notify({
        title: 'Connection test complete',
        message: `${imapStatus}, ${smtpStatus}`,
        type: data.results.imap.success && data.results.smtp.success ? 'success' : 'error',
      });
    } catch (err) {
      console.error('Error testing connection:', err);
      toastManager.notify({
        title: 'Connection test failed',
        message: err.message,
        type: 'error',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncNow = async (accountId) => {
    try {
      const res = await fetch(`${apiBaseUrl}/email-accounts/${accountId}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      toastManager.notify({
        title: 'Sync initiated',
        message: 'Emails will be synced in the background',
        type: 'success',
      });
    } catch (err) {
      console.error('Error syncing:', err);
      toastManager.notify({
        title: 'Sync failed',
        message: err.message,
        type: 'error',
      });
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!confirm('Are you sure you want to disconnect this email account?')) return;

    try {
      const res = await fetch(`${apiBaseUrl}/email-accounts/${accountId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error('Failed to delete account');

      toastManager.notify({
        title: 'Email account disconnected',
        type: 'success',
      });

      await fetchEmailAccounts();
    } catch (err) {
      console.error('Error deleting account:', err);
      toastManager.notify({
        title: 'Failed to disconnect account',
        type: 'error',
      });
    }
  };

  const handleSetPrimary = async (accountId) => {
    setSettingPrimaryId(accountId);
    try {
      const res = await fetch(`${apiBaseUrl}/email-accounts/${accountId}/set-primary`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to set primary email');
      }

      toastManager.notify({
        title: 'Success',
        message: 'Primary sending email updated',
        type: 'success',
      });

      await fetchEmailAccounts();
    } catch (err) {
      console.error('Error setting primary:', err);
      toastManager.notify({
        title: 'Failed to set primary email',
        message: err.message,
        type: 'error',
      });
    } finally {
      setSettingPrimaryId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
          <Mail className="w-5 h-5 text-primary" />
          Email Connection
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your company email to send and receive emails through Hive
        </p>
      </div>

      {/* Connected Accounts List */}
      <div className="space-y-3">
        {emailAccounts.length > 0 &&
          emailAccounts.map((account) => (
            <Card key={account.id} className="rounded-none p-4 border-border bg-secondary/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground">{account.email_address}</p>
                    {account.is_active && (
                      <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 gap-1">
                        <Zap className="w-3 h-3" />
                        Running
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    IMAP: {account.imap_host}:{account.imap_port}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    SMTP: {account.smtp_host}:{account.smtp_port}
                  </p>
                  {account.last_sync && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last synced: {new Date(account.last_sync).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {!account.is_active && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleSetPrimary(account.id)}
                      disabled={settingPrimaryId === account.id}
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      {settingPrimaryId === account.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      Set as Primary
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestConnection(account.id)}
                    disabled={testingId === account.id}
                    className="gap-2"
                  >
                    {testingId === account.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Test
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSyncNow(account.id)}
                    className="gap-2"
                  >
                    Sync
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteAccount(account.id)}
                    className="gap-2 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
      </div>

      {/* Add New Account Button */}
      <Button
        onClick={() => router.push('/profile/email-setup')}
        className="gap-2 w-full bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="w-4 h-4" />
        Add Email Account
      </Button>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-900 dark:text-blue-100">
        <p className="font-semibold mb-2">💡 How to find your email settings:</p>
        <ul className="space-y-1 text-xs">
          <li>• <strong>Microsoft 365/Outlook:</strong> IMAP: outlook.office365.com:993, SMTP: smtp.office365.com:587</li>
          <li>• <strong>Gmail/Google Workspace:</strong> Use app password (not account password), IMAP: imap.gmail.com:993, SMTP: smtp.gmail.com:587</li>
          <li>• <strong>Other providers:</strong> Check your email provider's IMAP/SMTP settings</li>
        </ul>
      </div>
    </div>
  );
}
