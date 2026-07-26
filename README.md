# premortem

Premortem is a one-input token risk verdict engine for X Layer and Base. Paste a contract or token address, optionally add a vesting schedule, and the app runs three lenses in parallel:

- Contract lens: source status, owner controls, mint, pause, proxy, blacklist, timelock, and ownership posture.
- Market lens: holder concentration, developer movement, LP depth, and similar-risk pattern signals.
- Supply lens: vesting and unlock pressure from pasted schedule text or an uploaded schedule image.

The output is a single verdict with animated lens results, an audio brief, and a generated social share card.

## Run locally

```bash
npm install
npm run dev
```

Client: `http://localhost:5173`

API: `http://localhost:3001`

## Production build

```bash
npm run build
npm start
```

The production server serves the built React app and the API from one Fastify process.

## Deploy to Vercel

The repository includes `vercel.json` and `api/[...path].ts`. Vercel serves the
React build from `dist` and sends API and share-card requests to the Fastify
function. Generated files use `/tmp` on Vercel because serverless files are
temporary. The browser speech fallback continues to work when ElevenLabs is
not configured.

1. Push this repository to GitHub.
2. In Vercel, choose **Add New Project**, import the repository, and keep the
   detected framework settings.
3. Add these Environment Variables to **Production** and **Preview** as needed:

   - `ANTHROPIC_API_KEY`
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_VOICE_ID`
   - `MORALIS_API_KEY`
   - `XLAYER_RPC_URL`
   - `BASE_RPC_URL`
   - `OKLINK_API_KEY`
   - `OKLINK_SECRET_KEY`
   - `OKLINK_PASSPHRASE`
   - `ETHERSCAN_API_KEY`

4. Deploy. Do not put these values in frontend variables such as `VITE_*`.
5. Open the deployed URL and test `/api/health` before running a scan.

Vercel serverless instances are temporary and may not share in-memory jobs or
generated files between separate invocations. The included adapter is suitable
for a hackathon demo, but a production deployment should move generated cards
and MP3 files to object storage and use a shared job store.

## Verification

```bash
npm run check
npm test
npm run build
```

The smoke test submits a real EVM-shaped address through the API, consumes the server-sent event stream, and verifies generated audio plus share card assets.

## Environment

Copy `.env.example` to `.env` for live integrations. The app still runs without optional API keys by using public RPC, public DEX data, Sourcify checks, and browser speech for the audio brief.

Optional variables:

- `ANTHROPIC_API_KEY` for Claude reasoning and image-aware supply interpretation.
- `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` for narrated MP3 output.
- `MORALIS_API_KEY` for live holder data.
- `XLAYER_RPC_URL` and `BASE_RPC_URL` for live bytecode and owner checks.
- `ETHERSCAN_API_KEY` for verified Base source and ABI checks. `BASESCAN_API_KEY` remains a temporary legacy alias.
- `OKLINK_API_KEY`, `OKLINK_SECRET_KEY`, and `OKLINK_PASSPHRASE` for signed X Layer verified source and ABI checks.

## Submission Notes

The implementation follows the supplied `CLAUDE.md`, `APP_BLUEPRINT.md`, `BUILD_GUIDE.md`, `FRONTEND_SPEC.md`, and `MARKETING.md` files. It uses the locked visual system from the reference comps: Forensic Slate palette, bento grid, scanning state, lens result cells, utility audio/share cells, and generated 1200 by 630 verdict card.

For recording and testing the hackathon walkthrough, use `DEMO_VIDEO_GUIDE.md`.
