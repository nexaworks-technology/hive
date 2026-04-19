'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Mail, Check, X, Loader2, Trash2, Plus } from 'lucide-react';
import { toastManager } from '@/components/toast-notification';

const apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function EmailSettingsSection({ session }) {
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingId, setTestingId] = useState(null);

  const [formData, setFormData] = useState({
    email_address: '',
    imap_host: '',
    imap_port: 993,
    imap_password: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_password: '',
  });

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

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('📧 Adding email account...');
      const res = await fetch(`${apiBaseUrl}/email-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add email account');
      }

      console.log('✅ Email account added:', data.emailAccount);
      toastManager.notify({
        title: 'Email account connected',
        message: `${formData.email_address} is now connected`,
        type: 'success',
      });

      setFormData({
        email_address: '',
        imap_host: '',
        imap_port: 993,
        imap_password: '',
        smtp_host: '',
        smtp_port: 587,
        smtp_password: '',
      });
      setShowAddForm(false);
      await fetchEmailAccounts();
    } catch (err) {
      console.error('Error adding account:', err);
      toastManager.notify({
        title: 'Failed to add email account',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
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
            <Card key={account.id} className="p-4 border-border bg-secondary/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{account.email_address}</p>
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

      {/* Add New Account Form */}
      {!showAddForm ? (
        <Button
          onClick={() => setShowAddForm(true)}
          className="gap-2 w-full"
          variant="outline"
        >
          <Plus className="w-4 h-4" />
          Add Email Account
        </Button>
      ) : (
        <Card className="p-6 border-border">
          <h4 className="font-semibold text-foreground mb-4">Add Email Account</h4>

          <form onSubmit={handleAddAccount} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="hello@company.com"
                value={formData.email_address}
                onChange={(e) =>
                  setFormData({ ...formData, email_address: e.target.value })
                }
                required
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="imap_host" className="text-sm">
                  IMAP Host
                </Label>
                <Input
                  id="imap_host"
                  placeholder="imap.company.com"
                  value={formData.imap_host}
                  onChange={(e) =>
                    setFormData({ ...formData, imap_host: e.target.value })
                  }
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="imap_port" className="text-sm">
                  IMAP Port
                </Label>
                <Input
                  id="imap_port"
                  type="number"
                  value={formData.imap_port}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      imap_port: parseInt(e.target.value),
                    })
                  }
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="imap_password" className="text-sm">
                IMAP Password
              </Label>
              <Input
                id="imap_password"
                type="password"
                placeholder="Your IMAP password"
                value={formData.imap_password}
                onChange={(e) =>
                  setFormData({ ...formData, imap_password: e.target.value })
                }
                required
                className="mt-2"
              />
            </div>

            <hr className="my-4" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp_host" className="text-sm">
                  SMTP Host
                </Label>
                <Input
                  id="smtp_host"
                  placeholder="smtp.company.com"
                  value={formData.smtp_host}
                  onChange={(e) =>
                    setFormData({ ...formData, smtp_host: e.target.value })
                  }
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="smtp_port" className="text-sm">
                  SMTP Port
                </Label>
                <Input
                  id="smtp_port"
                  type="number"
                  value={formData.smtp_port}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      smtp_port: parseInt(e.target.value),
                    })
                  }
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="smtp_password" className="text-sm">
                SMTP Password
              </Label>
              <Input
                id="smtp_password"
                type="password"
                placeholder="Your SMTP password"
                value={formData.smtp_password}
                onChange={(e) =>
                  setFormData({ ...formData, smtp_password: e.target.value })
                }
                required
                className="mt-2"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Connect'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-900 dark:text-blue-100">
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
