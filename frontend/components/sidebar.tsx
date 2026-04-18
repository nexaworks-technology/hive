'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { workflowManager, type WorkflowState } from '@/lib/workflow-context';
import { useSessionContext } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  SquarePen,
  Search,
  PanelLeftClose,
  PanelRightClose,
  Settings,
  LogOut,
  SunMedium,
  Moon,
  ChevronRight,
  LayoutDashboard,
  Mail,
  User,
  Calendar,
  SlidersHorizontal,
  Plus,
  Inbox,
  Linkedin,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const router = useRouter();
  const { session } = useSessionContext();
  const [isOpen, setIsOpen] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [integratedGmailEmail, setIntegratedGmailEmail] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState('general');
  const apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  const profileName =
    (session?.user?.user_metadata as any)?.full_name ||
    (session?.user?.user_metadata as any)?.name ||
    session?.user?.email?.split('@')[0] ||
    'User';
  const profileEmail = session?.user?.email;
  const profileAvatar = (session?.user?.user_metadata as any)?.avatar_url;
  const profileInitial = (profileName || 'U').trim().charAt(0).toUpperCase() || 'U';

  const handleReportBug = () => {
    const note = window.prompt('Please describe the bug');
    if (note && note.trim()) {
      alert('Thanks for reporting!');
    }
  };

  useEffect(() => {
    const root = document.documentElement.classList;
    if (isDarkMode) {
      root.add('dark');
    } else {
      root.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = workflowManager.subscribe(setWorkflowState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as any;
      if (data?.type === 'hive-google-connected') {
        setGoogleConnected(true);
        setShowGoogleAuth(false);
        setActiveTab('stage-1');
        router.push('/');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [router, setActiveTab]);

  useEffect(() => {
    const loadCampaigns = async () => {
      setIsLoadingCampaigns(true);
      try {
        const res = await fetch(`${apiBaseUrl}/campaigns-v2`, {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        if (!res.ok) throw new Error('Failed to fetch campaigns');
        const payload = await res.json().catch(() => ({}));
        setCampaigns(payload.campaigns || []);
      } catch (error) {
        console.error('Failed to load campaigns', error);
      } finally {
        setIsLoadingCampaigns(false);
      }
    };

    if (session) {
      loadCampaigns();
      
      // Poll campaigns every 5 seconds to show newly created/scraped campaigns in real-time
      const pollInterval = setInterval(() => {
        loadCampaigns();
      }, 5000);
      
      return () => clearInterval(pollInterval);
    }
  }, [apiBaseUrl, session]);

  useEffect(() => {
    const fetchGoogleStatus = async () => {
      if (!session) {
        setGoogleConnected(false);
        setIntegratedGmailEmail(null);
        return;
      }
      try {
        // Use simple endpoint that doesn't require auth
        const res = await fetch(`${apiBaseUrl}/google/status-simple`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error || 'Failed to check Google status');
        setGoogleConnected(Boolean(payload?.connected));
        // Get the integrated Gmail email from backend response
        if (payload?.connected) {
          setIntegratedGmailEmail(payload?.email || payload?.gmail_email || null);
        } else {
          setIntegratedGmailEmail(null);
        }
      } catch (error) {
        console.error('Failed to check Google status', error);
        setGoogleConnected(false);
        setIntegratedGmailEmail(null);
      }
    };

    fetchGoogleStatus();
  }, [apiBaseUrl, session, settingsOpen]);

  return (
    <div
      className={`${isOpen ? 'w-64' : 'w-20 cursor-e-resize'} bg-sidebar dark:bg-[#181818] border-r border-sidebar-border flex flex-col h-screen transition-all duration-200 overflow-hidden`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={() => {
        if (!isOpen) {
          setIsOpen(true);
        }
      }}
    >
      <div className={`${isOpen ? 'p-6 justify-between' : 'p-3 justify-center relative'} flex items-center`}>
        <div className={`flex items-center ${isOpen ? 'gap-2' : 'gap-0'}`}>
          <img
            src="/assests/hivelogo.svg"
            alt="Hive logo"
            className={`flex-shrink-0 dark:invert dark:brightness-0 ${!isOpen && isHovering ? 'hidden' : 'h-8 w-8'}`}
          />
          <div
            className={`text-2xl font-bold text-primary transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 w-0'}`}
          >
            Hive <span className="text-sm">SutraHR</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={`text-sidebar-foreground hover:bg-[#efefef] active:bg-[#efefef] focus-visible:ring-0 focus-visible:ring-offset-0 ${
            isOpen
              ? 'cursor-e-resize'
              : 'cursor-w-resize w-10 h-10 p-0 flex items-center justify-center absolute inset-y-0 right-4.5 my-auto'
          }`}
          aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? (
            <PanelLeftClose className="w-9 h-9 text-black dark:text-white cursor-e-resize" />
          ) : isHovering ? (
            <PanelRightClose className="w-9 h-9 text-black dark:text-white cursor-w-resize" />
          ) : null}
        </Button>
      </div>

      <div className="px-4 pb-4">
        <Button
          variant="ghost"
          className={`${isOpen ? 'w-full justify-start gap-2' : 'w-12 h-12 p-0 flex items-center justify-center'} text-sidebar-foreground dark:text-white hover:bg-[#efefef] dark:hover:bg-[#303030] hover:text-black dark:hover:text-white hover:shadow-sm transition-shadow`}
          onClick={() => {
            setActiveTab('dashboard');
            router.push('/dashboard');
          }}
        >
          <LayoutDashboard className="w-8 h-8" />
          <span className={isOpen ? 'inline-flex' : 'hidden'}>Dashboard</span>
        </Button>
        <Button
          variant="ghost"
          className={`${isOpen ? 'w-full justify-start gap-2' : 'w-12 h-12 p-0 flex items-center justify-center'} text-sidebar-foreground dark:text-white hover:bg-[#efefef] dark:hover:bg-[#303030] hover:text-black dark:hover:text-white hover:shadow-sm transition-shadow`}
          onClick={() => {
            setActiveTab('campaigns');
            router.push('/campaigns');
          }}
        >
          <Mail className="w-8 h-8" />
          <span className={isOpen ? 'inline-flex' : 'hidden'}>Outbound Campaigns</span>
        </Button>
        <div className="mt-0">
          <Button
            variant="ghost"
            className={`${isOpen ? 'w-full justify-start gap-2' : 'w-12 h-12 p-0 flex items-center justify-center'} text-sidebar-foreground dark:text-white hover:bg-[#efefef] dark:hover:bg-[#303030] hover:text-black dark:hover:text-white hover:shadow-sm transition-shadow`}
            onClick={() => setActiveTab('history')}
          >
            <Search className="w-8 h-8" />
            <span className={isOpen ? 'inline-flex' : 'hidden'}>Search Campaign</span>
          </Button>
          {/* Company/My Profile shortcut */}
          <div className={isOpen ? 'my-2' : 'my-2'}>
            <div className="border-t border-sidebar-border" />
          </div>
          <Button
            variant="ghost"
            className={`${isOpen ? 'w-full justify-start gap-2 mt-2' : 'w-12 h-12 p-0 flex items-center justify-center mt-2'} text-sidebar-foreground dark:text-white hover:bg-[#efefef] dark:hover:bg-[#303030] hover:text-black dark:hover:text-white hover:shadow-sm transition-shadow`}
            onClick={() => {
              if (googleConnected) {
                router.push('/inbound');
              } else {
                setShowGoogleAuth(true);
              }
            }}
          >
            <Inbox className="w-8 h-8" />
            <span className={isOpen ? 'inline-flex' : 'hidden'}>Inbound</span>
          </Button>
          <Button
            variant="ghost"
            className={`${isOpen ? 'w-full justify-start gap-2 mt-2' : 'w-12 h-12 p-0 flex items-center justify-center mt-2'} text-[#0a66c2] dark:text-[#70b5f9] hover:bg-[#0a66c2]/10 dark:hover:bg-[#70b5f9]/10 hover:text-[#0a66c2] dark:hover:text-[#70b5f9] transition-shadow`}
            onClick={() => {
              setActiveTab('linkedin');
              router.push('/linkedin');
            }}
          >
            <Linkedin className="w-8 h-8" />
            <span className={isOpen ? 'inline-flex font-semibold' : 'hidden'}>LinkedIn</span>
          </Button>
          <div className={`${isOpen ? 'flex' : 'hidden'} items-center gap-2 text-base text-[#AFAFAF] mt-2 pl-2`}>
            <span>campaigns</span>
            <ChevronRight className="w-5 h-5" />
          </div>
          <div className={`${isOpen ? 'mt-2 max-h-[30vh] overflow-y-auto space-y-1 pr-1' : 'hidden'}`}>
            {isLoadingCampaigns ? (
              <div className="space-y-1 pr-1" aria-label="Loading campaigns">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-9 w-full rounded-md bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : (campaigns.length > 0 ? campaigns : workflowState?.campaignHistory || []).length === 0 ? (
              <div className="text-xs text-muted-foreground px-2 py-1">No campaigns yet</div>
            ) : (
              (campaigns.length > 0 ? campaigns : workflowState?.campaignHistory || []).map((campaign) => (
                <Button
                  key={campaign.id}
                  variant="ghost"
                  className="w-full justify-start text-left text-sm px-2 h-auto py-2 text-sidebar-foreground hover:text-black hover:bg-[#efefef] dark:hover:bg-[#303030]"
                  onClick={() => {
                    workflowManager.setState({ currentCampaignId: campaign.id });
                    setActiveTab('history');
                    router.push(`/dashboard/${campaign.id}`);
                  }}
                >
                  <div className="flex flex-col gap-0.5 w-full">
                    <span className="truncate font-semibold text-sm" title={campaign.domain || campaign.id}>
                      {campaign.domain || campaign.id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {campaign.totalFound || campaign.leadsScraped || 0} leads · {campaign.totalEnrolled || campaign.emailsSent || 0} sent
                    </span>
                  </div>
                </Button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 border-t border-sidebar-border mt-auto bg-sidebar dark:bg-[#181818]">

        {/* Settings Dialog Popup */}
        <Button
          variant="ghost"
          className={`${isOpen ? 'w-full justify-start gap-3' : 'w-12 h-12 p-0 flex items-center justify-center'} text-sidebar-foreground dark:text-white hover:bg-[#efefef] dark:hover:bg-[#303030] hover:text-black dark:hover:text-white`}
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="w-8 h-8" />
          <span className={isOpen ? 'inline-flex' : 'hidden'}>Settings</span>
        </Button>
        {/* Settings Dialog with section switching */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="w-[850px] max-w-3xl p-0 overflow-hidden backdrop-blur-3xl">
            <div className="flex h-[520px]">
              {/* Left section: menu */}
              <div className="w-1/3 bg-muted/40 border-r p-8 flex flex-col gap-3 min-w-[200px]">
                <div className="text-lg font-semibold mb-4">Settings</div>
                {[
                  { key: 'general', label: 'General', icon: <SlidersHorizontal className="w-5 h-5 mr-2 inline" /> },
                  { key: 'profile', label: 'Outreach Profile', icon: <User className="w-5 h-5 mr-2 inline" /> },
                  { key: 'edit-email', label: 'Edit Email', icon: <Mail className="w-5 h-5 mr-2 inline" /> },
                  { key: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5 mr-2 inline" /> },
                  { key: 'account', label: 'Account', icon: <User className="w-5 h-5 mr-2 inline" /> },
                ].map((s) => (
                  <button
                    key={s.key}
                    className={`flex items-center text-left text-base px-3 py-2 rounded-md font-medium transition-colors ${selectedSection === s.key ? 'bg-background text-primary' : 'text-muted-foreground hover:text-primary hover:bg-muted'}`}
                    onClick={() => setSelectedSection(s.key)}
                  >
                    {s.icon}
                    {s.label}
                  </button>
                ))}
              </div>
              {/* Right section: details */}
              <div className="flex-1 p-12 overflow-y-auto">
                {selectedSection === 'general' && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-2xl mb-4">General</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <div className="text-base font-medium mb-1">Appearance</div>
                        <div className="flex items-center justify-between">
                          <span>System</span>
                          <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} />
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {selectedSection === 'profile' && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-2xl mb-4">Outreach Profile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-muted-foreground text-sm mb-4">
                        Configure your personal profile to personalize all cold emails. This includes your name, contact info, and Calendly link for scheduling.
                      </p>
                      <button
                        className="px-5 py-2 bg-primary text-white rounded-md font-semibold w-fit hover:bg-primary/90 transition-colors"
                        onClick={() => {
                          window.open('/settings/profile', '_blank');
                          setSettingsOpen(false);
                        }}
                      >
                        Edit Profile →
                      </button>
                    </div>
                  </>
                )}
                {selectedSection === 'edit-email' && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-2xl mb-4">Edit Email</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                      <button
                        className="px-5 py-2 bg-primary text-white rounded-md font-semibold w-fit hover:bg-primary/90 transition-colors flex items-center gap-2"
                        type="button"
                      >
                        <Plus className="w-4 h-4" />
                        Add Email
                      </button>
                      <div className="text-muted-foreground text-base max-w-md">
                        Integrate your email to send mails to leads
                      </div>
                    </div>
                  </>
                )}
                {selectedSection === 'calendar' && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-2xl mb-4">Calendar</DialogTitle>
                    </DialogHeader>
                    <div className="text-muted-foreground">Calendar settings coming soon.</div>
                  </>
                )}
                {selectedSection === 'account' && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-2xl mb-4">Account Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold block mb-2">Full Name</label>
                        <input
                          type="text"
                          defaultValue={profileName}
                          className="w-full px-3 py-2 border border-border rounded-md text-sm"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold block mb-2">Gmail Integration</label>
                        {googleConnected && integratedGmailEmail ? (
                          <>
                            <input
                              type="email"
                              defaultValue={integratedGmailEmail}
                              className="w-full px-3 py-2 border border-green-200 rounded-md text-sm bg-green-50 cursor-not-allowed"
                              disabled
                            />
                            <p className="text-xs text-green-700 mt-1">✓ Connected for sending campaigns</p>
                            <button
                              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md font-semibold w-fit hover:bg-blue-600 transition-colors"
                              onClick={() => {
                                setShowGoogleAuth(true);
                              }}
                            >
                              Reconnect Gmail
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="w-full px-3 py-2 border border-border rounded-md text-sm bg-muted text-muted-foreground">
                              Not connected
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Connect Gmail to send outbound campaigns and receive replies</p>
                            <button
                              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md font-semibold w-fit hover:bg-blue-600 transition-colors"
                              onClick={() => {
                                setShowGoogleAuth(true);
                              }}
                            >
                              Connect Gmail
                            </button>
                          </>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-semibold block mb-2">Calendar Integration</label>
                        {googleConnected && integratedGmailEmail ? (
                          <>
                            <input
                              type="email"
                              defaultValue={integratedGmailEmail}
                              className="w-full px-3 py-2 border border-green-200 rounded-md text-sm bg-green-50 cursor-not-allowed"
                              disabled
                            />
                            <p className="text-xs text-green-700 mt-1">✓ Connected for scheduling</p>
                          </>
                        ) : (
                          <>
                            <div className="w-full px-3 py-2 border border-border rounded-md text-sm bg-muted text-muted-foreground">
                              Not connected
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Click Settings → Calendar to connect</p>
                          </>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-semibold block mb-2">Company</label>
                        <input
                          type="text"
                          defaultValue="Your Company"
                          className="w-full px-3 py-2 border border-border rounded-md text-sm"
                          placeholder="Company name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold block mb-2">Location</label>
                        <input
                          type="text"
                          defaultValue="City, State"
                          className="w-full px-3 py-2 border border-border rounded-md text-sm"
                          placeholder="City, State"
                        />
                      </div>
                      <div className="pt-4 flex gap-2">
                        <Button className="bg-primary text-white hover:bg-primary/90">
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                {/* No Close button as requested */}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button
          variant="ghost"
          className={`${isOpen ? 'w-full justify-start gap-3' : 'w-12 h-12 p-0 flex items-center justify-center'} text-sidebar-foreground dark:text-white hover:bg-[#efefef] dark:hover:bg-[#303030] hover:text-black dark:hover:text-white`}
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace('/login');
          }}
        >
          <LogOut className="w-8 h-8" />
          <span className={isOpen ? 'inline-flex' : 'hidden'}>Sign Out</span>
        </Button>
      </div>

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
            <Button variant="outline" onClick={() => setShowGoogleAuth(false)}>
              Cancel
            </Button>
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
