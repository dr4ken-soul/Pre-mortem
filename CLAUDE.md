# CLAUDE.md — Premortem

Persistent context for any AI coding agent working on this project. Read this in full before touching any file.

## What Premortem is

Premortem is a single-input verdict engine for any token or contract address. The user pastes one address. Premortem runs three analytical lenses in parallel: Contract (on-chain code risk), Market (holder distribution and recent large transfers), and Supply (vesting schedule and unlock pressure). The output is a single verdict card rated High Risk, Caution, or Clear, a 30-second ElevenLabs audio brief the user can play immediately, and three data drill-downs with blueprint-style annotation callouts. Every completed verdict also generates a 1200 by 630 PNG share card via Satori so the user can post their verdict directly to X.

Built for the OKX.AI Genesis Hackathon as an Agent Service Provider (ASP) listed on OKX.AI Marketplace. Price per query is $1 through OKX.AI's revenue share model. Target award tracks: Best Product, Finance Copilot, Revenue Rocket, Creative Genius, Social Buzz.

## Non-negotiable rules

**No hardcoded logo, favicon, icon, or emoji anywhere.** Every brand asset slot stays a plain HTML comment until Paul supplies the real file. The one exception is the plain typographic wordmark "premortem" set in Fraunces at font-weight 300, lowercase, with nothing attached to it. That is typography, not a logo, and is the intended final nav treatment.

**No placeholders or lorem ipsum.** Every string in every file is final, real copy. Nothing in the UI is a stand-in.

**No em dashes anywhere.** Not in UI copy, not in code comments, not in JSDoc, not in error messages, not in any string anywhere in the project. None.

**British English throughout.** Every string, every comment, every label.

**CSS variables only.** No hardcoded hex values inside components. Every colour reference pulls from the design tokens defined in FRONTEND_SPEC.md.

**Hover states are CSS class based.** No inline onMouseEnter or onMouseLeave handlers anywhere.

**Loading states are skeleton shimmer, never spinners.** The scanning state uses its own animated bar indicators as defined in FRONTEND_SPEC.md. These are not spinners and are not loading state skeletons. They are a specific scanning animation.

**motion/react, not framer-motion.** All animation imports use the restructured package name without exception.

**No icons as brand substitutes.** Lucide React icons are permitted only where structurally necessary: the play button in the audio cell and the share action in the share cell. Never as a wordmark replacement or decorative element.

**Score colour logic is value-based.** Risk scores of 0 to 25 render green, 26 to 60 render amber, 61 to 100 render red. This applies across all three lenses consistently. No per-lens colour overrides.

## Writing rules

Two voices apply depending on what is being written.

**In-product copy** (UI labels, error states, verdict strings, button text, annotation callout values, JSDoc, code comments): British English, no em dashes, periods only when the sentence needs one, commas only when necessary, direct and confident, never opens with filler.

**Paul's personal voice** (used only in MARKETING.md): all lowercase, no periods, no em dashes, blank line between paragraphs, natural builder tone, no date references.

Both voices govern every string the coding agent generates, including strings embedded inside components.

## Tech stack

**Frontend:** React 18 + Vite + TypeScript. Tailwind CSS for layout utilities and spacing. CSS variables for the design system, never hardcoded values inside components. motion/react for all animation. TanStack React Query for API state management. Zustand for client-side state. Single-page application with no router, the entire product is one surface with three state transitions.

**Backend:** Node.js with Fastify. Handles the three-lens analysis pipeline, Claude API reasoning call, ElevenLabs audio generation, Satori image generation, and per-address caching.

**Data sources per lens:**

Contract lens uses ethers.js in read-only mode against X Layer and Base public RPC endpoints. It checks: contract source verification status via OKScan API (X Layer) and Basescan API (Base); presence of owner mint function; presence of pause function; proxy or upgradeable pattern; timelock presence; blacklist function; and whether ownership has been renounced. Each check contributes to the contract risk score.

Market lens pulls holder distribution from Moralis API (top 10 holders and their percentage of total supply), reads recent Transfer events from the last 72 hours to flag large wallet movements, and queries the relevant DEX subgraph for LP depth relative to market cap.

Supply lens uses user-provided data only. The user pastes vesting table text or uploads a screenshot of the vesting schedule. If a screenshot is uploaded, the backend sends it to Claude Vision (claude-sonnet-4-6) for OCR and structured extraction. The extracted or pasted schedule is then parsed into unlock events by month. If no supply data is provided, the Supply lens cell shows a prompt rather than running an empty analysis.

**AI reasoning:** Claude API using claude-sonnet-4-6. One call fires after all available lens data is collected. The prompt receives all lens outputs and returns a structured JSON object containing: verdict (High Risk, Caution, or Clear), headline reason under 12 words, a 60-word audio script in a calm and clinical register, and a recommendation string (Do not trade, Trade with caution, or Clear to trade).

**Audio:** ElevenLabs Flash v2.5 API. One fixed voice ID is used across every audio brief so the voice becomes recognisable as the product's own. The 60-word script from the reasoning call goes to ElevenLabs. The returned MP3 is cached against the contract address so repeat lookups on the same address cost nothing in audio credits.

**Share card:** Satori (vercel/satori) renders the verdict card as a React component to PNG at exactly 1200 by 630 pixels. Cached per address alongside the audio file. Fonts loaded into Satori must match the product: Fraunces, Barlow, Space Mono.

**Caching:** In-memory LRU cache keyed by contract address concatenated with chain ID. TTL is one hour per entry. Audio and image files cached on disk by the same key.

## Project identity

Name: **Premortem**. Single word, locked. Do not propose alternatives.

Palette name: **Forensic Slate**. Full token values in FRONTEND_SPEC.md.

Typography: Fraunces (verdict headline only, weight 300, italic), Barlow (all body copy, labels, buttons, UI text), Space Mono (all addresses, scores, numbers, system labels, annotation callout values). This pairing has not been used in any prior project. Do not substitute any of these three fonts.

## Reference images

Four reference comps live in the reference-images/ folder alongside this file. Read all four before writing any component.

- comp-1-entry-state.png: full entry state, ghost bento cells, contract address input, RUN ANALYSIS button
- comp-2-scanning-state.png: active scanning state, bar indicators, bright scan line, ANALYZING label and progress sweep
- comp-3-results-state.png: fully populated results state, red verdict border, scores, annotation callouts, audio player
- comp-4-share-card.png: 1200 by 630 share card format with verdict, three lens rows, wordmark and timestamp

Match layout, cell proportions, border treatment, annotation callout style, score typography weight, system label placement, and corner marker positions from these images. Everything not shown explicitly in the images is governed by FRONTEND_SPEC.md. Where the images and this spec conflict, this spec takes precedence.

## Hackathon context

OKX.AI Genesis Hackathon. $100,000 total prize pool. Submission deadline: 17 July 2026, 23:59 UTC. Submission requires the ASP to be live on OKX.AI Marketplace and a public X post containing a 90-second demo video. The demo video must show the full flow: address pasted, analysis running, verdict appearing with audio playing, share card generated.

The five target tracks and what makes Premortem competitive in each: Best Product because one input produces a complete decision surface no retail tool currently offers; Finance Copilot because it is the most directly useful Finance-category ASP in the marketplace; Revenue Rocket because every token buy is a potential $1 query and the use case is high-frequency; Creative Genius because the pre-mortem framing of a known cognitive bias is genuinely novel productisation; Social Buzz because the verdict share card is a natively shareable artefact designed to spread on X.
