export interface Meeting {
  id: string;
  leadId: string;
  date: string;
  time: string;
  meetingType: 'Google Meet' | 'Zoom' | 'Phone Call';
  meetingLink?: string;
}

export interface Lead {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  linkedin: string;
  emailSent: boolean;
  replied: boolean;
  followupCount: 0 | 1 | 2 | 3;
  followupEmails?: string[];
  personalizationDetails?: string;
  summary?: string;
  talkingPoints?: string[];
  draftEmail?: {
    subject: string;
    body: string;
    readyToSend?: boolean;
  };
  replySentiment?: 'Positive' | 'Negative';
  replyText?: string;
  sentiment?: 'Very Interested' | 'Interested' | 'Maybe' | 'Not Interested';
  meeting?: Meeting;
}

export interface Campaign {
  id: string;
  targetAudience: string;
  additionalContext: string;
  icpData?: {
    traits: string[];
    marketInsights: string[];
    competitiveAnalysis: string[];
    painPoints: string[];
  };
  leads: Lead[];
  createdAt: string;
  leadsScraped: number;
  emailsSent: number;
  repliesReceived: number;
  meetingsScheduled: number;
}

export interface SentEmailRecord {
  id: string;
  leadId: string;
  name: string;
  company: string;
  email: string;
  subject?: string;
  sentAt: string;
}

export interface WorkflowState {
  // Current Campaign
  targetAudience: string;
  additionalContext: string;

  // Stage 2: ICP
  icpGenerated: boolean;
  icpLoading: boolean;
  icpError?: string;
  icpData?: {
    traits: string[];
    marketInsights: string[];
    competitiveAnalysis: string[];
    painPoints: string[];
  };

  // Stage 3: Scraping
  scrapingComplete: boolean;
  leads: Lead[];

  // Stage 4 & 5: Email & Followup
  emailsDrafted: boolean;
  currentStage: 'dashboard' | 'stage-1' | 'stage-2' | 'stage-3' | 'stage-4' | 'stage-5' | 'history';

  // Activity
  sentEmails: SentEmailRecord[];

  // History
  campaignHistory: Campaign[];
}

export const initialWorkflowState: WorkflowState = {
  targetAudience: '',
  additionalContext: '',
  icpGenerated: false,
  icpLoading: false,
  scrapingComplete: false,
  leads: [],
  emailsDrafted: false,
  currentStage: 'dashboard',
  sentEmails: [],
  campaignHistory: [],
};

let workflowState = { ...initialWorkflowState };
let listeners: ((state: WorkflowState) => void)[] = [];

export const workflowManager = {
  getState() {
    return workflowState;
  },

  setState(updater: Partial<WorkflowState>) {
    workflowState = { ...workflowState, ...updater };
    this.notify();
  },

  subscribe(listener: (state: WorkflowState) => void) {
    listeners.push(listener);
    listener(workflowState);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  notify() {
    listeners.forEach((listener) => listener(workflowState));
  },

  reset() {
    workflowState = { ...initialWorkflowState };
    this.notify();
  },
};
