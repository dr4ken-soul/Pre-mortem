import { create } from 'zustand';
import type { AnalysisState, ChainId, Finding, LensCompleteEvent, LensName, VerdictResult } from './types';

const emptyLens = () => ({ score: null, findings: [], summary: '', status: 'idle' as const });

interface AnalysisActions {
  setAddress: (contractAddress: string) => void;
  setChain: (chainId: ChainId) => void;
  setSupplyData: (supplyDataRaw: string, supplyImageBase64?: string | null) => void;
  begin: (analysisId: string) => void;
  completeLens: (event: LensCompleteEvent) => void;
  setVerdict: (verdict: VerdictResult) => void;
  setAsset: (kind: 'audio' | 'card', url: string) => void;
  finish: () => void;
  fail: (message: string) => void;
  newScan: () => void;
  reset: () => void;
}

const initialState: AnalysisState = {
  systemStatus: 'idle',
  analysisId: null,
  contractAddress: '',
  chainId: 'xlayer',
  supplyDataRaw: '',
  supplyImageBase64: null,
  lenses: { contract: emptyLens(), market: emptyLens(), supply: emptyLens() },
  verdict: null,
  error: null,
};

export const useAnalysisStore = create<AnalysisState & AnalysisActions>((set) => ({
  ...initialState,
  setAddress: (contractAddress) => set({ contractAddress, error: null }),
  setChain: (chainId) => set({ chainId }),
  setSupplyData: (supplyDataRaw, supplyImageBase64 = null) => set({ supplyDataRaw, supplyImageBase64 }),
  begin: (analysisId) => set((state) => ({
    analysisId,
    systemStatus: 'scanning',
    error: null,
    verdict: null,
    lenses: {
      contract: { ...state.lenses.contract, status: 'scanning', score: null, findings: [], summary: '' },
      market: { ...state.lenses.market, status: 'scanning', score: null, findings: [], summary: '' },
      supply: { ...state.lenses.supply, status: 'scanning', score: null, findings: [], summary: '' },
    },
  })),
  completeLens: (event) => set((state) => ({
    lenses: {
      ...state.lenses,
      [event.lens]: {
        score: event.score,
        findings: event.findings,
        summary: event.summary,
        status: event.score === null ? 'prompt' : 'complete',
        error: event.error,
      },
    },
  })),
  setVerdict: (verdict) => set({ verdict }),
  setAsset: (kind, url) => set((state) => ({
    verdict: state.verdict ? { ...state.verdict, [kind === 'audio' ? 'audioUrl' : 'shareCardUrl']: url } : null,
  })),
  finish: () => set({ systemStatus: 'complete' }),
  fail: (message) => set({ error: message, systemStatus: 'idle' }),
  newScan: () => set((state) => ({
    systemStatus: 'idle',
    analysisId: null,
    error: null,
    verdict: null,
    lenses: { contract: emptyLens(), market: emptyLens(), supply: emptyLens() },
    contractAddress: state.contractAddress,
    chainId: state.chainId,
    supplyDataRaw: state.supplyDataRaw,
    supplyImageBase64: state.supplyImageBase64,
  })),
  reset: () => set({ ...initialState, lenses: { contract: emptyLens(), market: emptyLens(), supply: emptyLens() } }),
}));

export const useLens = (name: LensName) => useAnalysisStore((state) => state.lenses[name]);
export type { Finding };
