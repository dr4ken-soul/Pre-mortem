export type ChainId = 'xlayer' | 'base';
export type SystemStatus = 'idle' | 'scanning' | 'complete';
export type LensName = 'contract' | 'market' | 'supply';
export type LensStatus = 'idle' | 'scanning' | 'complete' | 'prompt' | 'error';
export type Verdict = 'High Risk' | 'Caution' | 'Clear';

export interface Finding {
  key: string;
  value: string;
  riskWeight?: number;
}

export interface LensResult {
  score: number | null;
  findings: Finding[];
  summary: string;
  status: LensStatus;
  error?: string;
}

export interface VerdictResult {
  verdict: Verdict;
  headlineReason: string;
  recommendation: 'Do not trade' | 'Trade with caution' | 'Clear to trade';
  audioScript: string;
  audioDurationSeconds: number;
  audioUrl: string | null;
  shareCardUrl: string | null;
}

export interface AnalysisState {
  systemStatus: SystemStatus;
  analysisId: string | null;
  contractAddress: string;
  chainId: ChainId;
  supplyDataRaw: string;
  supplyImageBase64: string | null;
  lenses: Record<LensName, LensResult>;
  verdict: VerdictResult | null;
  error: string | null;
}

export interface LensCompleteEvent {
  lens: LensName;
  score: number | null;
  findings: Finding[];
  summary: string;
  error?: string;
}
