'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Brain, TrendingUp, Target, Zap, ArrowRight, CheckCircle2, RefreshCcw, AlertCircle } from 'lucide-react';
import { workflowManager, type WorkflowState } from '@/lib/workflow-context';
import { toastManager } from '@/components/toast-notification';

export default function StageTwo() {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    const unsubscribe = workflowManager.subscribe(setWorkflowState);
    return unsubscribe;
  }, []);

  const handleConfirmICP = () => {
    if (!workflowState?.icpData || workflowState.icpLoading) {
      toastManager.notify({
        title: 'ICP not ready',
        message: 'Generate or finish loading the ICP before scraping.',
        type: 'warning',
      });
      return;
    }

    setIsConfirming(true);

    // Push workflow forward without mock data; Stage 3 handles real scraping
    workflowManager.setState({
      scrapingComplete: false,
      emailsDrafted: false,
      leads: [],
      currentStage: 'stage-3',
    });

    toastManager.notify({
      title: 'Ready to scrape',
      message: 'Jumping to The Fuel to run the real scraper.',
      type: 'info',
    });

    setIsConfirming(false);
  };

  const icp = workflowState?.icpData;
  const isLoading = workflowState?.icpLoading;
  const icpError = workflowState?.icpError;

  const HeaderSection = (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <Brain className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">The Brain</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Ideal Customer Profile & Market Intelligence
      </p>
    </div>
  );

  const regenerateICP = async () => {
    if (!workflowState?.targetAudience?.trim()) {
      toastManager.notify({
        title: 'Target audience missing',
        message: 'Go back to The Spark and enter your targeting details.',
        type: 'warning',
      });
      return;
    }

    setIsRegenerating(true);
    workflowManager.setState({ icpLoading: true, icpError: undefined, icpGenerated: false });

    const loadingToastId = toastManager.notify({
      title: 'Regenerating ICP',
      message: 'Requesting fresh ICP and market intel...',
      type: 'loading',
      duration: 0,
    });

    try {
      const response = await fetch('/api/generate-icp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAudience: workflowState.targetAudience,
          additionalContext: workflowState.additionalContext,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = payload?.error || payload?.details || 'Failed to regenerate ICP';
        throw new Error(errorMessage);
      }

      const icpData = payload.icp || payload;
      workflowManager.setState({
        icpGenerated: true,
        icpData,
        icpLoading: false,
        icpError: undefined,
        currentStage: 'stage-2',
      });

      toastManager.notify({
        title: 'ICP refreshed',
        message: 'Review the updated insights and confirm to proceed.',
        type: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to regenerate ICP';
      workflowManager.setState({ icpLoading: false, icpGenerated: false, icpError: message });

      toastManager.notify({
        title: 'ICP Generation Failed',
        message,
        type: 'error',
      });
    } finally {
      if (loadingToastId) {
        toastManager.remove(loadingToastId);
      }
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {HeaderSection}

      {isLoading && (
        <Card className="p-6 border-border bg-secondary">
          <div className="flex items-start gap-3">
            <Spinner className="w-5 h-5 text-primary" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Generating ICP...</p>
              <p className="text-sm text-muted-foreground">
                Using your Stage 1 inputs to craft traits and market intelligence.
              </p>
            </div>
          </div>
        </Card>
      )}

      {!isLoading && icpError && (
        <Card className="p-6 border-border bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div className="space-y-2">
              <p className="font-semibold text-foreground">ICP generation failed</p>
              <p className="text-sm text-muted-foreground">{icpError}</p>
              <div className="flex gap-3">
                <Button onClick={regenerateICP} disabled={isRegenerating} className="gap-2">
                  {isRegenerating ? 'Regenerating...' : 'Retry with same inputs'}
                  {!isRegenerating && <RefreshCcw className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!isLoading && !icpError && !workflowState?.icpGenerated && (
        <Card className="p-8 border-border bg-secondary text-center">
          <p className="text-muted-foreground mb-4">Complete Stage 1 to generate your ICP</p>
        </Card>
      )}

      {workflowState?.icpGenerated && !isLoading && !icpError && (
        <>
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
              variant="outline"
              onClick={regenerateICP}
              disabled={isRegenerating || isConfirming}
              className="flex-1 h-12 gap-2 text-base"
            >
              {isRegenerating ? 'Regenerating ICP...' : 'Regenerate ICP'}
              {!isRegenerating && <RefreshCcw className="w-4 h-4" />}
            </Button>
            <Button
              onClick={handleConfirmICP}
              disabled={isConfirming || isRegenerating}
              className="flex-1 h-12 gap-2 text-base"
            >
              {isConfirming ? 'Starting Scraping...' : 'Confirm & Start Scraping'}
              {!isConfirming && <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
