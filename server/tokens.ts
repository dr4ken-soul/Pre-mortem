export const TOKENS = {
  bgPrimary: '#090b0f',
  bgSecondary: '#10131a',
  systemSteel: '#4a6fa5',
  textPrimary: '#f2f6ff',
  textSecondary: '#b8c3d8',
  textMuted: '#6f7d96',
  border: 'rgba(255,255,255,0.12)',
  risk: '#ef4444',
  caution: '#eab308',
  clear: '#22c55e',
} as const;

export function scoreColour(score: number | null) {
  if (score === null || score <= 25) return score === null ? TOKENS.systemSteel : TOKENS.clear;
  if (score <= 60) return TOKENS.caution;
  return TOKENS.risk;
}
