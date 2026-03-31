export interface UserProfile {
  industry: string; // ← 追加
  companyDescription: string;
  location: string;
  employeeCount: string;
  goals: string;
  challenges: string;
}

export enum AppStep {
  TERMS_AGREEMENT = 'TERMS_AGREEMENT',
  PROFILE_INPUT = 'PROFILE_INPUT',
  SUBSIDY_SELECTION = 'SUBSIDY_SELECTION',
  PLAN_DRAFTING = 'PLAN_DRAFTING',
  CHECKLIST = 'CHECKLIST',
}

export interface SubsidyProposal {
  rawMarkdown: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GeminiResponse {
  text: string;
  groundingChunks?: GroundingChunk[];
}
