'use client';

import { useEffect, useState } from 'react';
import { workflowManager, type Lead, type WorkflowState } from '@/lib/workflow-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Zap, Play, Square } from 'lucide-react';

export default function StageThree() {
  const [isScraperRunning, setIsScraperRunning] = useState(false);
  const [scrapingProgress, setScrapingProgress] = useState(0);
  const [hasDispatchedLeads, setHasDispatchedLeads] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(workflowManager.getState());
  const apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  const updateFromManager = () => setWorkflowState(workflowManager.getState());

  useEffect(() => {
    const unsubscribe = workflowManager.subscribe((state) => {
      setWorkflowState(state);
      if (state.leads && state.leads.length) {
        setLeads(state.leads);
      }
    });
    return unsubscribe;
  }, []);

  const dispatchLeadsToWorkflow = (scrapedLeads: Lead[]) => {
    workflowManager.setState({
      leads: scrapedLeads,
      scrapingComplete: true,
      emailsDrafted: false,
      currentStage: 'stage-4',
    });
    setHasDispatchedLeads(true);
    updateFromManager();
  };

  const handleStartScraping = async () => {
    if (isScraperRunning) return;
    setIsScraperRunning(true);
    setScrapingProgress(5);

    const state = workflowManager.getState();
    const payload = {
      targetAudience: state.targetAudience,
      additionalContext: state.additionalContext,
      campaignId: state.currentCampaignId,
      limit: 8,
    };

    try {
      setScrapingProgress(25);
      const res = await fetch(`${apiBaseUrl}/scrape-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const details = await res.json().catch(() => ({}));
        throw new Error(details.error || 'Scraping failed');
      }

      setScrapingProgress(65);
      const body = await res.json().catch(() => ({} as any));
      const scraped: Lead[] = (body.leads || []).map((lead: any, idx: number) => ({
        id: lead.id || `scraped-${idx}`,
        name: lead.name || 'Lead',
        title: lead.title || 'Contact',
        company: lead.company || 'Unknown Co',
        email: lead.email || '',
        linkedin: lead.linkedin || '',
        emailSent: false,
        replied: false,
        followupCount: 0,
        summary: lead.summary || 'Scraped lead',
        talkingPoints: lead.talkingPoints || [],
      }));

      setLeads(scraped);
      dispatchLeadsToWorkflow(scraped);
      setScrapingProgress(100);
    } catch (err) {
      console.error('Scrape failed', err);
      setScrapingProgress(0);
    } finally {
      setIsScraperRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">The Fuel</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Scrape and enrich leads matching your ICP
        </p>
      </div>

      <Card className="p-6 border-border bg-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Scraping Live Log</h3>
            <p className="text-sm text-muted-foreground">Monitor real-time lead discovery</p>
          </div>
          <Button
            onClick={handleStartScraping}
            disabled={isScraperRunning}
            className="gap-2"
          >
            {isScraperRunning ? (
              <>
                <Square className="w-4 h-4" />
                Scraping...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Scraping
              </>
            )}
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Discovery Progress</span>
              <span className="text-sm font-medium text-primary">{Math.round(scrapingProgress)}%</span>
            </div>
            <Progress value={scrapingProgress} className="h-2" />
          </div>

          <div className="bg-secondary/50 border border-border rounded-lg p-4 font-mono text-xs text-muted-foreground max-h-40 overflow-y-auto space-y-1">
            <div>{'>'} Initializing scraper...</div>
            <div>{'>'} Connecting to data sources...</div>
            <div>{'>'} Querying: {workflowState?.targetAudience || 'your ICP'}</div>
            <div>{'>'} Enriching company data...</div>
            <div>{'>'} Fetching contact information...</div>
            {isScraperRunning && <div className="animate-pulse">{'>'} Processing leads...</div>}
            {!isScraperRunning && hasDispatchedLeads && <div className="text-primary">{'>'} Leads pushed to email stage</div>}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Leads</p>
            <p className="text-2xl font-bold text-primary mt-1">{leads.length}</p>
          </div>
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Enriched</p>
            <p className="text-2xl font-bold text-accent mt-1">{leads.filter((l) => l.email).length}</p>
          </div>
          <div className="bg-secondary border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-foreground mt-1">{Math.max(0, Math.round(leads.length * 0.2))}</p>
          </div>
        </div>
      </Card>

      <Card className="border-border bg-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Leads Table</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-foreground">Name</TableHead>
                <TableHead className="text-foreground">Title</TableHead>
                <TableHead className="text-foreground">Company</TableHead>
                <TableHead className="text-foreground">Email</TableHead>
                <TableHead className="text-foreground">LinkedIn</TableHead>
                <TableHead className="text-foreground">Enrichment Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={6} className="text-center text-muted-foreground text-sm">
                    No leads yet. Start scraping to populate this table.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{lead.name}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.title}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.company}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{lead.email}</TableCell>
                    <TableCell>
                      <a
                        href={lead.linkedin ? `https://${lead.linkedin}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        Profile
                      </a>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${lead.email ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {lead.email ? 'Enriched' : 'Pending'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
