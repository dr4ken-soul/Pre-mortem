import Anthropic from '@anthropic-ai/sdk';
import type { AnalysisRequest, LensOutput, ReasoningOutput } from './types.js';

function fitAudioWords(text: string) {
  const words = text.replaceAll(' - ', ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 60) return words.slice(0, 60).join(' ');
  const additions = [
    'Review each finding before committing capital.',
    'Size the position for the risks that remain.',
    'This is a screening result, not a guarantee.',
  ];
  for (const addition of additions) {
    const additionWords = addition.split(/\s+/);
    if (words.length + additionWords.length <= 60) words.push(...additionWords);
  }
  return words.join(' ');
}

function withAudioDuration(output: Omit<ReasoningOutput, 'audioDurationSeconds'>): ReasoningOutput {
  const wordCount = output.audioScript.trim().split(/\s+/).filter(Boolean).length;
  return { ...output, audioDurationSeconds: Math.max(1, Math.round((wordCount / 145) * 60)) };
}

function shortReason(text: string) {
  const words = text.replace(/[.!?]+/g, '').split(/\s+/).filter(Boolean);
  return words.length > 11 ? `${words.slice(0, 11).join(' ')}...` : words.join(' ');
}

function enforceEvidenceWarning(output: Omit<ReasoningOutput, 'audioDurationSeconds'>, lenses: LensOutput[]) {
  const incomplete = lenses.some((lens) => lens.score === null || /not checked|unavailable|needs a holder indexer|unknown/i.test(lens.summary));
  if (!incomplete || output.verdict === 'High Risk') return output;
  return {
    ...output,
    verdict: 'Caution' as const,
    recommendation: 'Trade with caution' as const,
    headlineReason: 'Evidence is incomplete; some scan data was unavailable',
    audioScript: fitAudioWords(`Premortem has completed the scan for ${output.headlineReason}. The verdict is Caution because some evidence was unavailable. Review the contract, market, and supply findings before committing capital. Trade with caution. This is a screening result, not a guarantee.`),
  };
}

function fallbackReasoning(request: AnalysisRequest, lenses: LensOutput[]): ReasoningOutput {
  const scores = lenses.filter((lens) => lens.score !== null).map((lens) => lens.score ?? 0);
  const highest = Math.max(...scores, 0);
  const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  const verdict = highest >= 70 || average >= 62 ? 'High Risk' : highest >= 42 || average >= 34 ? 'Caution' : 'Clear';
  const recommendation = verdict === 'High Risk' ? 'Do not trade' : verdict === 'Caution' ? 'Trade with caution' : 'Clear to trade';
  const primary = lenses.find((lens) => lens.score === highest) ?? lenses[0];
  const headlineReason = shortReason(primary?.summary.split('. ')[0] || 'Multiple risk signals require review');
  return withAudioDuration(enforceEvidenceWarning({ verdict, headlineReason, recommendation, audioScript: fitAudioWords(`Premortem has completed the scan for ${request.contractAddress.slice(0, 10)}. The verdict is ${verdict}. ${headlineReason}. Contract, market, and supply evidence should be read together. ${recommendation}.` ) }, lenses));
}

function parseModelJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('The reasoning response was not valid JSON.');
  return JSON.parse(match[0]) as ReasoningOutput;
}

export async function reason(request: AnalysisRequest, lenses: LensOutput[]): Promise<ReasoningOutput> {
  if (!process.env.ANTHROPIC_API_KEY) return fallbackReasoning(request, lenses);
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      system: 'Act as a clinical token risk analyst. Return JSON only. Use British English. Never use em dashes. The audioScript must contain exactly 60 words and remain calm and clinical.',
      messages: [{ role: 'user', content: `Analyse ${request.contractAddress} on ${request.chainId}. Lens data: ${JSON.stringify(lenses)}. Return verdict as High Risk, Caution, or Clear; recommendation as Do not trade, Trade with caution, or Clear to trade; headlineReason under 12 words; audioScript exactly 60 words.` }],
    });
    const block = response.content.find((item) => item.type === 'text');
    if (!block || block.type !== 'text') throw new Error('No reasoning text returned.');
    const parsed = parseModelJson(block.text);
    return withAudioDuration(enforceEvidenceWarning({ ...parsed, audioScript: fitAudioWords(parsed.audioScript) }, lenses));
  } catch {
    return fallbackReasoning(request, lenses);
  }
}
