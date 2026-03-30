export interface UserProfile {
  companyDescription: string;
  location: string;
  employeeCount: string;
  goals: string;
  challenges: string;
}

export enum AppStep {
  PROFILE_INPUT = 0,
  SUBSIDY_SELECTION = 1,
  PLAN_DRAFTING = 2,
  CHECKLIST = 3,
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