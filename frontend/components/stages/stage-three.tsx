'use client';

import { useState } from 'react';
import { workflowManager, type Lead } from '@/lib/workflow-context';
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

interface ScrapedLead {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  linkedin: string;
  enrichmentStatus: string;
}

const mockLeads: ScrapedLead[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    title: 'Lead Generation Manager',
    company: 'Phoenix Digital',
    email: 'pavanfg1@gmail.com',
    linkedin: 'linkedin.com/in/sarahjohnson',
    enrichmentStatus: 'Complete',
  },
  {
    id: '2',
    name: 'Michael Chen',
    title: 'Operations Director',
    company: 'Growth Catalyst Ltd',
    email: 'pavanbabar319@gmail.com',
    linkedin: 'linkedin.com/in/michaelchen',
    enrichmentStatus: 'In Progress',
  },
  {
    id: '3',
    name: 'Emma Williams',
    title: 'Head of Sales',
    company: 'Outreach Pro',
    email: 'testppb013@gmail.com',
    linkedin: 'linkedin.com/in/emmawilliams',
    enrichmentStatus: 'Complete',
  },
  {
    id: '4',
    name: 'James Rodriguez',
    title: 'Business Development',
    company: 'London Lead Systems',
    email: 'pavan@nexaworks.tech',
    linkedin: 'linkedin.com/in/jamesrodriguez',
    enrichmentStatus: 'Pending',
  },
  {
    id: '5',
    name: 'Lisa Park',
    title: 'Sales Director',
    company: 'DataDrive Solutions',
    email: 'sahil@nexaworks.tech',
    linkedin: 'linkedin.com/in/lisapark',
    enrichmentStatus: 'Complete',
  },
  {
    id: '6',
    name: 'David Turner',
    title: 'VP Growth',
    company: 'Scale Intelligence',
    email: 'pavanfg1@gmail.com',
    linkedin: 'linkedin.com/in/davidturner',
    enrichmentStatus: 'In Progress',
  },
];

const scrapedSummaries: Record<string, string> = {
  '1': 'Lead gen manager concerned about lead quality consistency.',
  '2': 'Ops director aiming for predictable pipeline throughput.',
  '3': 'Sales lead wants better reply rates without extra manual work.',
  '4': 'BD rep balancing volume and personalization speed.',
  '5': 'Data-minded sales director focused on attributable pipeline.',
  '6': 'Growth VP looking for repeatable, de-risked experiments.',
};

export default function StageThree() {
  const [isScraperRunning, setIsScraperRunning] = useState(false);
  const [scrapingProgress, setScrapingProgress] = useState(45);
  const [hasDispatchedLeads, setHasDispatchedLeads] = useState(false);

  const dispatchLeadsToWorkflow = () => {
    if (hasDispatchedLeads) return;

    const enriched: Lead[] = mockLeads.map((lead, index) => ({
      id: lead.id,
      name: lead.name,
      title: lead.title,
      company: lead.company,
      email: lead.email,
      linkedin: lead.linkedin,
      emailSent: false,
      replied: false,
      followupCount: 0,
      summary: scrapedSummaries[lead.id] || 'Summary pending.',
      talkingPoints: [],
    }));

    workflowManager.setState({
      leads: enriched,
      scrapingComplete: true,
      emailsDrafted: false,
      currentStage: 'stage-4',
    });
    setHasDispatchedLeads(true);
  };

  const handleStartScraping = () => {
    setIsScraperRunning(true);
    // Simulate scraping progress
    const interval = setInterval(() => {
      setScrapingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScraperRunning(false);
          dispatchLeadsToWorkflow();
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 1000);
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
            <div>{'>'} Querying: B2B Lead Gen agencies</div>
            <div>{'>'} Found 4 matches in London region</div>
            <div>{'>'} Enriching company data...</div>
            <div>{'>'} Fetching contact information...</div>
            {isScraperRunning && (
              <div className="animate-pulse">{'>'} Processing leads...</div>
            )}
            {!isScraperRunning && hasDispatchedLeads && (
              <div className="text-primary">{'>'} Leads pushed to email stage</div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Leads</p>
            <p className="text-2xl font-bold text-primary mt-1">127</p>
          </div>
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Enriched</p>
            <p className="text-2xl font-bold text-accent mt-1">94</p>
          </div>
          <div className="bg-secondary border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-foreground mt-1">33</p>
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
              {mockLeads.map((lead) => (
                <TableRow key={lead.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{lead.name}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.title}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.company}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{lead.email}</TableCell>
                  <TableCell>
                    <a
                      href={`https://${lead.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      Profile
                    </a>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        lead.enrichmentStatus === 'Complete'
                          ? 'bg-primary/10 text-primary'
                          : lead.enrichmentStatus === 'In Progress'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {lead.enrichmentStatus}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
