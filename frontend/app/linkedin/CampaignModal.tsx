'use client';

import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, FileIcon, X, CheckCircle2, ArrowRight, ArrowLeft, AlertCircle, Users, Mail, Building2, Briefcase, Linkedin, Rocket, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LinkedInCampaignModal({
  onClose,
  onLaunched,
  session,
}: {
  onClose: () => void;
  onLaunched: (campaignId: string) => void;
  session: any;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  
  const [settings, setSettings] = useState({
    noteTemplate: 'Hi {name},\n\nI came across your profile and noticed you work at {company}. I love connecting with industry professionals and would love to add you to my network.\n\nBest,',
  });
  
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return;
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Attempt Auto-map
    const getIdx = (kws: string[]) => headers.findIndex(h => kws.some(k => h.includes(k)));
    const map = {
      name: getIdx(['name', 'first']),
      email: getIdx(['email', 'mail']),
      linkedin: getIdx(['linkedin', 'url', 'profile']),
      company: getIdx(['company', 'org']),
    };

    const parsedRows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
      return {
        name: map.name !== -1 ? vals[map.name] : '',
        email: map.email !== -1 ? vals[map.email] : '',
        linkedin: map.linkedin !== -1 ? vals[map.linkedin] : '',
        company: map.company !== -1 ? vals[map.company] : '',
      };
    }).filter(row => row.linkedin && row.linkedin.includes('linkedin.com/in/')); // Only keep actionable leads

    setLeads(parsedRows);
    setStep(2);
  };

  const processFile = (f: File) => {
    if (!f.name.endsWith('.csv')) { setError('Please upload a valid .csv file'); return; }
    setError(null); setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target?.result as string);
    reader.readAsText(f);
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/linkedin/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ leads, settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Launch failed');
      onLaunched(data.campaignId);
    } catch (err: any) {
      setError(err.message || 'Failed to launch campaign');
      setIsLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-background border border-border rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-muted/30 border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0a66c2]/10 flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-[#0a66c2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">New LinkedIn Campaign</h2>
              <p className="text-xs text-muted-foreground">{step === 1 ? 'Upload Audience' : 'Customize Messaging'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && <div className="mb-6 flex items-center gap-2 text-destructive text-sm p-3 rounded-xl bg-destructive/10 border border-destructive/20"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

          {step === 1 && (
            <div className="space-y-6">
              <div
                className={`flex flex-col items-center justify-center p-12 mt-2 rounded-3xl border-2 border-dashed transition-all duration-300 text-center cursor-pointer hover:border-[#0a66c2]/50 hover:bg-[#0a66c2]/5 ${file ? 'border-border bg-card' : 'border-border bg-card/50'}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }}
                onClick={() => !file && fileRef.current?.click()}
              >
                <input type="file" ref={fileRef} className="hidden" accept=".csv" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
                <div className="w-16 h-16 rounded-2xl bg-[#0a66c2]/10 flex items-center justify-center mb-4"><UploadCloud className="w-8 h-8 text-[#0a66c2]" /></div>
                <h3 className="text-xl font-bold mb-1">Upload LinkedIn Leads CSV</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-[250px]">Must contain a column with a valid LinkedIn Profile URL.</p>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground"><FileSpreadsheet className="w-3.5 h-3.5" /><span>e.g. "ZoomInfo_Export.csv"</span></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <span>Found <strong>{leads.length} actionable leads</strong> with valid LinkedIn URLs in the CSV.</span>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold flex items-center justify-between">
                  <span>Connection Request Note</span>
                  <span className={`text-xs ${settings.noteTemplate.length > 295 ? 'text-destructive' : 'text-muted-foreground'}`}>{settings.noteTemplate.length}/300 chars</span>
                </label>
                <p className="text-xs text-muted-foreground">Keep it under 300 characters. Use <code className="text-foreground bg-muted px-1 py-0.5 rounded">{`{name}`}</code> and <code className="text-foreground bg-muted px-1 py-0.5 rounded">{`{company}`}</code> for dynamic personalization.</p>
                
                <textarea
                  value={settings.noteTemplate}
                  onChange={(e) => setSettings({ ...settings, noteTemplate: e.target.value })}
                  rows={5}
                  className="w-full rounded-xl border border-input bg-background p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0a66c2] transition-shadow"
                />
              </div>

              <div className="bg-muted/30 border border-border rounded-xl p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Live Preview (Lead #1)</p>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {settings.noteTemplate
                    .replace('{name}', leads[0]?.name?.split(' ')[0] || 'John')
                    .replace('{company}', leads[0]?.company || 'your company')}
                </p>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-muted/30 border-t border-border p-4 flex justify-between shrink-0">
          {step === 2 ? (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={isLaunching}>Back</Button>
              <Button onClick={handleLaunch} disabled={settings.noteTemplate.length > 300 || isLaunching} className="bg-[#0a66c2] hover:bg-[#0a66c2]/90 text-white font-bold gap-2">
                {isLaunching ? <><Loader2 className="w-4 h-4 animate-spin" />Launching...</> : <><Rocket className="w-4 h-4" />Launch Campaign</>}
              </Button>
            </>
          ) : (
             <Button variant="outline" className="invisible">Back</Button>
          )}
        </div>
      </div>
    </div>
  );
}
