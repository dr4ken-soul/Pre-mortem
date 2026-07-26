# Submission

## Project

premortem

## Summary

Premortem gives memecoin and new-token traders a fast pre-trade risk verdict from a single contract address. It combines contract posture, market concentration, and supply unlock pressure into one plain-language recommendation.

## Built For

- X Layer and Base token review.
- Hackathon demos where API keys may or may not be present.
- A judge-friendly flow that works locally with deterministic fallbacks.

## What Is Complete

- React and TypeScript frontend with the specified bento layout and three visual states.
- Fastify backend with `/api/analyse`, SSE progress, generated audio, and generated PNG share card routes.
- Contract, market, and supply lenses with live integrations when keys exist and safe fallback signals when they do not.
- Claude reasoning path with deterministic fallback.
- ElevenLabs narration path with local WAV fallback.
- Satori and Resvg share card generation.
- Smoke test covering analysis, SSE, audio, and card endpoints.

## Demo Commands

```bash
npm install
npm run dev
```

```bash
npm run check
npm test
npm run build
```

## Notes For Judges

The app is usable without secrets. API keys improve live data quality, but the submission remains demo-ready without them.
