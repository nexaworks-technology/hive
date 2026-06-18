'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useSessionContext } from '@/components/auth-provider';
import { ArrowLeft, Loader2, Check, X } from 'lucide-react';
import { toastManager } from '@/components/toast-notification';

const apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function EmailSetupPage() {
  const router = useRouter();
  const { session, loading } = useSessionContext();
  const [isLoading, setIsLoading] = useState(false);
  const [testingForm, setTestingForm] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [existingAccount, setExistingAccount] = useState<any>(null);
  const [checkingAccount, setCheckingAccount] = useState(true);

  const [formData, setFormData] = useState({
    email_address: '',
    imap_host: '',
    imap_port: 993,
    imap_password: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_password: '',
  });

  useEffect(() => {
    if (!loading && !session) {
      toastManager.notify({
        title: 'Please log in',
        type: 'error',
      });
      router.push('/login');
    }
  }, [session, loading, router]);

  // Check if an email account already exists
  useEffect(() => {
    const checkExistingAccount = async () => {
      if (!session) {
        setCheckingAccount(false);
        return;
      }

      try {
        const res = await fetch(`${apiBaseUrl}/email-accounts`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (res.ok && data.emailAccounts && data.emailAccounts.length > 0) {
          setExistingAccount(data.emailAccounts[0]);
        }
      } catch (err) {
        console.error('Failed to check for existing account:', err);
      } finally {
        setCheckingAccount(false);
      }
    };

    checkExistingAccount();
  }, [session]);

  const handleTestConnection = async () => {
    if (!formData.email_address || !formData.imap_host || !formData.imap_password || !formData.smtp_host || !formData.smtp_password) {
      toastManager.notify({
        title: 'Missing fields',
        message: 'Please fill in all email and password fields',
        type: 'error',
      });
      return;
    }

    setTestingForm(true);

    try {
      console.log('🧪 Testing email connection...');
      const res = await fetch(`${apiBaseUrl}/email-accounts/test-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Test failed');
      }

      setTestResults(data.results);

      const imapStatus = data.results.imap.success ? '✅ IMAP Connected' : `❌ IMAP Failed: ${data.results.imap.error}`;
      const smtpStatus = data.results.smtp.success ? '✅ SMTP Connected' : `❌ SMTP Failed: ${data.results.smtp.error}`;

      toastManager.notify({
        title: 'Test Results',
        message: `${imapStatus} | ${smtpStatus}`,
        type: data.results.imap.success && data.results.smtp.success ? 'success' : 'error',
      });
    } catch (err) {
      console.error('Error testing connection:', err);
      toastManager.notify({
        title: 'Connection test failed',
        message: err.message,
        type: 'error',
      });
      setTestResults({
        imap: { success: false, error: err.message },
        smtp: { success: false, error: err.message }
      });
    } finally {
      setTestingForm(false);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    
    if (!testResults || !testResults.imap.success || !testResults.smtp.success) {
      toastManager.notify({
        title: 'Test first',
        message: 'Please test your connection before saving',
        type: 'error',
      });
      return;
    }

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

      router.push('/profile/settings?section=edit-email');
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

  if (!session || loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/profile/settings?section=edit-email')}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Button>

          <h1 className="text-3xl font-bold text-foreground">Add Email Account</h1>
          <p className="text-muted-foreground mt-2">
            Connect your email account to send and receive emails through Hive
          </p>
        </div>

        <Card className="rounded-none p-8 border-border">
          {checkingAccount ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : existingAccount ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Email Account Already Connected</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  You already have one email account connected: <span className="font-semibold">{existingAccount.email_address}</span>
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  Only one email account can be active at a time. To add a different email account, please remove the current connection first.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/profile/settings?section=edit-email')}
                  >
                    Manage Accounts
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/profile/settings?section=edit-email')}
                  >
                    Back
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAddAccount} className="space-y-6">
            {/* Email Address Section */}
            <div className="space-y-4 pb-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Email Account</h2>
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
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
            </div>

            {/* IMAP Section */}
            <div className="space-y-4 pb-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">IMAP Settings (for receiving emails)</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="imap_host" className="text-sm font-medium">
                    IMAP Host
                  </Label>
                  <Input
                    id="imap_host"
                    placeholder="imap.gmail.com"
                    value={formData.imap_host}
                    onChange={(e) =>
                      setFormData({ ...formData, imap_host: e.target.value })
                    }
                    required
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: imap.gmail.com, imappro.zoho.in
                  </p>
                </div>

                <div>
                  <Label htmlFor="imap_port" className="text-sm font-medium">
                    IMAP Port
                  </Label>
                  <Input
                    id="imap_port"
                    type="number"
                    placeholder="993"
                    value={formData.imap_port}
                    onChange={(e) =>
                      setFormData({ ...formData, imap_port: parseInt(e.target.value) })
                    }
                    required
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Usually 993 for SSL</p>
                </div>
              </div>

              <div>
                <Label htmlFor="imap_password" className="text-sm font-medium">
                  Password / App Password
                </Label>
                <Input
                  id="imap_password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.imap_password}
                  onChange={(e) =>
                    setFormData({ ...formData, imap_password: e.target.value })
                  }
                  required
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use app-specific passwords for GMail and Yahoo. Regular password for others.
                </p>
              </div>
            </div>

            {/* SMTP Section */}
            <div className="space-y-4 pb-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">SMTP Settings (for sending emails)</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtp_host" className="text-sm font-medium">
                    SMTP Host
                  </Label>
                  <Input
                    id="smtp_host"
                    placeholder="smtp.gmail.com"
                    value={formData.smtp_host}
                    onChange={(e) =>
                      setFormData({ ...formData, smtp_host: e.target.value })
                    }
                    required
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: smtp.gmail.com, smtppro.zoho.in
                  </p>
                </div>

                <div>
                  <Label htmlFor="smtp_port" className="text-sm font-medium">
                    SMTP Port
                  </Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    placeholder="587"
                    value={formData.smtp_port}
                    onChange={(e) =>
                      setFormData({ ...formData, smtp_port: parseInt(e.target.value) })
                    }
                    required
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Usually 465 (SSL) or 587 (TLS)
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="smtp_password" className="text-sm font-medium">
                  Password / App Password
                </Label>
                <Input
                  id="smtp_password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.smtp_password}
                  onChange={(e) =>
                    setFormData({ ...formData, smtp_password: e.target.value })
                  }
                  required
                  className="mt-2"
                />
              </div>
            </div>

            {/* Test Results */}
            {testResults && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Connection Test Results</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className={`rounded-none p-4 ${testResults.imap.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex items-center gap-2">
                      {testResults.imap.success ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-semibold">IMAP</p>
                        {testResults.imap.success ? (
                          <p className="text-xs text-green-600">Connected</p>
                        ) : (
                          <p className="text-xs text-red-600">{testResults.imap.error}</p>
                        )}
                      </div>
                    </div>
                  </Card>

                  <Card className={`rounded-none p-4 ${testResults.smtp.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex items-center gap-2">
                      {testResults.smtp.success ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-semibold">SMTP</p>
                        {testResults.smtp.success ? (
                          <p className="text-xs text-green-600">Connected</p>
                        ) : (
                          <p className="text-xs text-red-600">{testResults.smtp.error}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testingForm}
                className="gap-2"
              >
                {testingForm ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Test Connection
              </Button>

              <Button
                type="submit"
                disabled={isLoading || !testResults || !testResults.imap.success || !testResults.smtp.success}
                className="gap-2 flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Save Email Account
              </Button>
            </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
