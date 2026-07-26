import type { ChainId, Finding, LensName, Verdict } from '../src/types.js';

export interface AnalysisRequest {
  contractAddress: string;
  chainId: ChainId;
  supplyDataRaw?: string;
  supplyImageBase64?: string;
}

export interface LensOutput {
  lens: LensName;
  score: number | null;
  findings: Finding[];
  summary: string;
  error?: string;
}

export interface ReasoningOutput {
  verdict: Verdict;
  headlineReason: string;
  recommendation: 'Do not trade' | 'Trade with caution' | 'Clear to trade';
  audioScript: string;
  audioDurationSeconds: number;
}

export interface JobEvent {
  event: string;
  data?: unknown;
}

export interface AnalysisJob {
  id: string;
  request: AnalysisRequest;
  events: JobEvent[];
  listeners: Set<(event: JobEvent) => void>;
  done: boolean;
}
