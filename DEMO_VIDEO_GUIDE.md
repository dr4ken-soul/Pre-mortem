# Premortem Silent Demo Video Guide

This guide is for a silent screen recording only.

No voiceover. No captions. No subtitles. No text overlays.

The video should simply show what Premortem is, what the user enters, what the app does, and what result comes out.

## Target Length

Keep the video under 90 seconds.

The OKX requirement says the X post should include a clear demo or walkthrough and that demo content should be no longer than 90 seconds. Aim for 60 to 75 seconds so you have room if the scan takes a moment.

## What The Video Must Prove

The recording should show:

- Premortem starts from one contract or token address.
- The user can choose X Layer or Base.
- The user can add a vesting schedule.
- The three lenses scan in parallel.
- A verdict appears.
- The audio brief becomes available.
- The share card opens on its own page and can be downloaded as a PNG.
- `NEW SCAN` returns to the input without refreshing the browser.

## Test Before Recording

Run this from the project folder:

```bash
cd "C:\Users\Paul\Documents\Coding Area\Hackathon\Pre-mortem"
npm run check
npm test
npm run build
npm run dev
```

Open the app:

```text
http://localhost:5173
```

Open the API health check in another tab:

```text
http://localhost:3001/api/health
```

Expected response:

```json
{"ok":true,"status":"ok","service":"premortem"}
```

If all commands pass and the app opens, hard-refresh the browser with `Ctrl + F5` before testing. This matters after a code update because the browser may still have the previous frontend bundle.

## Demo Input

Use this real Base token address:

```text
0x940181a94A35A4569E4529A3CDfB74e38FD98631
```

Use this chain:

```text
BASE
```

Use this Aerodrome tokenomics and emissions schedule:

```text
Initial supply 500M AERO. 450M distributed as vote-locked veAERO. Weekly emissions begin at 10M AERO. First 14 epochs increase by 3% per week. After epoch 14, emissions decay by 1% per epoch. Team allocation 14%. Protocol grants 10%. Ecosystem and public goods 21%. Voter incentives 8%. Genesis liquidity pool 2%.
```

This input is suitable for recording because it uses a real Base contract and a public tokenomics schedule. Contract bytecode, ERC-20 supply data, recent RPC data where the node returns it, and public DEX liquidity are read at scan time. Explorer source checks and Moralis holder percentages are labelled `not checked` or `unavailable` when their optional API keys are not configured. The app does not replace those missing signals with fabricated values.

## Additional Test Cases

Use these to test different result states:

### Base USDC, live ERC-20 data with no vesting input

```text
Address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Chain: BASE
Vesting input: leave empty
```

The Supply lens should remain a prompt because no schedule was supplied. This tests the difference between a real token scan and an optional supply analysis.

### Base WETH, live contract and market data with no token schedule

```text
Address: 0x4200000000000000000000000000000000000006
Chain: BASE
Vesting input: leave empty
```

### Deliberately high-pressure supply parser test

This is synthetic test text, not the official tokenomics of a real project. It is useful for checking that the Supply lens changes when the input changes.

```text
Team allocation 28% unlocks at launch. Investors 22% unlock over 3 months with no cliff. Advisors 8% unlock over 6 months. Liquidity 5%.
```

When testing the scanner, always verify that the address under the verdict changes. Also compare the contract bytecode, source verification, token supply, price, liquidity, and transfer-event findings. Those are the evidence that the scan used live data.

## How To Read Unavailable Data

`Top holder concentration needs a holder indexer` is an honest limitation, not a failed scan. A public RPC can read the token contract, supply, transfer logs, and balances for observed addresses, but it does not provide a complete ranked holder list. Premortem only displays a top-holder percentage when Moralis returns a holder index or when the observed sample is sufficient. It does not invent a percentage.

The optional environment variables are:

```text
MORALIS_API_KEY=      # enables complete holder data where available
ETHERSCAN_API_KEY=    # Etherscan unified key for Base explorer source and ABI data
OKLINK_API_KEY=       # OKLink X Layer API key
OKLINK_SECRET_KEY=    # OKLink signing secret
OKLINK_PASSPHRASE=    # OKLink API passphrase
```

Without those keys, the scan still reads live public RPC data and public DEX data. A result is complete when the stream reaches `done`, the dashboard status says `COMPLETE`, and the address, bytecode, supply, transfer count, price, liquidity, and any available source verification are shown. The three lenses can complete with different fields marked `unknown` or `indexer needed`.

The Etherscan key is used for Base. The OKLink credentials are used for a signed X Layer request to retrieve verified contract source, ABI, proxy, and implementation data. OKLink requires all three credentials for this request. Keep them in `.env` and never record them in the demo.

## Browser Setup

Before recording:

- Open `http://localhost:5173`.
- Press `Ctrl + 0` so browser zoom is 100 percent.
- Press `F11` for full screen.
- Close unrelated tabs and notifications if possible.
- Use the latest refreshed app screen.

The recording should focus only on the product. Do not show the IDE, terminal, source code, or browser tabs unless the hackathon form specifically asks for them.

## What To Record

### 0 to 5 seconds

Show the idle Premortem screen.

Do not move too fast. Let the viewer see:

- The wordmark.
- The address input.
- The three lens panels.
- The audio and share cells.

### 5 to 18 seconds

Paste the demo address into the input field:

```text
0x940181a94A35A4569E4529A3CDfB74e38FD98631
```

Click `BASE`.

Open `VESTING SCHEDULE`.

### 18 to 30 seconds

Paste the tokenomics and emissions schedule:

```text
Initial supply 500M AERO. 450M distributed as vote-locked veAERO. Weekly emissions begin at 10M AERO. First 14 epochs increase by 3% per week. After epoch 14, emissions decay by 1% per epoch. Team allocation 14%. Protocol grants 10%. Ecosystem and public goods 21%. Voter incentives 8%. Genesis liquidity pool 2%.
```

Pause briefly so the viewer can see that supply information is included.

### 30 to 45 seconds

Click `RUN ANALYSIS`.

Let the scanning state play.

The viewer should see that:

- The input becomes an analysing state.
- The three lens panels move from idle to scanning.
- The app is not just a static mockup.

### 45 to 65 seconds

Wait for the result.

When the verdict appears, move the cursor slowly over:

- The verdict cell.
- Contract lens.
- Market lens.
- Supply lens.

Do not click randomly. The cursor movement should guide the viewer's eyes.

### 65 to 80 seconds

Show that the audio brief cell is ready. The time beside the play button is the estimated length of the generated brief, for example `0:25`. With no ElevenLabs key, clicking play uses the browser's local speech engine so the feature remains testable. Since this is a silent demo, do not rely on audio being heard in the recording.

Then click `OPEN CARD` in the share cell.

Show the generated card page, the `BACK TO SCAN` button, and the `DOWNLOAD PNG` button. Click `DOWNLOAD PNG` once if you want the recording to prove the file action. It downloads only the generated card PNG, not the browser page.

### 80 to 90 seconds

End on the generated share card or return to the result screen.

Best ending frame:

- Verdict visible.
- Three lens results visible.
- Share card proven.

## Recording Tool

Use Windows Game Bar if you want the fastest path:

1. Press `Win + G`.
2. Open Capture.
3. Click Record.
4. Record the app flow.
5. Stop recording.
6. Save as MP4.

Use OBS if you want cleaner quality:

1. Add `Display Capture` or `Window Capture`.
2. Set canvas to `1920 x 1080`.
3. Set FPS to `30`.
4. Start recording.
5. Record the app flow.
6. Export as MP4.

## Silent Demo Checklist

Before uploading or posting, replay the video and confirm:

- The address is visible.
- Base is selected.
- The vesting schedule is opened and filled.
- The run button is clicked.
- The scanning state is visible.
- The verdict appears.
- Lens results are visible.
- Audio cell is shown after completion.
- Share card opens.
- Card page shows `BACK TO SCAN` and `DOWNLOAD PNG`.
- Share card page has a `DOWNLOAD PNG` button.
- Clicking `BACK TO SCAN` returns to the input screen.
- Clicking `NEW SCAN` after a result returns to the input screen without a browser refresh.
- The video is under 90 seconds.
- There is no voiceover.
- There are no captions or subtitles.

## If Something Fails

If the app does not open:

```bash
npm run dev
```

If the API does not respond:

```bash
curl http://localhost:3001/api/health
```

If the share card does not open:

```bash
npm test
```

The smoke test checks the analysis route, event stream, generated audio endpoint, generated share card endpoint, card page, and PNG attachment response.

If the same result appears for two different real addresses, confirm that the address shown under the verdict changed. Then check the three lens summaries. The current scanner reads the selected address at run time. A lens that cannot access an optional data source will explicitly say `unavailable` or `not checked` instead of creating a seeded score.

## X Post Text To Use With The Silent Video

Use this as the post text when attaching the video:

```text
premortem is a pre-trade risk scanner for X Layer and Base tokens.

paste one contract address, add optional vesting data, and it returns a single verdict from contract, market, and supply risk.

built for the OKX.AI Genesis Hackathon.

#OKXAI
```

If your ASP is already live on OKX.AI, add the live ASP link before `#OKXAI`.
