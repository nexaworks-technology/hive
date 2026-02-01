'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Target, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { workflowManager, type WorkflowState } from '@/lib/workflow-context';
import { toastManager } from '@/components/toast-notification';

export default function StageTwo() {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const unsubscribe = workflowManager.subscribe(setWorkflowState);
    return unsubscribe;
  }, []);

  const handleConfirmICP = () => {
    setIsConfirming(true);

    // Show notification
    toastManager.notify({
      title: 'Scraping Starting',
      message: 'Discovering leads matching your ICP. You will be notified when complete.',
      type: 'loading',
      duration: 0,
    });

    // Simulate scraping (5 seconds)
    setTimeout(() => {
      // Generate mock leads
      const mockLeads = [
        {
          id: '1',
          name: 'Sarah Johnson',
          title: 'Lead Generation Manager',
          company: 'Phoenix Digital',
          email: 'pavanfg1@gmail.com',
          linkedin: 'linkedin.com/in/sarahjohnson',
          emailSent: false,
          replied: false,
          followupCount: 0 as const,
          summary: 'Runs lead gen at a boutique agency; recently shared concerns about lead quality consistency.',
          talkingPoints: [
            'Reference her LinkedIn post on lead quality',
            'Offer ideas on validation and scoring',
            'Keep tone consultative, not salesy',
          ],
        },
        {
          id: '2',
          name: 'Michael Chen',
          title: 'Operations Director',
          company: 'Growth Catalyst Ltd',
          email: 'pavanbabar319@gmail.com',
          linkedin: 'linkedin.com/in/michaelchen',
          emailSent: false,
          replied: false,
          followupCount: 0 as const,
          summary: 'Ops lead focused on throughput; looking for predictable pipeline health.',
          talkingPoints: [
            'Mention ops throughput and predictable pipeline',
            'Offer one concrete process tweak',
            'Invite him to review a short system map',
          ],
        },
        {
          id: '3',
          name: 'Emma Williams',
          title: 'Head of Sales',
          company: 'Outreach Pro',
          email: 'testppb013@gmail.com',
          linkedin: 'linkedin.com/in/emmawilliams',
          emailSent: false,
          replied: false,
          followupCount: 0 as const,
          summary: 'Sales leader aiming to lift reply rates without ballooning manual work.',
          talkingPoints: [
            'Show how to improve replies without extra headcount',
            'Point to a similar sales org win',
            'Offer a ready-to-use opener',
          ],
        },
        {
          id: '4',
          name: 'James Rodriguez',
          title: 'Business Development',
          company: 'London Lead Systems',
          email: 'pavan@nexaworks.tech',
          linkedin: 'linkedin.com/in/jamesrodriguez',
          emailSent: false,
          replied: false,
          followupCount: 0 as const,
          summary: 'BD rep juggling volume; wants outreach that feels personal but is fast.',
          talkingPoints: [
            'Lean on speed + personalization balance',
            'Share a template he can reuse',
            'Offer a quick test on 10 contacts',
          ],
        },
        {
          id: '5',
          name: 'Lisa Park',
          title: 'Sales Director',
          company: 'DataDrive Solutions',
          email: 'sahil@nexaworks.tech',
          linkedin: 'linkedin.com/in/lisapark',
          emailSent: false,
          replied: false,
          followupCount: 0 as const,
          summary: 'Data-minded director; cares about attributable pipeline.',
          talkingPoints: [
            'Emphasize measurable pipeline contribution',
            'Reference data cleanliness for attribution',
            'Suggest a small AB test',
          ],
        },
        {
          id: '6',
          name: 'David Turner',
          title: 'VP Growth',
          company: 'Scale Intelligence',
          email: 'pavanfg1@gmail.com',
          linkedin: 'linkedin.com/in/davidturner',
          emailSent: false,
          replied: false,
          followupCount: 0 as const,
          summary: 'Growth lead focused on repeatable plays; open to experiments that de-risk.',
          talkingPoints: [
            'Highlight repeatability and experiment design',
            'Offer a low-risk pilot',
            'Share a benchmark result',
          ],
        },
      ];

      // Update workflow with leads
      workflowManager.setState({
        scrapingComplete: true,
        leads: mockLeads,
        currentStage: 'stage-3',
      });

      setIsConfirming(false);

      // Show success notification
      toastManager.notify({
        title: 'Scraping Complete!',
        message: 'Found 6 high-quality leads. Drafting emails next...',
        type: 'success',
      });

      // Simulate email drafting in background (4 seconds)
      setTimeout(() => {
        workflowManager.setState({
          emailsDrafted: true,
          leads: mockLeads,
          currentStage: 'stage-4',
        });

        // Show drafts ready notification
        toastManager.notify({
          title: 'Drafts Ready',
          message: 'Review drafts in The Spear. Sending is disabled until email is integrated.',
          type: 'info',
        });
      }, 4000);
    }, 5000);
  };

  if (!workflowState?.icpGenerated) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">The Brain</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Ideal Customer Profile & Market Intelligence
          </p>
        </div>

        <Card className="p-8 border-border bg-secondary text-center">
          <p className="text-muted-foreground mb-4">Complete Stage 1 to generate your ICP</p>
        </Card>
      </div>
    );
  }

  const icp = workflowState.icpData;

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">The Brain</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Ideal Customer Profile & Market Intelligence
        </p>
      </div>

      <Card className="p-6 border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">ICP Traits</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {icp?.traits.map((trait, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">{trait}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 border-border bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          Market Intelligence
        </h3>
        <div className="space-y-3">
          {icp?.marketInsights.map((insight, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-accent/5 border border-accent/20 rounded-lg">
              <Zap className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">{insight}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 border-border bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Competitive Analysis</h3>
        <div className="space-y-3">
          {icp?.competitiveAnalysis.map((analysis, idx) => (
            <div key={idx} className="text-sm text-foreground pl-4 border-l-2 border-primary">
              {analysis}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 border-border bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Pain Points to Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {icp?.painPoints.map((pain, idx) => (
            <div key={idx} className="text-sm text-foreground p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              • {pain}
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handleConfirmICP}
          disabled={isConfirming}
          className="flex-1 h-12 gap-2 text-base"
        >
          {isConfirming ? 'Starting Scraping...' : 'Confirm & Start Scraping'}
          {!isConfirming && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
