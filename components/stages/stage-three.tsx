'use client';

import { useState } from 'react';
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

interface Lead {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  linkedin: string;
  enrichmentStatus: string;
}

const mockLeads: Lead[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    title: 'Lead Generation Manager',
    company: 'Phoenix Digital',
    email: 'sarah@phoenixdigital.com',
    linkedin: 'linkedin.com/in/sarahjohnson',
    enrichmentStatus: 'Complete',
  },
  {
    id: '2',
    name: 'Michael Chen',
    title: 'Operations Director',
    company: 'Growth Catalyst Ltd',
    email: 'mchen@growthcatalyst.co.uk',
    linkedin: 'linkedin.com/in/michaelchen',
    enrichmentStatus: 'In Progress',
  },
  {
    id: '3',
    name: 'Emma Williams',
    title: 'Head of Sales',
    company: 'Outreach Pro',
    email: 'emma@outreachpro.io',
    linkedin: 'linkedin.com/in/emmawilliams',
    enrichmentStatus: 'Complete',
  },
  {
    id: '4',
    name: 'James Rodriguez',
    title: 'Business Development',
    company: 'London Lead Systems',
    email: 'james@londonleads.com',
    linkedin: 'linkedin.com/in/jamesrodriguez',
    enrichmentStatus: 'Pending',
  },
];

export default function StageThree() {
  const [isScraperRunning, setIsScraperRunning] = useState(false);
  const [scrapingProgress, setScrapingProgress] = useState(45);

  const handleStartScraping = () => {
    setIsScraperRunning(true);
    // Simulate scraping progress
    const interval = setInterval(() => {
      setScrapingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScraperRunning(false);
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
