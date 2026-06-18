'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Calendar, Mail, Settings, SlidersHorizontal, User } from 'lucide-react';
import { useSessionContext } from '@/components/auth-provider';
import { EmailSettingsSection } from '@/components/email-settings';
import { useTheme } from 'next-themes';

const apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

type EmailAccount = {
  email_address: string;
  imap_host?: string;
  imap_port?: number;
  smtp_host?: string;
  smtp_port?: number;
};

function getEmailProviderInfo(account: EmailAccount | null) {
  if (!account) {
    return { name: 'Unknown', label: 'Unknown' };
  }

  const imapHost = (account.imap_host || '').toLowerCase();
  const smtpHost = (account.smtp_host || '').toLowerCase();

  if (imapHost.includes('gmail') || smtpHost.includes('gmail')) {
    return { name: 'Gmail/Google Workspace', label: '💌 Gmail' };
  }

  if (imapHost.includes('outlook') || imapHost.includes('office365') || smtpHost.includes('outlook') || smtpHost.includes('office365')) {
    return { name: 'Microsoft Outlook 365', label: '📧 Outlook' };
  }

  if (imapHost.includes('zoho') || smtpHost.includes('zoho')) {
    return { name: 'Zoho Mail', label: '🌐 Zoho Mail' };
  }

  if (imapHost.includes('fastmail')) {
    return { name: 'Fastmail', label: '⚡ Fastmail' };
  }

  if (imapHost.includes('protonmail') || imapHost.includes('proton')) {
    return { name: 'ProtonMail', label: '🔒 ProtonMail' };
  }

  return { name: 'Custom Email', label: '📬 Business Email' };
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading } = useSessionContext();
  const [selectedSection, setSelectedSection] = useState(searchParams.get('section') || 'general');
  const { theme, setTheme } = useTheme();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [businessEmailAccount, setBusinessEmailAccount] = useState<EmailAccount | null>(null);
  const [loadingBusinessEmail, setLoadingBusinessEmail] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login');
    }
  }, [loading, router, session]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      setSelectedSection(section);
    }
  }, [searchParams]);


  useEffect(() => {
    const fetchGoogleStatus = async () => {
      if (!session) {
        setGoogleConnected(false);
        setGoogleEmail('');
        return;
      }

      try {
        const res = await fetch(`${apiBaseUrl}/google/status`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error || 'Failed to check Google status');

        setGoogleConnected(Boolean(payload?.connected));
        setGoogleEmail(payload?.email || '');
      } catch (error) {
        console.error('Failed to check Google status', error);
        setGoogleConnected(false);
        setGoogleEmail('');
      }
    };

    fetchGoogleStatus();
  }, [session]);

  useEffect(() => {
    const fetchBusinessEmailAccount = async () => {
      if (!session || selectedSection !== 'account') {
        return;
      }

      setLoadingBusinessEmail(true);
      try {
        const res = await fetch(`${apiBaseUrl}/email-accounts`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to fetch email accounts');

        const accounts = data.emailAccounts || [];
        setBusinessEmailAccount(accounts.length > 0 ? accounts[0] : null);
      } catch (error) {
        console.error('Failed to fetch email accounts:', error);
        setBusinessEmailAccount(null);
      } finally {
        setLoadingBusinessEmail(false);
      }
    };

    fetchBusinessEmailAccount();
  }, [selectedSection, session]);

  if (!session || loading) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Left Sidebar */}
      <aside className="fixed left-0 top-0 flex h-screen w-72 flex-col overflow-hidden border-r border-border bg-card p-5 shadow-lg">
          <Button variant="ghost" className="mb-4 gap-2 p-0 text-muted-foreground" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="mb-5 flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>

          <div className="space-y-2 overflow-y-auto pr-1">
            {[
              { key: 'general', label: 'General', icon: <SlidersHorizontal className="h-4 w-4" /> },
              { key: 'edit-email', label: 'Email Accounts', icon: <Mail className="h-4 w-4" /> },
              { key: 'calendar', label: 'Calendar', icon: <Calendar className="h-4 w-4" /> },
              { key: 'account', label: 'Account', icon: <User className="h-4 w-4" /> },
            ].map((section) => (
              <button
                key={section.key}
                onClick={() => setSelectedSection(section.key)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium transition-colors ${selectedSection === section.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>
        </aside>

      {/* Right Content Area - Free and Open */}
      <main className="ml-72 flex h-screen w-[calc(100%-18rem)] flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {selectedSection === 'general' && (
            <div className="min-h-full space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">General</h2>
                <p className="mt-1 text-sm text-muted-foreground">Basic appearance and workspace preferences.</p>
              </div>

              <div className="rounded-lg bg-gray-100 dark:bg-gray-900 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Appearance</p>
                    <p className="text-sm text-muted-foreground">Toggle dark mode for the workspace.</p>
                  </div>
                  <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
                </div>
              </div>
            </div>
          )}

          {selectedSection === 'edit-email' && (
            <div className="min-h-full space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Email Accounts</h2>
                <p className="mt-1 text-sm text-muted-foreground">Manage the email connected to Hive.</p>
              </div>
              <EmailSettingsSection session={session} />
            </div>
          )}

          {selectedSection === 'calendar' && (
            <div className="min-h-full space-y-3">
              <h2 className="text-2xl font-semibold">Calendar</h2>
              <p className="text-sm text-muted-foreground">Calendar settings coming soon.</p>
            </div>
          )}

          {selectedSection === 'account' && (
            <div className="min-h-full space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Account</h2>
                <p className="mt-1 text-sm text-muted-foreground">See which email accounts are currently connected.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-6 rounded-lg bg-gray-100 dark:bg-gray-900 p-5">
                  <div className="mb-3 text-base font-medium">Business Email Account</div>
                  {loadingBusinessEmail ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : businessEmailAccount ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">{getEmailProviderInfo(businessEmailAccount).label}</p>
                        <p className="text-xs text-muted-foreground mt-1">✅ Connected</p>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Connected Email:</p>
                        <p className="text-sm font-medium">{businessEmailAccount.email_address}</p>
                      </div>
                      <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                        <p>IMAP: {businessEmailAccount.imap_host}:{businessEmailAccount.imap_port}</p>
                        <p>SMTP: {businessEmailAccount.smtp_host}:{businessEmailAccount.smtp_port}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">No business email connected.</p>
                      <Button variant="outline" size="sm" onClick={() => setSelectedSection('edit-email')}>
                        Add Business Email
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-6 rounded-lg bg-gray-100 dark:bg-gray-900 p-5">
                  <div className="mb-3 text-base font-medium">Gmail / Google Workspace</div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Gmail/Google Workspace</p>
                      <p className="text-xs text-muted-foreground mt-1">{googleConnected ? '✅ Connected' : '❌ Not connected'}</p>
                    </div>
                    {googleConnected && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Connected Gmail:</p>
                        <p className="text-sm font-medium">{googleEmail || 'Loading...'}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Your Google account is connected for email sending and calendar integration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}