'use client';

import React from 'react';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, ArrowRight } from 'lucide-react';
import { workflowManager } from '@/lib/workflow-context';
import { toastManager } from '@/components/toast-notification';

export default function StageOne() {
  const [prompt, setPrompt] = useState('');
  const [details, setDetails] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Save input to workflow state
    workflowManager.setState({
      targetAudience: prompt,
      additionalContext: details,
    });

    // Show loading notification
    toastManager.notify({
      title: 'Analyzing Your Requirements',
      message: 'Generating ICP and market intelligence...',
      type: 'loading',
      duration: 0,
    });

    // Simulate ICP generation (3 seconds)
    setTimeout(() => {
      // Generate mock ICP
      const icpData = {
        traits: [
          'B2B SaaS Decision Makers',
          'Revenue Range: $2M-50M ARR',
          'Team Size: 50-500 employees',
          'Proven Lead Generation investment',
          'Growth-focused companies',
        ],
        marketInsights: [
          'Market size: $10B+ globally',
          'Average contract value: $50K-250K/year',
          'Decision cycle: 60-90 days',
          'Multiple stakeholders involved',
          'High buyer intent in Q1 & Q4',
        ],
        competitiveAnalysis: [
          'Top 3 competitors identified',
          'Our unique advantage: 3x faster implementation',
          'Market gap: Enterprise support',
          'Pricing competitive within 15%',
          'Superior integration ecosystem',
        ],
        painPoints: [
          'Low conversion rates (2-3%)',
          'Long sales cycles',
          'Lead quality inconsistency',
          'Manual outreach processes',
          'Limited follow-up automation',
        ],
      };

      // Update workflow with ICP
      workflowManager.setState({
        icpGenerated: true,
        icpData,
        currentStage: 'stage-2',
      });

      setIsProcessing(false);

      // Show success notification
      toastManager.notify({
        title: 'ICP Generated',
        message: 'Review and confirm to proceed with lead scraping',
        type: 'success',
      });
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">The Spark</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Define your target audience and outreach strategy
        </p>
      </div>

      <Card className="p-8 bg-card border-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="prompt" className="text-base font-semibold text-foreground">
              Target Audience
            </Label>
            <p className="text-xs text-muted-foreground">
              Describe who you want to reach with specific criteria
            </p>
            <Input
              id="prompt"
              placeholder="e.g., Find me B2B Lead Gen agencies in London with 10-50 employees"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="details" className="text-base font-semibold text-foreground">
              Additional Context
            </Label>
            <p className="text-xs text-muted-foreground">
              Include your unique selling points, tone of voice, or specific requirements
            </p>
            <Textarea
              id="details"
              placeholder="Share unique selling points, tone preferences, or any other relevant details..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-32 text-base resize-none"
            />
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">
              💡 <span className="font-medium">Tip:</span> The more specific you are about your target audience, the better the AI will identify and personalize your outreach.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!prompt.trim() || isProcessing}
              className="flex-1 h-12 gap-2 text-base"
            >
              {isProcessing ? 'Processing...' : 'Generate Campaign'}
              {!isProcessing && <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 bg-secondary border-border">
        <h3 className="font-semibold text-foreground mb-3">Quick Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <button
            onClick={() => setPrompt('Find me B2B SaaS companies in the US with 50-500 employees')}
            className="text-left p-3 rounded-lg bg-card hover:bg-accent/10 border border-border transition-colors text-sm"
          >
            <div className="font-medium text-foreground">SaaS B2B Outreach</div>
            <div className="text-xs text-muted-foreground">Target SaaS companies</div>
          </button>
          <button
            onClick={() => setPrompt('Find me digital marketing agencies with 5-20 employees in Europe')}
            className="text-left p-3 rounded-lg bg-card hover:bg-accent/10 border border-border transition-colors text-sm"
          >
            <div className="font-medium text-foreground">Agency Prospecting</div>
            <div className="text-xs text-muted-foreground">Digital marketing agencies</div>
          </button>
        </div>
      </Card>
    </div>
  );
}
