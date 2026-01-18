export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  contractsAnalyzed: number;
  maxContracts: number;
  createdAt: string;
  avatar?: string;
  lastAnalysis?: string | null;
  subscriptionStatus?: 'active' | 'expired' | 'trial';
  isTester?: boolean; // Allow unlimited uploads for tester accounts
}

export interface ContractField {
  name: string;
  status: 'Filled' | 'Missing/Needs Input';
  value?: string;
  description?: string;
  confidence?: number; // Confidence score between 0 and 1
  type?: string; // Type of the field (e.g., 'text', 'date', 'number')
  required?: boolean; // Whether the field is required
}

export interface ContractSummary {
  points: string[];
  contractType?: string;
  missingOrAmbiguousTerms?: string[];
}

export interface AnalysisResult {
  id: string;
  summary: ContractSummary;
  fields: ContractField[];
  documentType: 'Contract' | 'Document' | string;
  analysisDate: string;
  fileName: string;
  fileSize: string | number;
  riskLevel: 'Low' | 'Medium' | 'High';
  completionScore: number;
  // Additional fields from Gemini response
  contractType?: string;
  parties?: string[];
  keyTerms?: string[];
  importantDates?: Record<string, string>;
  paymentTerms?: string;
  terminationClauses?: string[];
  concerningPoints?: string[];
  overallSummary?: string;
}

export interface UploadedFile extends File {
  content?: string;
  // lastModified is already defined in File interface with type number
}

export interface UserPlan {
  id: string;
  name: string;
  maxContracts: number;
  contractLimitReset: string; // ISO timestamp
  remainingAnalyses: number;
  subscriptionStatus: 'active' | 'expired' | 'trial';
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}