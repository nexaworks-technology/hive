'use client';

import { Card } from '@/components/ui/card';

export function Header() {
  const revenueLeak = 45000; // Cost of missing leads per month

  return (
    <div className="border-b border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Converge AI</h1>
          <p className="text-sm text-muted-foreground mt-1">B2B Outreach Intelligence Platform</p>
        </div>
        <Card className="px-6 py-4 bg-destructive/5 border-destructive/20">
          <div className="text-sm font-medium text-muted-foreground">Revenue Leak</div>
          <div className="text-2xl font-bold text-destructive mt-1">
            ${(revenueLeak / 1000).toFixed(0)}k
          </div>
          <div className="text-xs text-muted-foreground mt-1">Est. monthly cost of missed leads</div>
        </Card>
      </div>
    </div>
  );
}
