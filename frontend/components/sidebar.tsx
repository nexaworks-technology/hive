'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Brain,
  Zap,
  Wand2,
  MessageSquare,
  Settings,
  LogOut,
  LayoutDashboard,
  History,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const router = useRouter();

  const mainLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const stageLinks = [
    { id: 'stage-1', label: 'The Spark', icon: Sparkles },
    { id: 'stage-2', label: 'The Brain', icon: Brain },
    { id: 'stage-3', label: 'The Fuel', icon: Zap },
    { id: 'stage-4', label: 'The Spear', icon: Wand2 },
    { id: 'stage-5', label: 'The Closing', icon: MessageSquare },
  ];

  const otherLinks = [
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6">
        <div className="text-2xl font-bold text-primary">Converge</div>
        <p className="text-xs text-sidebar-foreground/60 mt-1">AI Outreach</p>
      </div>

      <Separator className="bg-sidebar-border" />

      <nav className="flex-1 px-4 py-6 space-y-4">
        <div>
          <div className="px-2 py-1 mb-2">
            <p className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
              Main
            </p>
          </div>
          <div className="space-y-1">
            {mainLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <Button
                  key={link.id}
                  variant={isActive ? 'default' : 'ghost'}
                  className={`w-full justify-start gap-3 ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                  onClick={() => setActiveTab(link.id)}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="px-2 py-1 mb-2">
            <p className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
              Pipeline
            </p>
          </div>
          <div className="space-y-1">
            {stageLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <Button
                  key={link.id}
                  variant={isActive ? 'default' : 'ghost'}
                  className={`w-full justify-start gap-3 ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                  onClick={() => setActiveTab(link.id)}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="px-2 py-1 mb-2">
            <p className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
              Archive
            </p>
          </div>
          <div className="space-y-1">
            {otherLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              return (
                <Button
                  key={link.id}
                  variant={isActive ? 'default' : 'ghost'}
                  className={`w-full justify-start gap-3 ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                  onClick={() => setActiveTab(link.id)}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Button>
              );
            })}
          </div>
        </div>
      </nav>

      <Separator className="bg-sidebar-border" />

      <div className="p-4 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
        <Button
          onClick={async () => {
            try {
              await signOut(auth);
              router.push('/login');
            } catch (error) {
              console.error('Sign out error:', error);
            }
          }}
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}