'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sidebar } from '@/components/sidebar';
import StageOne from '@/components/stages/stage-one';
import StageTwo from '@/components/stages/stage-two';
import StageThree from '@/components/stages/stage-three';
import StageFour from '@/components/stages/stage-four';
import StageFive from '@/components/stages/stage-five';
import DashboardView from '@/components/dashboard-view';
import HistoryView from '@/components/history-view';
import { Header } from '@/components/header';
import { ToastContainer } from '@/components/toast-notification';
import { workflowManager, type WorkflowState } from '@/lib/workflow-context';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('stage-1');
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);

  useEffect(() => {
    const unsubscribe = workflowManager.subscribe((state) => {
      setWorkflowState(state);
      setActiveTab(state.currentStage);
    });

    return unsubscribe;
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {activeTab === 'dashboard' ? (
              <DashboardView />
            ) : activeTab === 'history' ? (
              <HistoryView />
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="stage-1">The Spark</TabsTrigger>
                  <TabsTrigger value="stage-2">The Brain</TabsTrigger>
                  <TabsTrigger value="stage-3">The Fuel</TabsTrigger>
                  <TabsTrigger value="stage-4">The Spear</TabsTrigger>
                  <TabsTrigger value="stage-5">The Closing</TabsTrigger>
                </TabsList>

                <TabsContent value="stage-1">
                  <StageOne />
                </TabsContent>
                <TabsContent value="stage-2">
                  <StageTwo />
                </TabsContent>
                <TabsContent value="stage-3">
                  <StageThree />
                </TabsContent>
                <TabsContent value="stage-4">
                  <StageFour />
                </TabsContent>
                <TabsContent value="stage-5">
                  <StageFive />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
