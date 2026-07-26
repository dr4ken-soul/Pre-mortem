# BUILD_GUIDE.md — Premortem

Sequential build phases. Complete each phase fully before moving to the next. Order matters because later phases depend on foundations laid earlier.

## Phase 1 — Foundation

Scaffold the React 18 + Vite + TypeScript project. Install Tailwind CSS, motion/react, TanStack React Query, Zustand. Set up the design tokens from FRONTEND_SPEC.md as CSS custom properties on :root. Load Fraunces, Barlow, and Space Mono from Google Fonts in index.html. Confirm all three fonts render correctly on a blank page before building anything on top of them. Scaffold the Node.js + Fastify backend in a /server directory within the same repository. Install ethers.js, @anthropic-ai/sdk, node-fetch, satori, @resvg/resvg-js, and elevenlabs. Create a .env.example file listing every required environment variable: ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, MORALIS_API_KEY, XLAYER_RPC_URL, BASE_RPC_URL, OKSCAN_API_KEY, BASESCAN_API_KEY.

## Phase 2 — Background system and layout shell

Implement the dot grid layer as a fixed full-viewport div using the CSS radial-gradient specified in FRONTEND_SPEC.md Section 5. Implement the scan line layer as a fixed div with the idle CSS animation. Build the navigation strip at 40px height with the wordmark left and the system status indicator right, wired to the Zustand store for state. Build the footer strip at 28px with the system metadata string and the live UTC clock updating every second via setInterval. Build the grid outer frame div with dashed border and corner "+" markers. Build all four screen corner markers (L1, L2, L3, L4 bracket shapes) as fixed-position decorative elements. Confirm the full layout shell renders correctly against comp-1-entry-state.png before adding any cell content.

## Phase 3 — Entry state UI

Build the bento grid with the exact grid-template-columns and grid-template-rows defined in FRONTEND_SPEC.md Section 8. Build the input cell with the contract address field, descriptor text, tag label, chain selector, RUN ANALYSIS button, and verdict hint. Build the supply data expander with AnimatePresence height transition for the textarea and file upload zone. Build the three ghost lens cells with their corner annotation markers (L1, L2, L3), skeleton shimmer bars, score placeholder string, lens tag, and bottom status strip. Build the two ghost utility cells with their status strips. Confirm the full entry state matches comp-1-entry-state.png before moving forward.

## Phase 4 — Zustand store and state machine

Define the analysis store in Zustand with the following slices: systemStatus (idle, scanning, complete), contractAddress (string), chainId (xlayer or base), lensResults object with contract, market, and supply keys each holding score, findings, and status, verdict object holding verdict string, headlineReason, recommendation, audioUrl, and shareCardUrl. Wire the systemStatus to the nav strip system status indicator. Wire the lensResults to the lens cell display logic. Confirm state transitions update the nav dot and status text correctly.

## Phase 5 — Scanning state UI

Build the scanning version of the input cell content using AnimatePresence to transition from the entry content to the scanning content. Implement the progress sweep animation as a pure CSS animation. Build the `.scan-active` CSS class and the JavaScript toggle that switches the scan line from idle to scanning state. Build the scanning version of each lens cell, with the bar animation and active shimmer, triggered when that lens's status in the Zustand store changes to scanning. Confirm the full scanning state matches comp-2-scanning-state.png.

## Phase 6 — Fastify server and SSE infrastructure

Set up the Fastify server with CORS configured to accept requests from the frontend origin. Implement POST /api/analyse to receive the contract address, chain ID, and optional supply data. On receiving a request, generate an analysis ID, store the pending analysis in an in-memory LRU cache, and return the analysis ID immediately. Implement GET /api/analyse/:id/stream as a Server-Sent Events endpoint. Set the correct Content-Type header (text/event-stream) and write a helper function that emits a typed SSE event to the response stream. Wire up the frontend to open an EventSource connection immediately after receiving the analysis ID from the POST response.

## Phase 7 — Contract lens

Implement the contract lens as an async function that accepts a contract address and chain ID. Create read-only ethers.js providers for X Layer (using XLAYER_RPC_URL) and Base (using BASE_RPC_URL). Fetch the verified contract source from OKScan or Basescan API. If source is not verified, that is itself a high-weight risk finding. If source is available, parse the ABI for the presence of mint functions with unrestricted access, pause functions, blacklist or blocklist functions, and proxy delegation patterns. Call the owner() function on the contract to check if ownership has been renounced (address(0)). Check for a timelock contract in the deployment history or source imports. Assign a risk weight to each finding using a fixed weight table. Compute the contract score as a weighted sum normalised to 0 to 100. Emit the lens_complete SSE event with score and findings array, then return.

## Phase 8 — Market lens

Implement the market lens as an async function. Call the Moralis API endpoint for ERC-20 token holders, request the top 10, compute the combined percentage of total supply held by the top 3 and top 10 holders. Query Transfer event logs from the last 72 hours using the ethers.js provider, filter for transfers above 0.5% of total supply, identify if any originate from the deployer wallet or known team wallets (check against the owner address from Phase 7). Query the relevant DEX subgraph for the primary liquidity pool's total value locked and compute it as a percentage of the token's market cap estimate. Assign risk weights and compute the market score. Emit the lens_complete SSE event.

## Phase 9 — Supply lens

Implement the supply lens as an async function that accepts the raw supply data string or base64 image. If a base64 image is provided, send it to the Claude API using the vision capability with a structured extraction prompt. The prompt instructs the model to return a JSON array of vesting events, each with a recipient category (team, investor, advisor, public), total percentage allocated, cliff months, and vesting duration months. If raw text is provided, send it as a user message to the same Claude call without the image. If neither is provided, emit a lens_complete event with null score and a prompt message string, then return. With the structured schedule, compute total supply percentage unlocking at months 3, 6, and 12. Flag a missing cliff as a risk finding. Flag team or investor allocations above 20% as risk findings. Compute the supply score and emit the lens_complete SSE event.

## Phase 10 — Claude reasoning call

After all three available lenses have resolved (check Promise.allSettled results), fire a single Claude API call using claude-sonnet-4-6. The system prompt instructs the model to act as a clinical token risk analyst and return a JSON object only, with no preamble. The user message provides all three lens outputs formatted as structured data. The expected JSON shape is: verdict (High Risk | Caution | Clear), headlineReason (string, under 12 words), recommendation (Do not trade | Trade with caution | Clear to trade), audioScript (string, exactly 60 words, calm and clinical register, no em dashes). Parse the JSON response and emit a verdict SSE event to the client.

## Phase 11 — ElevenLabs audio

After the Claude reasoning call completes, extract the audioScript string and send it to the ElevenLabs Flash v2.5 API using the fixed voice ID from the environment variable. Request MP3 format. On receiving the audio buffer, write it to disk at /cache/audio/[address]-[chainId].mp3. Emit an audio_ready SSE event with the URL /api/audio/:address/:chainId. Implement GET /api/audio/:address/:chainId to serve the cached MP3 file with the correct Content-Type header. On subsequent requests for the same address and chain, serve from disk cache without calling ElevenLabs again.

## Phase 12 — Satori share card

Build the share card as a React component that accepts verdict, headlineReason, contractScore, contractFinding, marketScore, marketFinding, supplyScore, supplyFinding, contractAddress, chainId, and timestamp as props. The component uses inline styles only (no Tailwind, no CSS classes) as required by Satori. Match comp-4-share-card.png exactly for layout. In the Fastify server, import Satori and @resvg/resvg-js. Load Fraunces, Barlow, and Space Mono as ArrayBuffer from the local filesystem (download the font files to /assets/fonts/ during setup). After the reasoning call, call Satori with the share card component and the font data, convert the output SVG to PNG using resvg, write the PNG to /cache/cards/[address]-[chainId].png. Emit a card_ready SSE event. Implement GET /api/card/:address/:chainId to serve the cached PNG.

## Phase 13 — Results state UI

Build the verdict cell using AnimatePresence to replace the scanning cell content with the verdict content. Wire the Fraunces headline to the verdict string from the Zustand store. Implement the blur-to-focus reveal animation. Implement the left border colour transition from var(--border-default) to the verdict colour variable. Build the populated lens cell component that reads score and findings from the Zustand store and renders the score count-up, finding sentence, and annotation callout rows. Build the audio cell results state with the play button, waveform, and duration label, wired to the audioUrl from the store. Build the share cell results state with the SHARE VERDICT button wired to the shareCardUrl. Confirm the full results state matches comp-3-results-state.png.

## Phase 14 — Full animation pass

With all states rendering correctly, run a full animation pass. Confirm the scan line transitions between idle and active states cleanly on analysis start and on verdict arrival. Confirm the lens cell entrances stagger correctly with 0.08-second delays. Confirm the score count-up fires after the cell enters. Confirm the verdict headline blur-reveal fires after the scores begin counting. Confirm the audio and share cells enter after the lens cells. Test the scroll-triggered entrance behaviour by narrowing the viewport to mobile width and confirming cells below the fold use whileInView. Fix any animation that feels mechanical, rushed, or that fires out of sequence.

## Phase 15 — OKX.AI ASP submission

Register on OKX.AI Marketplace as an Agent Service Provider. Submit the Premortem service endpoint URL for listing review. The listing description should match the project description in MARKETING.md. Category: Finance. Price: $1 per query. Ensure the deployed service URL is publicly accessible over HTTPS before submitting for review. The ASP must pass OKX's internal review and go live before the hackathon submission is valid.

## Phase 16 — Demo preparation

Record the 90-second demo video following the demo flow described in MARKETING.md. Confirm the full flow works live: address pasted, scanning state animates correctly, all three lens cells populate, verdict appears with audio playing, share card generates, share card opens correctly. Post the X participation post with the #OKXAI hashtag and attach the demo video. Submit the Google form before 17 July 2026, 23:59 UTC with the ASP details and the X post link.
