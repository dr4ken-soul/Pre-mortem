import type { AnalysisState, LensCompleteEvent, VerdictResult } from '../types';

interface StartResponse { analysisId: string }

export async function createAnalysis(state: Pick<AnalysisState, 'contractAddress' | 'chainId' | 'supplyDataRaw' | 'supplyImageBase64'>) {
  const response = await fetch('/api/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contractAddress: state.contractAddress,
      chainId: state.chainId,
      supplyDataRaw: state.supplyDataRaw || undefined,
      supplyImageBase64: state.supplyImageBase64 || undefined,
    }),
  });
  const payload = await response.json() as StartResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'The analysis could not be started.');
  return payload.analysisId;
}

export function streamAnalysis(
  analysisId: string,
  handlers: {
    lens: (event: LensCompleteEvent) => void;
    verdict: (event: VerdictResult) => void;
    asset: (kind: 'audio' | 'card', url: string) => void;
    done: () => void;
    error: (message: string) => void;
  },
) {
  const source = new EventSource(`/api/analyse/${analysisId}/stream`);
  source.addEventListener('lens_complete', (event) => handlers.lens(JSON.parse((event as MessageEvent).data)));
  source.addEventListener('verdict', (event) => handlers.verdict(JSON.parse((event as MessageEvent).data)));
  source.addEventListener('audio_ready', (event) => handlers.asset('audio', JSON.parse((event as MessageEvent).data).url));
  source.addEventListener('card_ready', (event) => handlers.asset('card', JSON.parse((event as MessageEvent).data).url));
  source.addEventListener('done', () => { source.close(); handlers.done(); });
  source.onerror = () => {
    if (source.readyState === EventSource.CLOSED) handlers.error('The analysis stream closed before the verdict arrived.');
  };
  return () => source.close();
}
