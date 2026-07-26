# APP_BLUEPRINT.md — Premortem

## Problem

Retail traders make buy decisions in seconds with no systematic way to check what they are buying. Contract audits are long and technical. Holder data lives across three different explorers. Vesting schedules are buried in whitepapers or Discord posts. Every VC fund has an analyst who synthesises all of this before touching a position. Retail has never had that. Premortem is that analyst compressed into one paste.

## Target user

Retail traders on X Layer and Base who make token buy decisions and want one fast, structured check before committing. They are not developers and they do not read Solidity. They do understand risk, concentration, and the concept of an unlock event dumping on them.

## Tracks and fit

**Best Product.** Premortem offers the most complete pre-trade decision surface of any tool in the Finance category. One input, three parallel lenses, one verdict, one audio brief, one shareable card. No comparable ASP produces all of these from a single paste.

**Finance Copilot.** The product is directly and exclusively a finance decision aid. Every feature exists to answer one question before a trade is made.

**Revenue Rocket.** Each token buy is a potential $1 query. The use case is high-frequency and habitual. A trader who uses it once and avoids a rug will use it for every subsequent buy.

**Creative Genius.** The pre-mortem framing (a real cognitive technique from decision science, specifically Gary Klein and Daniel Kahneman's work on prospective hindsight) applied to token risk is a novel and memorable productisation of an established concept.

**Social Buzz.** The verdict share card is a natively shareable artefact formatted for X card previews at 1200 by 630. The card was designed to be posted, not just viewed.

## MVP scope

**In scope:**
- Contract address input with chain selection (X Layer and Base)
- Contract lens: source verification, owner mint check, pause function, proxy pattern, timelock, blacklist, renounced ownership
- Market lens: top 10 holder concentration, recent large Transfer events (72-hour window), LP depth relative to market cap
- Supply lens: user-provided vesting data via pasted text or uploaded screenshot, Claude Vision OCR for image input, unlock simulation across 3, 6, and 12 month windows
- Claude API reasoning call synthesising all three lenses into verdict, headline, audio script, and recommendation
- ElevenLabs Flash audio brief, 30 seconds, calm and clinical voice, cached per address
- Satori verdict share card at 1200 by 630 pixels, cached per address
- Server-Sent Events stream so each lens cell populates as its data arrives rather than all at once
- In-memory LRU cache keyed by address plus chain ID, one-hour TTL

**Out of scope for this build:**
- Wallet connection or authentication (OKX.AI handles payment and access)
- Historical verdict storage or user accounts
- Additional chains beyond X Layer and Base
- Automated social posting
- DEX trade execution or swap integration
- Real-time price feeds or charting

## Data model

**AnalysisRequest**
- id: string (uuid)
- contractAddress: string
- chainId: xlayer | base
- supplyDataRaw: string | null (pasted text or null)
- supplyImageBase64: string | null (uploaded screenshot or null)
- requestedAt: Date

**AnalysisResult**
- id: string (matches request id)
- verdict: high_risk | caution | clear
- headlineReason: string (under 12 words)
- recommendation: string (Do not trade | Trade with caution | Clear to trade)
- audioScript: string (60 words)
- audioUrl: string | null
- shareCardUrl: string | null
- contractScore: number (0 to 100)
- contractFindings: ContractFinding[]
- marketScore: number (0 to 100)
- marketFindings: MarketFinding[]
- supplyScore: number | null
- supplyFindings: SupplyFinding[] | null
- completedAt: Date

**ContractFinding**
- key: string (OWNER_MINT | TIMELOCK | PAUSE_FN | PROXY | BLACKLIST | SOURCE_VERIFIED | OWNERSHIP_RENOUNCED)
- value: string (true | false | present | none | upgradeable | verified | renounced)
- riskWeight: number

**MarketFinding**
- key: string (TOP_HOLDERS | DEV_MOVE | LP_DEPTH | SIMILAR_RUGS)
- value: string
- riskWeight: number

**SupplyFinding**
- key: string (UNLOCK_3M | UNLOCK_6M | UNLOCK_12M | CLIFF | TEAM_ALLOC | INVESTOR_ALLOC)
- value: string
- riskWeight: number

## Three-lens pipeline

The backend starts all three lens tasks at the same time using Promise.allSettled. Each lens emits an SSE event to the connected client when it completes. If a lens fails (RPC timeout, API error), it emits a partial result with an error flag rather than failing the whole analysis.

**Contract lens flow:**
1. Attempt to fetch verified source from OKScan (X Layer) or Basescan (Base) API
2. If source found: parse ABI for owner mint function, pause function, blacklist function, timelock contract interaction, proxy pattern
3. Check if ownership is renounced by querying the owner() function
4. Assign risk weights per finding and compute a score from 0 to 100
5. Emit SSE event with score and structured findings array

**Market lens flow:**
1. Call Moralis API for top 10 holders and their percentage of total supply
2. Fetch Transfer events from the last 72 hours via RPC event log query, filter for transfers above 0.5% of total supply
3. Query the DEX subgraph (Uniswap V3 equivalent on the target chain) for the primary liquidity pool, compute LP depth as a percentage of market cap
4. Assign risk weights and compute score
5. Emit SSE event with score and structured findings array

**Supply lens flow:**
1. If supplyImageBase64 is present: send to Claude Vision with a structured extraction prompt, receive JSON vesting schedule
2. If supplyDataRaw is present: send to Claude API as text with the same extraction prompt
3. If neither is present: emit SSE event with null score and a prompt message
4. Parse the extracted schedule into month-by-month unlock events
5. Compute percentage of total supply unlocking in the 3, 6, and 12 month windows
6. Assign risk weights (no cliff is a red flag, large team allocation above 20% is a risk flag)
7. Emit SSE event with score and structured findings array

**Reasoning call:**
After all three lenses have resolved (whether successfully or with partial data), fire one Claude API call with all lens outputs. The system prompt instructs the model to return a single JSON object with: verdict, headlineReason, recommendation, audioScript. The audioScript is written in the calm and clinical voice locked in the gate decisions. This JSON is never displayed directly but is parsed into the verdict cell and the audio pipeline.

## API routes

**POST /api/analyse**
Auth: none (OKX.AI handles access control at the marketplace layer)
Body: { contractAddress: string, chainId: 'xlayer' | 'base', supplyDataRaw?: string, supplyImageBase64?: string }
Response: { analysisId: string }
Side effect: starts the three-lens pipeline and opens an SSE stream for the analysisId

**GET /api/analyse/:id/stream**
Returns: text/event-stream
Events emitted:
- { event: 'lens_complete', data: { lens: 'contract' | 'market' | 'supply', score: number | null, findings: Finding[], error?: string } }
- { event: 'verdict', data: { verdict: string, headlineReason: string, recommendation: string } }
- { event: 'audio_ready', data: { url: string } }
- { event: 'card_ready', data: { url: string } }
- { event: 'done' }

**GET /api/audio/:address/:chainId**
Returns: audio/mpeg (MP3 file)
Served from disk cache if available

**GET /api/card/:address/:chainId**
Returns: image/png (1200 by 630 PNG)
Served from disk cache if available

## Score and colour logic

Risk scores range from 0 to 100 where higher means more risk indicators detected. The frontend maps scores to colours as follows: 0 to 25 renders in --verdict-clear (green), 26 to 60 renders in --verdict-caution (amber), 61 to 100 renders in --verdict-risk (red). This mapping is applied identically across all three lenses. There are no per-lens colour overrides.

The overall verdict is computed by the Claude reasoning call, not by averaging scores. A single critical finding in one lens can produce a High Risk verdict even if the other two lenses score clean.

## Judging alignment

**Technical ambition:** three parallel on-chain and AI data pipelines, Claude Vision OCR for supply data, ElevenLabs audio generation, Satori card generation, and SSE streaming all in a single user-facing query.

**User experience:** one input, everything runs automatically, the surface updates in real time as lenses complete. The audio brief means the user receives the verdict as a spoken experience, not just a visual one.

**Real-world utility:** directly addresses a decision a retail trader makes every time they consider a new token, and produces an output that is immediately actionable.

**Revenue model:** $1 per query at the marketplace layer with OKX.AI revenue share. The use case is high-frequency. A trader running Premortem before every new position will generate consistent recurring revenue.
