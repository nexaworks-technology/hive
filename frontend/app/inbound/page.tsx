'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud, FileSpreadsheet, FileIcon, X, CheckCircle2,
  ChevronRight, Inbox, ArrowRight, ArrowLeft, AlertCircle,
  Shuffle, Users, Mail, Building2, Briefcase, Linkedin, Phone,
  Hash, Globe, Sparkles, Download, Rocket, Search, Trash2,
  ExternalLink, ChevronDown, ChevronUp, Loader2, Wand2, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useSessionContext } from '@/components/auth-provider';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'review';

interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  title?: string;
  linkedin?: string;
  phone?: string;
  website?: string;
  source?: string;
}

interface CampaignSettings {
  agencyName: string;
  service: string;
  valueProp: string;
  bookingLink: string;
  ctaStyle: 'book-call' | 'quick-chat' | 'demo';
  tone: 'professional' | 'casual' | 'direct';
}

interface EmailPreview {
  subject: string;
  body: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STANDARD_FIELDS = [
  { key: 'name',     label: 'Full Name',    icon: Users,      required: true },
  { key: 'email',    label: 'Email',        icon: Mail,       required: true },
  { key: 'company',  label: 'Company',      icon: Building2,  required: false },
  { key: 'title',    label: 'Job Title',    icon: Briefcase,  required: false },
  { key: 'linkedin', label: 'LinkedIn URL', icon: Linkedin,   required: false },
  { key: 'phone',    label: 'Phone',        icon: Phone,      required: false },
  { key: 'website',  label: 'Website',      icon: Globe,      required: false },
  { key: 'source',   label: 'Lead Source',  icon: Hash,       required: false },
];

const STEP_META = [
  { id: 'upload' as Step, label: 'Upload CSV',    },
  { id: 'map'    as Step, label: 'Map Fields',   },
  { id: 'review' as Step, label: 'Review Leads', },
];

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (c === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });

  return { headers, rows };
}

// ─── Auto-detect field mapping ────────────────────────────────────────────────

function autoDetectMapping(headers: string[]): Record<string, string | null> {
  const lower = headers.map((h) => h.toLowerCase());
  const matchers: Record<string, string[]> = {
    name:     ['name', 'full name', 'fullname', 'contact', 'person'],
    email:    ['email', 'e-mail', 'mail'],
    company:  ['company', 'organization', 'org', 'employer', 'account'],
    title:    ['title', 'job title', 'position', 'role', 'designation'],
    linkedin: ['linkedin', 'linked in', 'li url', 'profile url'],
    phone:    ['phone', 'mobile', 'cell', 'tel', 'telephone'],
    website:  ['website', 'web', 'url', 'domain', 'site'],
    source:   ['source', 'lead source', 'channel', 'origin'],
  };
  const mapping: Record<string, string | null> = {};
  STANDARD_FIELDS.forEach(({ key }) => {
    const kws = matchers[key] || [key];
    const idx = lower.findIndex((h) => kws.some((kw) => h.includes(kw)));
    mapping[key] = idx !== -1 ? headers[idx] : null;
  });
  return mapping;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const idx = STEP_META.findIndex((s) => s.id === currentStep);
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEP_META.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${done ? 'bg-primary border-primary text-primary-foreground' : active ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
            </div>
            {i < STEP_META.length - 1 && (
              <div className={`h-0.5 w-24 mt-[-16px] mx-1 transition-all duration-500 ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1: Upload ───────────────────────────────────────────────────────────

function UploadStep({ onParsed }: { onParsed: (file: File, headers: string[], rows: Record<string, string>[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const processFile = useCallback((f: File) => {
    if (!f.name.endsWith('.csv') && f.type !== 'text/csv') { setError('Please upload a valid .csv file'); return; }
    setError(null); setFile(f);
  }, []);

  const handleProcess = () => {
    if (!file) return;
    setIsProcessing(true); setProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 12 + 4;
      setProgress(Math.min(p, 90));
      if (p >= 90) {
        clearInterval(iv);
        const reader = new FileReader();
        reader.onload = (e) => {
          const { headers, rows } = parseCSV(e.target?.result as string);
          setProgress(100);
          setTimeout(() => onParsed(file, headers, rows), 400);
        };
        reader.readAsText(file);
      }
    }, 80);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4"><Inbox className="w-7 h-7 text-primary" /></div>
        <h1 className="text-4xl font-bold tracking-tight">Inbound Hot Leads</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">Upload your raw .csv of hot leads. Hive will extract, scrub, and send personalized outreach — automatically.</p>
      </div>

      <div
        className={`relative mt-6 rounded-2xl border-2 border-dashed transition-all duration-300 p-10 text-center cursor-pointer group ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : file ? 'border-border bg-card' : 'border-border bg-card/50 hover:bg-card hover:border-primary/40'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }}
        onClick={() => !file && ref.current?.click()}
      >
        <input type="file" ref={ref} className="hidden" accept=".csv" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
        {!file ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"><UploadCloud className="w-8 h-8 text-primary" /></div>
            <div><p className="text-xl font-semibold mb-1">Click to upload or drag & drop</p><p className="text-sm text-muted-foreground">CSV files only — up to 50 MB</p></div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground"><FileSpreadsheet className="w-3.5 h-3.5" /><span>e.g. &quot;Webinar_Leads_March.csv&quot;</span></div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              {progress === 100 ? <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center"><CheckCircle2 className="w-8 h-8 text-green-500" /></div> : <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"><FileIcon className="w-8 h-8 text-primary" /></div>}
              {!isProcessing && progress !== 100 && <button onClick={(e) => { e.stopPropagation(); setFile(null); setProgress(0); if (ref.current) ref.current.value = ''; }} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center shadow-md transition-colors"><X className="w-3 h-3" /></button>}
            </div>
            <div className="text-center"><p className={`text-lg font-semibold ${progress === 100 ? 'text-green-500' : ''}`}>{file.name}</p><p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div>
            {isProcessing && (
              <div className="w-full max-w-sm flex flex-col gap-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{progress < 100 ? 'Parsing CSV...' : 'Done!'}</span><span className="font-bold">{Math.round(progress)}%</span></div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden"><div className={`h-full transition-all duration-300 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} /></div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div className="flex items-center gap-2 text-destructive text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
      {file && !isProcessing && progress === 0 && (
        <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2">
          <Button size="lg" onClick={handleProcess} className="font-semibold gap-2 px-8">Parse & Map Fields<ArrowRight className="w-4 h-4" /></Button>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Map Fields ───────────────────────────────────────────────────────

function MapFieldsStep({ file, headers, rows, onNext, onBack }: { file: File; headers: string[]; rows: Record<string, string>[]; onNext: (m: Record<string, string | null>) => void; onBack: () => void; }) {
  const [mapping, setMapping] = useState<Record<string, string | null>>(() => autoDetectMapping(headers));
  const autoDetected = Object.values(mapping).filter(Boolean).length;
  const requiredMapped = STANDARD_FIELDS.filter((f) => f.required).every((f) => mapping[f.key]);

  const getPreview = (col: string | null) => col ? rows.slice(0, 3).map((r) => r[col] || '—') : [];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4"><Shuffle className="w-7 h-7 text-primary" /></div>
        <h1 className="text-4xl font-bold tracking-tight">Map Your Fields</h1>
        <p className="text-muted-foreground text-lg">We detected <span className="font-semibold text-foreground">{headers.length} columns</span> and <span className="font-semibold text-foreground">{rows.length.toLocaleString()} rows</span> in <span className="text-primary font-medium">{file.name}</span></p>
      </div>

      {autoDetected > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
          <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
          <span><span className="font-semibold text-primary">Hive auto-detected {autoDetected} fields</span> — review and adjust below as needed.</span>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {STANDARD_FIELDS.map(({ key, label, icon: Icon, required }) => {
          const col = mapping[key];
          const previews = getPreview(col);
          return (
            <div key={key} className="px-5 py-4 flex items-center gap-4">
              <div className="flex items-center gap-2.5 w-44 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><Icon className="w-4 h-4 text-muted-foreground" /></div>
                <div><p className="text-sm font-semibold leading-tight">{label}</p>{required && <span className="text-[10px] font-bold text-destructive uppercase tracking-wide">Required</span>}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <select value={col ?? '__none__'} onChange={(e) => setMapping((p) => ({ ...p, [key]: e.target.value === '__none__' ? null : e.target.value }))} className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow">
                  <option value="__none__">— Skip this field —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
                {previews.map((v, i) => <span key={i} className="px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground max-w-[90px] truncate" title={v}>{v}</span>)}
                {!col && <span className="px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground italic">not mapped</span>}
              </div>
            </div>
          );
        })}
      </div>

      {!requiredMapped && <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span>Map at least <strong>Full Name</strong> and <strong>Email</strong> to continue.</span></div>}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
        <Button size="lg" onClick={() => onNext(mapping)} disabled={!requiredMapped} className="font-semibold gap-2 px-8">Review Leads<ArrowRight className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

// ─── Campaign Setup Modal ─────────────────────────────────────────────────────

function CampaignSetupModal({
  leads,
  onClose,
  onLaunched,
  session,
}: {
  leads: Lead[];
  onClose: () => void;
  onLaunched: (campaignId: string) => void;
  session: any;
}) {
  const profileName = (session?.user?.user_metadata as any)?.full_name || (session?.user?.user_metadata as any)?.name || '';
  const [settings, setSettings] = useState<CampaignSettings>({
    agencyName: profileName,
    service: '',
    valueProp: '',
    bookingLink: '',
    ctaStyle: 'book-call',
    tone: 'professional',
  });
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const validLeads = leads.filter((l) => l.email?.includes('@') && l.name);
  const firstLead = validLeads[0];

  const canPreview = settings.agencyName && settings.service && settings.valueProp && settings.bookingLink && firstLead;
  const canLaunch = canPreview && validLeads.length > 0;

  const handlePreview = async () => {
    if (!canPreview) return;
    setIsPreviewing(true);
    setPreviewError(null);
    try {
      const res = await fetch(`${API_BASE}/inbound/preview-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ lead: firstLead, settings }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error(`Backend returned non-JSON (${res.status}). Is the backend running and restarted?`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Preview failed');
      setPreview(data);
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to generate preview');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleLaunch = async () => {
    if (!canLaunch) return;
    setIsLaunching(true);
    setLaunchError(null);
    try {
      const res = await fetch(`${API_BASE}/inbound/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ leads: validLeads, settings }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error(`Backend returned non-JSON (${res.status}). Is the backend running and restarted?`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Launch failed');
      onLaunched(data.campaignId);
    } catch (err: any) {
      setLaunchError(err.message || 'Failed to launch campaign');
      setIsLaunching(false);
    }
  };

  const set = (k: keyof CampaignSettings, v: string) => {
    setSettings((p) => ({ ...p, [k]: v }));
    setPreview(null); // reset preview when settings change
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-background border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Rocket className="w-5 h-5 text-primary" /></div>
            <div>
              <h2 className="text-lg font-bold">Campaign Setup</h2>
              <p className="text-xs text-muted-foreground">{validLeads.length} leads ready for personalized outreach</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-7">

          {/* Agency Context */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
              <span>Who are you?</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Your name / agency name <span className="text-destructive">*</span></label>
                <input
                  value={settings.agencyName}
                  onChange={(e) => set('agencyName', e.target.value)}
                  placeholder="e.g. Pavan @ NexaWorks"
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Your service / offer <span className="text-destructive">*</span></label>
                <input
                  value={settings.service}
                  onChange={(e) => set('service', e.target.value)}
                  placeholder="e.g. Paid media for B2B SaaS"
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Core value proposition <span className="text-destructive">*</span></label>
              <textarea
                value={settings.valueProp}
                onChange={(e) => set('valueProp', e.target.value)}
                placeholder="e.g. We help B2B SaaS companies add $500K ARR through high-intent paid channels — without bloating their team."
                rows={2}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Booking / Calendly Link <span className="text-destructive">*</span></label>
              <input
                value={settings.bookingLink}
                onChange={(e) => set('bookingLink', e.target.value)}
                placeholder="e.g. https://calendly.com/yourname/15min"
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>
          </div>

          {/* Tone & CTA */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
              <span>Email style</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tone</label>
                <select value={settings.tone} onChange={(e) => set('tone', e.target.value as CampaignSettings['tone'])} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow">
                  <option value="professional">Professional</option>
                  <option value="casual">Casual & friendly</option>
                  <option value="direct">Direct & bold</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Call to action</label>
                <select value={settings.ctaStyle} onChange={(e) => set('ctaStyle', e.target.value as CampaignSettings['ctaStyle'])} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow">
                  <option value="book-call">Book a call</option>
                  <option value="quick-chat">Quick chat</option>
                  <option value="demo">See a demo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Email Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                <span>Email preview</span>
              </div>
              <Button variant="outline" size="sm" onClick={handlePreview} disabled={!canPreview || isPreviewing} className="gap-2 text-xs">
                {isPreviewing ? <><Loader2 className="w-3 h-3 animate-spin" />Generating...</> : <><Wand2 className="w-3 h-3" />Generate preview</>}
              </Button>
            </div>

            {firstLead && (
              <p className="text-xs text-muted-foreground">Preview for: <span className="font-medium text-foreground">{firstLead.name}</span>{firstLead.company ? ` · ${firstLead.company}` : ''}{firstLead.title ? ` · ${firstLead.title}` : ''}</p>
            )}

            {previewError && <div className="flex items-center gap-2 text-destructive text-sm p-3 rounded-xl bg-destructive/5 border border-destructive/20"><AlertCircle className="w-4 h-4 flex-shrink-0" />{previewError}</div>}

            {preview ? (
              <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Subject</p>
                  <p className="font-semibold text-sm">{preview.subject}</p>
                </div>
                <div className="px-4 py-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Body</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{preview.body}</p>
                </div>
                <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Each email is uniquely personalized per lead</span>
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7" onClick={handlePreview} disabled={isPreviewing}>
                    <Wand2 className="w-3 h-3" />Regenerate
                  </Button>
                </div>
              </div>
            ) : (
              !isPreviewing && (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                  <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">Fill in your details above, then click <span className="font-medium text-foreground">Generate preview</span> to see an AI-crafted email for your first lead.</p>
                </div>
              )
            )}

            {isPreviewing && !preview && (
              <div className="rounded-xl border border-border bg-muted/20 p-8 flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Crafting your personalized email...</p>
              </div>
            )}
          </div>

          {/* Launch */}
          {launchError && <div className="flex items-center gap-2 text-destructive text-sm p-3 rounded-xl bg-destructive/5 border border-destructive/20"><AlertCircle className="w-4 h-4 flex-shrink-0" />{launchError}</div>}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="text-sm text-muted-foreground">
              {validLeads.length < leads.length && <span className="text-amber-600 dark:text-amber-400">{leads.length - validLeads.length} leads skipped (missing data) · </span>}
              <span className="font-semibold text-foreground">{validLeads.length}</span> emails will be sent
            </div>
            <Button
              size="lg"
              onClick={handleLaunch}
              disabled={!canLaunch || isLaunching}
              className="font-bold gap-2 px-8 bg-primary hover:bg-primary/90"
            >
              {isLaunching ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Sending {validLeads.length} emails...</>
              ) : (
                <><Rocket className="w-4 h-4" />Send to all {validLeads.length} leads</>
              )}
            </Button>
          </div>

          {isLaunching && (
            <div className="text-xs text-muted-foreground text-center animate-in fade-in">
              ✦ Generating personalized emails and sending — this may take a moment...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Review Leads ─────────────────────────────────────────────────────

function ReviewLeadsStep({
  file, rows, mapping, onBack, onLaunch, session,
}: {
  file: File;
  rows: Record<string, string>[];
  mapping: Record<string, string | null>;
  onBack: () => void;
  onLaunch: (campaignId: string) => void;
  session: any;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [removedIdx, setRemovedIdx] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const PAGE_SIZE = 8;

  React.useEffect(() => {
    const fetchGoogleStatus = async () => {
      if (!session?.access_token) return;
      try {
        const res = await fetch(`${API_BASE}/google/status`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setGoogleConnected(Boolean(data?.connected));
        }
      } catch (err) {}
    };
    fetchGoogleStatus();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'hive-google-connected' || (e.data?.type === 'hive-google-tokens' && e.data?.tokens)) {
        setGoogleConnected(true);
        setShowGoogleAuth(false);
        // Automatically open the campaign setup modal after successful connection
        setShowModal(true); 
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [session]);

  const handleLaunchClick = () => {
    if (!googleConnected) {
      setShowGoogleAuth(true);
    } else {
      setShowModal(true);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch(`${API_BASE}/google/auth-url`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.open(data.url, 'hive-google-consent', 'width=480,height=640');
    } catch (err) {
      console.error(err);
    }
  };

  // Normalize rows → leads
  const mapped: Lead[] = rows
    .filter((_, i) => !removedIdx.has(i))
    .map((row, i) => {
      const lead: Lead = { id: String(i), name: '', email: '' };
      STANDARD_FIELDS.forEach(({ key }) => {
        const col = mapping[key];
        (lead as any)[key] = col ? (row[col] || '') : '';
      });
      return lead;
    });

  const filtered = mapped.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(l).some((v) => String(v).toLowerCase().includes(s));
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = (String((a as any)[sortKey] || '')).toLowerCase();
    const bv = (String((b as any)[sortKey] || '')).toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageLeads = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const validLeads = mapped.filter((l) => l.email?.includes('@') && l.name);
  const missingData = mapped.filter((l) => !l.email || !l.name).length;

  const handleSort = (key: string) => { if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } };

  const SortIcon = ({ field }: { field: string }) => sortKey !== field ? <ChevronDown className="w-3 h-3 opacity-30" /> : sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-primary" />;

  return (
    <>
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4"><Users className="w-7 h-7 text-primary" /></div>
          <h1 className="text-4xl font-bold tracking-tight">Review Your Leads</h1>
          <p className="text-muted-foreground text-lg"><span className="font-semibold text-foreground">{mapped.length.toLocaleString()} leads</span> parsed from <span className="text-primary font-medium">{file.name}</span></p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Leads', value: mapped.length, color: 'text-foreground' },
            { label: 'Ready to Send', value: validLeads.length, color: 'text-green-500' },
            { label: 'Missing Data', value: missingData, color: missingData > 0 ? 'text-amber-500' : 'text-green-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl px-4 py-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {missingData > 0 && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{missingData} leads are missing name or email and will be skipped.
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search leads…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['name', 'email', 'company', 'title'].map((field) => {
                    if (!mapping[field]) return null;
                    const sf = STANDARD_FIELDS.find((f) => f.key === field)!;
                    return <th key={field} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground select-none" onClick={() => handleSort(field)}><div className="flex items-center gap-1.5">{sf.label}<SortIcon field={field} /></div></th>;
                  })}
                  {mapping['linkedin'] && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left">LinkedIn</th>}
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageLeads.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No leads match your search.</td></tr>
                ) : pageLeads.map((lead) => {
                  const hasEmail = lead.email?.includes('@');
                  return (
                    <tr key={lead.id} className="hover:bg-muted/30 transition-colors group">
                      {['name', 'email', 'company', 'title'].map((field) => {
                        if (!mapping[field]) return null;
                        return <td key={field} className="px-4 py-3">{field === 'email' ? <span className="font-mono text-xs text-muted-foreground">{(lead as any)[field] || '—'}</span> : <span className={`font-medium ${!(lead as any)[field] ? 'text-muted-foreground italic text-xs' : ''}`}>{(lead as any)[field] || 'n/a'}</span>}</td>;
                      })}
                      {mapping['linkedin'] && <td className="px-4 py-3">{lead.linkedin ? <a href={lead.linkedin.startsWith('http') ? lead.linkedin : `https://${lead.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">View <ExternalLink className="w-3 h-3" /></a> : <span className="text-muted-foreground text-xs">—</span>}</td>}
                      <td className="px-4 py-3"><Badge variant="secondary" className={`text-xs ${hasEmail ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>{hasEmail ? 'Ready' : 'Incomplete'}</Badge></td>
                      <td className="px-3 py-3">
                        <button onClick={() => { let count = 0; for (let i = 0; i < rows.length; i++) { if (removedIdx.has(i)) continue; if (String(count) === lead.id) { setRemovedIdx((p) => new Set([...p, i])); break; } count++; } }} className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 flex items-center justify-center transition-all text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-sm text-muted-foreground">
              <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors font-medium">← Prev</button>
                <span>Page {page + 1} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors font-medium">Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <Button variant="outline" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2"><Download className="w-4 h-4" />Export CSV</Button>
            <Button size="lg" onClick={handleLaunchClick} disabled={validLeads.length === 0} className="font-semibold gap-2 px-8">
              <Rocket className="w-4 h-4" />Launch Outreach ({validLeads.length})
            </Button>
          </div>
        </div>
      </div>

      {showGoogleAuth && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowGoogleAuth(false)} />
          <div className="relative w-full max-w-md bg-background border border-border rounded-3xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-5"><Mail className="w-8 h-8 text-primary" /></div>
            <h2 className="text-2xl font-bold mb-3 tracking-tight">Connect Workspace</h2>
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
              Hive requires access to your Google Workspace to send outreach emails and schedule meetings automatically.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" variant="outline" onClick={() => setShowGoogleAuth(false)} className="w-full sm:w-auto font-medium">Cancel</Button>
              <Button size="lg" onClick={handleConnectGoogle} className="w-full sm:w-auto gap-2 font-semibold">
                <Globe className="w-4 h-4" />Connect Google
              </Button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <CampaignSetupModal
          leads={mapped}
          session={session}
          onClose={() => setShowModal(false)}
          onLaunched={onLaunch}
        />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InboundPage() {
  const router = useRouter();
  const { session } = useSessionContext();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});

  const handleParsed = (f: File, h: string[], r: Record<string, string>[]) => { setFile(f); setHeaders(h); setRows(r); setStep('map'); };

  return (
    <div className="flex-1 min-h-screen bg-background text-foreground flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <StepIndicator currentStep={step} />
        {step === 'upload' && <UploadStep onParsed={handleParsed} />}
        {step === 'map' && file && <MapFieldsStep file={file} headers={headers} rows={rows} onNext={(m) => { setMapping(m); setStep('review'); }} onBack={() => setStep('upload')} />}
        {step === 'review' && file && (
          <ReviewLeadsStep
            file={file}
            rows={rows}
            mapping={mapping}
            onBack={() => setStep('map')}
            session={session}
            onLaunch={(campaignId) => router.push(`/inbound/campaign/${campaignId}`)}
          />
        )}
      </div>
    </div>
  );
}
