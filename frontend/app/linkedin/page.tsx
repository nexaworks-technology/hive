'use client';

import React, { useState, useEffect } from 'react';
import { Linkedin, Rocket, AlertCircle, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSessionContext } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase-client';
import LinkedInCampaignModal from './CampaignModal';
import { formatDistanceToNow } from 'date-fns';

export default function LinkedinHub() {
  const { session } = useSessionContext();
  const [cookie, setCookie] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hasExistingCookie, setHasExistingCookie] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.user_metadata?.linkedin_cookie) {
      setHasExistingCookie(true);
      setCookie('********-****-****-****-************'); // mask it
    }
    
    const fetchCampaigns = async () => {
      if (!session?.access_token) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/linkedin/campaigns`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.campaigns || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCampaigns();
  }, [session]);

  const handleSaveCookie = async () => {
    if (!cookie.trim() || cookie.includes('****')) return;
    
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const { error } = await supabase.auth.updateUser({
        data: { linkedin_cookie: cookie.trim() }
      });

      if (error) throw error;
      
      setSaveStatus('success');
      setHasExistingCookie(true);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-background text-foreground animate-in fade-in">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
              <div className="w-10 h-10 rounded-xl bg-[#0a66c2]/10 dark:bg-[#70b5f9]/10 flex items-center justify-center">
                <Linkedin className="w-5 h-5 text-[#0a66c2] dark:text-[#70b5f9]" />
              </div>
              LinkedIn Outreach
            </h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl">
              Automate hyper-personalized connection requests and follow-ups. Build massive networks on autopilot.
            </p>
          </div>
          <Button disabled={!hasExistingCookie} onClick={() => setShowModal(true)} className="gap-2 bg-[#0a66c2] hover:bg-[#0a66c2]/90 text-white font-bold">
            <Rocket className="w-4 h-4" />
            Launch Campaign
          </Button>
        </div>

        {/* Configuration Card */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/20">
            <h2 className="text-lg font-bold flex items-center gap-2">
              Step 1: Connect your Account
            </h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              To bypass API restrictions, Hive uses your secure <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-primary">li_at</code> session cookie to send requests exactly as you would natively.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="password"
                placeholder={hasExistingCookie ? "Cookie securely saved. 🔒" : "Paste your li_at cookie here..."}
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
              />
              <Button 
                onClick={handleSaveCookie} 
                disabled={isSaving || !cookie.trim() || cookie.includes('****')} 
                className="h-10 px-6 rounded-xl flex-shrink-0"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {hasExistingCookie && !cookie.includes('****') ? 'Update Cookie' : 'Save Connection'}
              </Button>
            </div>
            
            {saveStatus === 'success' && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-3 flex items-center gap-1.5 font-medium animate-in slide-in-from-top-1">
                <CheckCircle2 className="w-4 h-4" /> Successfully connected account!
              </p>
            )}
            {saveStatus === 'error' && (
              <p className="text-sm text-destructive mt-3 flex items-center gap-1.5 font-medium animate-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4" /> Failed to save cookie.
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-4 flex items-start gap-1.5 bg-background p-3 rounded-lg border border-border w-fit">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> 
              <span>
                <strong>How to find it:</strong> Log in to LinkedIn on your browser.<br/>
                Open Developer Tools (F12) &gt; Application tab &gt; Cookies &gt; linkedin.com.<br/>
                Copy the value of the cookie named <strong>li_at</strong>.
              </span>
            </p>
          </div>
        </div>

        {/* Campaigns List */}
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : campaigns.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-muted outline outline-offset-8 outline-muted/50 flex items-center justify-center mx-auto mb-6">
              <Linkedin className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Active Campaigns</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              Connect your account above and launch your first automated LinkedIn networking sequence.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Active Campaigns</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {campaigns.map(camp => {
                const total = camp.payload.leads?.length || 0;
                const sent = camp.payload.leads?.filter((l: any) => l.connectionSent).length || 0;
                
                return (
                  <div key={camp.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-semibold">{camp.title}</h4>
                      <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded font-medium capitalize">{camp.status}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                      Launched {formatDistanceToNow(new Date(camp.created_at))} ago
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Requests Sent</span>
                        <span>{sent} / {total}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-[#0a66c2]" style={{ width: `${total ? (sent/total)*100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {showModal && (
        <LinkedInCampaignModal 
          session={session} 
          onClose={() => setShowModal(false)} 
          onLaunched={(id) => {
            setShowModal(false);
            window.location.reload(); 
          }} 
        />
      )}
    </div>
  );
}
