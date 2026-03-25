'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useSessionContext } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase-client';
import {
  PanelLeftClose,
  PanelRightClose,
  Settings,
  LogOut,
  SunMedium,
  Moon,
  ChevronRight,
  ChevronDown,
  Mail,
  User,
  Calendar,
  SlidersHorizontal,
  Plus,
  Inbox,
  BarChart3,
  SquarePen,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSessionContext();
  const [isOpen, setIsOpen] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [inboundCampaigns, setInboundCampaigns] = useState<any[]>([]);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [selectedSection, setSelectedSection] = useState('general');
  const [inboundExpanded, setInboundExpanded] = useState(true);
  const apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  useEffect(() => {
    const root = document.documentElement.classList;
    if (isDarkMode) root.add('dark');
    else root.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as any;
      if (data?.type === 'hive-google-connected') {
        setGoogleConnected(true);
        setShowGoogleAuth(false);
        router.push('/inbound');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [router]);

  useEffect(() => {
    const loadInboundCampaigns = async () => {
      if (!session) return;
      try {
        const res = await fetch(`${apiBaseUrl}/inbound/campaigns`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const payload = await res.json().catch(() => ({}));
        setInboundCampaigns(payload.campaigns || []);
      } catch {}
    };
    if (session) loadInboundCampaigns();
  }, [apiBaseUrl, session]);

  useEffect(() => {
    const fetchGoogleStatus = async () => {
      if (!session) { setGoogleConnected(false); return; }
      try {
        const res = await fetch(`${apiBaseUrl}/google/status`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error || 'Failed to check Google status');
        setGoogleConnected(Boolean(payload?.connected));
      } catch {
        setGoogleConnected(false);
      }
    };
    fetchGoogleStatus();
  }, [apiBaseUrl, session]);

  const isOnInbound = pathname?.startsWith('/inbound');

  const sidebarBtn = `${isOpen ? 'w-full justify-start gap-2.5 px-3' : 'w-11 h-11 p-0 flex items-center justify-center'} text-sidebar-foreground dark:text-white hover:bg-[#efefef] dark:hover:bg-[#303030] hover:text-black dark:hover:text-white transition-colors rounded-lg text-sm font-medium`;

  const activeBtn = 'bg-[#efefef] dark:bg-[#303030] text-black dark:text-white';

  return (
    <div
      className={`${isOpen ? 'w-64' : 'w-[72px] cursor-e-resize'} bg-sidebar dark:bg-[#181818] border-r border-sidebar-border flex flex-col h-screen transition-all duration-200 overflow-hidden`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={() => { if (!isOpen) setIsOpen(true); }}
    >
      {/* Header */}
      <div className={`${isOpen ? 'px-5 py-4 justify-between' : 'p-3 justify-center relative'} flex items-center border-b border-sidebar-border`}>
        <div className={`flex items-center ${isOpen ? 'gap-2' : 'gap-0'}`}>
          <img
            src="/assests/hivelogo.svg"
            alt="Hive logo"
            className={`flex-shrink-0 dark:invert dark:brightness-0 ${!isOpen && isHovering ? 'hidden' : 'h-7 w-7'}`}
          />
          <span className={`text-xl font-bold text-primary transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
            Hive
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={`text-sidebar-foreground hover:bg-[#efefef] focus-visible:ring-0 focus-visible:ring-offset-0 ${
            isOpen ? '' : 'w-10 h-10 p-0 absolute inset-y-0 right-3 my-auto flex items-center justify-center'
          }`}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? (
            <PanelLeftClose className="w-5 h-5 text-black dark:text-white" />
          ) : isHovering ? (
            <PanelRightClose className="w-5 h-5 text-black dark:text-white" />
          ) : null}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">

        {/* ── INBOUND SECTION ── */}
        <div>
          <button
            onClick={() => isOpen && setInboundExpanded((p) => !p)}
            className={`w-full flex items-center ${isOpen ? 'justify-between px-3 py-2' : 'justify-center py-2'} rounded-lg group`}
          >
            <div className={`flex items-center gap-2 ${isOpen ? '' : 'justify-center w-full'}`}>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${isOnInbound ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                <Inbox className="w-3.5 h-3.5" />
              </div>
              {isOpen && <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inbound</span>}
            </div>
            {isOpen && (
              inboundExpanded
                ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>

          {(inboundExpanded || !isOpen) && (
            <div className={`${isOpen ? 'ml-2 mt-1' : 'mt-1'} space-y-0.5`}>
              {/* Overview */}
              <Button
                variant="ghost"
                size="sm"
                className={`${sidebarBtn} h-9 ${pathname === '/inbound' && !pathname?.includes('/campaign') ? activeBtn : ''}`}
                onClick={() => {
                  if (!googleConnected) { setShowGoogleAuth(true); return; }
                  router.push('/inbound');
                }}
              >
                <BarChart3 className="w-4 h-4 flex-shrink-0" />
                {isOpen && <span>Overview</span>}
              </Button>

              {/* New Campaign */}
              <Button
                variant="ghost"
                size="sm"
                className={`${sidebarBtn} h-9`}
                onClick={() => {
                  if (!googleConnected) { setShowGoogleAuth(true); return; }
                  router.push('/inbound/new');
                }}
              >
                <SquarePen className="w-4 h-4 flex-shrink-0" />
                {isOpen && <span>New Campaign</span>}
              </Button>

              {/* Inbound Campaigns list */}
              {isOpen && (
                <div className="pt-1">
                  <div className="flex items-center gap-1.5 px-3 py-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Campaigns</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                    {inboundCampaigns.length === 0 ? (
                      <div className="text-xs text-muted-foreground px-3 py-1">No campaigns yet</div>
                    ) : inboundCampaigns.map((campaign: any) => (
                      <Button
                        key={campaign.campaignId || campaign.id}
                        variant="ghost"
                        size="sm"
                        className={`w-full justify-start text-left text-xs px-3 h-8 font-normal text-sidebar-foreground hover:bg-[#efefef] dark:hover:bg-[#303030] ${pathname === `/inbound/campaign/${campaign.campaignId || campaign.id}` ? activeBtn : ''}`}
                        onClick={() => router.push(`/inbound/campaign/${campaign.campaignId || campaign.id}`)}
                      >
                        <span className="truncate" title={campaign.title || campaign.campaignId || campaign.id}>
                          {campaign.title || campaign.campaignId || campaign.id}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-sidebar-border mx-1 my-2" />

        {/* Profile */}
        <Button
          variant="ghost"
          size="sm"
          className={`${sidebarBtn} h-9`}
          onClick={() => router.push('/profile')}
        >
          <User className="w-4 h-4 flex-shrink-0" />
          {isOpen && <span>My Profile</span>}
        </Button>
      </div>

      {/* Bottom Actions */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className={`${sidebarBtn} h-9`}
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {isOpen && <span>Settings</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`${sidebarBtn} h-9 hover:text-red-500 dark:hover:text-red-400`}
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace('/login');
          }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {isOpen && <span>Sign Out</span>}
        </Button>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="w-[850px] max-w-3xl p-0 overflow-hidden">
          <div className="flex h-[520px]">
            <div className="w-1/3 bg-muted/40 border-r p-8 flex flex-col gap-3 min-w-[200px]">
              <div className="text-lg font-semibold mb-4">Settings</div>
              {[
                { key: 'general', label: 'General', icon: <SlidersHorizontal className="w-5 h-5 mr-2 inline" /> },
                { key: 'edit-email', label: 'Edit Email', icon: <Mail className="w-5 h-5 mr-2 inline" /> },
                { key: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5 mr-2 inline" /> },
                { key: 'account', label: 'Account', icon: <User className="w-5 h-5 mr-2 inline" /> },
              ].map((s) => (
                <button
                  key={s.key}
                  className={`flex items-center text-left text-base px-3 py-2 rounded-md font-medium transition-colors ${selectedSection === s.key ? 'bg-background text-primary' : 'text-muted-foreground hover:text-primary hover:bg-muted'}`}
                  onClick={() => setSelectedSection(s.key)}
                >
                  {s.icon}{s.label}
                </button>
              ))}
            </div>
            <div className="flex-1 p-12 overflow-y-auto">
              {selectedSection === 'general' && (
                <>
                  <DialogHeader><DialogTitle className="text-2xl mb-4">General</DialogTitle></DialogHeader>
                  <div className="space-y-6">
                    <div>
                      <div className="text-base font-medium mb-1">Appearance</div>
                      <div className="flex items-center justify-between">
                        <span>Dark Mode</span>
                        <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} />
                      </div>
                    </div>
                  </div>
                </>
              )}
              {selectedSection === 'edit-email' && (
                <>
                  <DialogHeader><DialogTitle className="text-2xl mb-4">Edit Email</DialogTitle></DialogHeader>
                  <div className="flex flex-col gap-4">
                    <button className="px-5 py-2 bg-primary text-white rounded-md font-semibold w-fit hover:bg-primary/90 transition-colors flex items-center gap-2" type="button">
                      <Plus className="w-4 h-4" />Add Email
                    </button>
                    <div className="text-muted-foreground text-base max-w-md">Integrate your email to send mails to leads</div>
                  </div>
                </>
              )}
              {selectedSection === 'calendar' && (
                <>
                  <DialogHeader><DialogTitle className="text-2xl mb-4">Calendar</DialogTitle></DialogHeader>
                  <div className="text-muted-foreground">Calendar settings coming soon.</div>
                </>
              )}
              {selectedSection === 'account' && (
                <>
                  <DialogHeader><DialogTitle className="text-2xl mb-4">Account</DialogTitle></DialogHeader>
                  <div className="text-muted-foreground">Account settings coming soon.</div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Auth Dialog */}
      <Dialog open={showGoogleAuth} onOpenChange={setShowGoogleAuth}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <img src="/assests/hivelogo.svg" alt="Hive" className="h-8 w-8" />
              <span className="text-lg font-semibold">Authorize Hive × Google Workspace</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/50 border border-border">
            <img src="/assests/hivelogo.svg" alt="Hive" className="h-10 w-10" />
            <span className="text-xl font-semibold">×</span>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-md bg-[#4285F4] text-white font-semibold text-sm grid place-items-center">G</div>
              <span className="text-sm font-semibold">Google Workspace</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Authorize Hive to securely check your calendar availability, schedule meetings, and automatically send outreach emails from your connected Gmail account. You can revoke access anytime.
          </p>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowGoogleAuth(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                setIsAuthorizing(true);
                try {
                  const res = await fetch(`${apiBaseUrl}/google/auth-url`, {
                    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
                  });
                  const payload = await res.json();
                  if (!payload?.url) throw new Error('Missing auth URL');
                  window.open(payload.url, 'hive-google-consent', 'width=480,height=640');
                } catch (err) {
                  console.error('Auth URL error', err);
                } finally {
                  setIsAuthorizing(false);
                }
              }}
              disabled={isAuthorizing}
            >
              {isAuthorizing ? 'Opening...' : 'Authorize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
