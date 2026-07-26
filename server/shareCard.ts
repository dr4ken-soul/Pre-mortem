import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createElement } from 'react';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { scoreColour, TOKENS } from './tokens.js';
import type { AnalysisRequest, LensOutput, ReasoningOutput } from './types.js';

interface CardData { request: AnalysisRequest; reasoning: ReasoningOutput; lenses: LensOutput[]; timestamp: Date }

function shortAddress(address: string) { return `${address.slice(0, 9)}...${address.slice(-6)}`; }
function lens(name: string, outputs: LensOutput[]) { return outputs.find((output) => output.lens === name); }
function compactSummary(summary: string) {
  const normalised = summary.replace(/\s+/g, ' ').trim();
  const sentences = normalised.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean);
  const selected: string[] = [];
  let length = 0;
  for (const sentence of sentences) {
    if (length + sentence.length > 180 && selected.length) break;
    selected.push(sentence.trim());
    length += sentence.length;
  }
  return selected.join(' ');
}
function fontPath(candidates: string[]) { return candidates.map((candidate) => path.resolve(process.cwd(), candidate)).find((candidate) => existsSync(candidate)); }

async function fontData(candidates: string[], fallback: string) {
  const selected = fontPath(candidates) ?? fallback;
  return readFile(selected);
}

function cardView({ request, reasoning, lenses, timestamp }: CardData) {
  const contract = lens('contract', lenses); const market = lens('market', lenses); const supply = lens('supply', lenses);
  const verdictColour = reasoning.verdict === 'High Risk' ? TOKENS.risk : reasoning.verdict === 'Caution' ? TOKENS.caution : TOKENS.clear;
  const row = (label: string, output: LensOutput | undefined) => createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 22, padding: '16px 0', borderTop: `1px solid ${TOKENS.border}` } },
    createElement('div', { style: { width: 160, flexShrink: 0, color: TOKENS.textMuted, fontFamily: 'Space Mono', fontSize: 12, letterSpacing: '0.16em' } }, label),
    createElement('div', { style: { width: 70, flexShrink: 0, color: scoreColour(output?.score ?? null), fontFamily: 'Space Mono', fontSize: 24, fontWeight: 700 } }, output?.score === null || output?.score === undefined ? 'NA' : String(output.score)),
    createElement('div', { style: { flex: 1, color: TOKENS.textSecondary, fontFamily: 'Barlow', fontSize: 17, fontWeight: 400, lineHeight: 1.35 } }, compactSummary(output?.summary ?? 'Supply schedule not provided.')));
  return createElement('div', { style: { width: 1200, height: 630, display: 'flex', flexDirection: 'column', backgroundColor: TOKENS.bgPrimary, border: `1px solid ${TOKENS.systemSteel}`, borderLeft: `6px solid ${verdictColour}`, color: TOKENS.textPrimary, backgroundImage: 'radial-gradient(rgba(74,111,165,0.24) 1px, transparent 1px)', backgroundSize: '20px 20px' } },
    createElement('div', { style: { height: 50, padding: '0 34px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${TOKENS.border}` } },
      createElement('div', { style: { color: TOKENS.systemSteel, fontFamily: 'Space Mono', fontSize: 13, letterSpacing: '0.2em', fontWeight: 700 } }, `${request.chainId.toUpperCase()} EVM`),
      createElement('div', { style: { color: TOKENS.textSecondary, fontFamily: 'Space Mono', fontSize: 13 } }, shortAddress(request.contractAddress))),
    createElement('div', { style: { flex: 1, padding: '34px 34px 18px', display: 'flex', flexDirection: 'column' } },
      createElement('div', { style: { color: TOKENS.systemSteel, fontFamily: 'Space Mono', fontSize: 12, letterSpacing: '0.24em', fontWeight: 700 } }, 'VERDICT'),
      createElement('div', { style: { marginTop: 10, color: TOKENS.textPrimary, fontFamily: 'Fraunces', fontSize: 82, fontStyle: 'italic', fontWeight: 300, lineHeight: 1 } }, reasoning.verdict),
      createElement('div', { style: { marginTop: 14, color: TOKENS.textSecondary, fontFamily: 'Barlow', fontSize: 21, fontWeight: 400 } }, reasoning.headlineReason)),
    createElement('div', { style: { padding: '12px 34px 0', display: 'flex', flexDirection: 'column' } }, row('CONTRACT LENS', contract), row('MARKET LENS', market), row('SUPPLY LENS', supply), createElement('div', { style: { paddingTop: 14, display: 'flex', justifyContent: 'space-between' } }, createElement('div', { style: { color: TOKENS.textSecondary, fontFamily: 'Fraunces', fontSize: 18, fontWeight: 300 } }, 'premortem'), createElement('div', { style: { color: TOKENS.textMuted, fontFamily: 'Space Mono', fontSize: 11 } }, timestamp.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'))));
}

export async function renderShareCard(data: CardData) {
  const fonts = [
    { name: 'Fraunces', data: await fontData(['node_modules/@fontsource/fraunces/files/fraunces-latin-300-italic.woff', 'node_modules/@fontsource/fraunces/files/fraunces-latin-300-italic.woff2'], 'C:\\Windows\\Fonts\\georgiai.ttf'), weight: 300 as const, style: 'italic' as const },
    { name: 'Barlow', data: await fontData(['node_modules/@fontsource/barlow/files/barlow-latin-300-normal.woff', 'node_modules/@fontsource/barlow/files/barlow-latin-300-normal.woff2'], 'C:\\Windows\\Fonts\\arial.ttf'), weight: 300 as const, style: 'normal' as const },
    { name: 'Space Mono', data: await fontData(['node_modules/@fontsource/space-mono/files/space-mono-latin-400-normal.woff', 'node_modules/@fontsource/space-mono/files/space-mono-latin-400-normal.woff2'], 'C:\\Windows\\Fonts\\cour.ttf'), weight: 400 as const, style: 'normal' as const },
  ];
  const svg = await satori(cardView(data), { width: 1200, height: 630, fonts });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: 2400 } }).render().asPng());
}
