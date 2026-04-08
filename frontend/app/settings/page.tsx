'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { RequireAuth } from '@/components/auth-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToastContainer } from '@/components/toast-notification';
import EmailIntegrations from '@/components/email-integrations';
import AccountSettings from '@/components/account-settings';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');

  return (
    <RequireAuth>
      <div className="flex h-screen bg-background">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto">
            <div className="p-6 max-w-4xl">
              <h1 className="text-3xl font-bold mb-2">Settings</h1>
              <p className="text-gray-600 mb-6">Manage your account and integrations</p>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="integrations">Email Integrations</TabsTrigger>
                </TabsList>

                <TabsContent value="account" className="space-y-6">
                  <AccountSettings />
                </TabsContent>

                <TabsContent value="integrations" className="space-y-6">
                  <EmailIntegrations />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
        <ToastContainer />
      </div>
    </RequireAuth>
  );
}
