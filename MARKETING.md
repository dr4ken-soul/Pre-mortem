# MARKETING.md — Premortem

## Goal

Get Premortem in front of OKX.AI judges and the wider crypto audience during the hackathon window without sounding like a pitch deck.

The story is simple: retail traders make buy decisions blind and then regret them. Premortem runs the check they never had time to do themselves. Every post proves the product works, not that the idea is interesting.

Core proof to show in public: a real contract address pasted, the three lenses scanning, a verdict landing with the audio brief playing, and the share card ready to post on X.

---

## Posting Style

- all lowercase
- builder voice, not company voice
- one clear idea per post
- short lines with space between thoughts
- show what works, do not explain what you plan to build
- the demo video does the heavy lifting, copy supports it

---

## Post Plan

### post 1 — project announcement

```
built premortem for the okx.ai genesis hackathon

the idea: before you ape into any token, paste the contract address and get a verdict in under 30 seconds

three lenses run in parallel

contract code checks for owner mint functions, missing timelocks, and proxy patterns

market data checks who holds what and whether the dev wallet has been moving

supply analysis parses the vesting schedule and shows you exactly when the biggest unlocks hit

one input, one verdict, a 30-second audio brief you can play while the swap loads, and a card you can share straight to x

#OKXAI
```

Attach a screen recording showing the full flow from address paste to verdict card, kept under 90 seconds.

---

### post 2 — final submission

```
submitted premortem to the okx.ai genesis hackathon

paste any contract or token address on xlayer or base and get back a verdict with a 30-second audio brief and a shareable card

contract lens checks for owner mint functions, proxy patterns, timelocks, and blacklist functions

market lens reads holder concentration and flags recent whale movements

supply lens parses your vesting table and models unlock pressure over 3, 6, and 12 months

one paste, three lenses in parallel, one clear verdict

live on okx.ai marketplace at $1 per query

#OKXAI
```

Attach the final demo video. Include the OKX.AI marketplace listing link in the post.

---

## Submission Notes

**Project title:** Premortem

**Tagline:** Paste the address. Know the verdict.

**Category:** Finance

**Price per query:** $1

**Built with:**
- React 18 + Vite + TypeScript
- Node.js + Fastify
- ethers.js (read-only on-chain data)
- Moralis API (holder distribution)
- Claude API claude-sonnet-4-6 (reasoning, supply OCR, audio script)
- ElevenLabs Flash v2.5 (audio brief)
- Satori + @resvg/resvg-js (verdict share card PNG)
- Server-Sent Events (live lens streaming)

**Project description (under 200 words):**

Premortem is a single-input verdict engine for any token or contract address on X Layer and Base.

Paste one contract or token address. Premortem runs three analytical lenses in parallel: a Contract lens that checks for owner mint functions, missing timelocks, proxy patterns, and blacklist functions; a Market lens that reads holder concentration, recent large wallet movements, and LP depth; and a Supply lens that parses a vesting schedule and models unlock pressure over the next 3, 6, and 12 months.

The output is a single verdict (High Risk, Caution, or Clear) with a headline reason, a 30-second audio brief in a calm and clinical voice that plays immediately, and three drill-down panels with annotation callouts showing the specific evidence behind each lens score.

Every verdict generates a 1200 by 630 share card formatted for X card previews, so the result is natively shareable in one tap.

The supply lens accepts both pasted text and uploaded screenshots of vesting tables, which Premortem parses automatically using Claude Vision.

**Demo video flow (90 seconds):**
1. Open Premortem, show entry state and ghost bento cells (5 seconds)
2. Paste a contract address, select chain, hit RUN ANALYSIS (5 seconds)
3. Show scanning state, bar indicators, scan line active (10 seconds)
4. Show the verdict landing with red left border, High Risk in large serif (5 seconds)
5. Play the first 10 seconds of the audio brief (10 seconds)
6. Pan across the three lens cells showing scores and annotation callouts (15 seconds)
7. Hit SHARE VERDICT, show card generating (5 seconds)
8. Show the completed share card at full size (5 seconds)
9. End on the Premortem wordmark (5 seconds)

Total: approximately 65 seconds, well inside the 90-second limit.

---

## Checklist

- [ ] Premortem deployed to a public HTTPS URL before ASP submission
- [ ] OKX.AI ASP listing submitted and approved before post 1 goes out
- [ ] Full flow tested end to end at least twice before recording the demo
- [ ] Demo video recorded, trimmed to under 90 seconds
- [ ] Post 1 goes out immediately after ASP goes live
- [ ] Post 2 goes out at submission
- [ ] Google form submitted before 17 July 2026, 23:59 UTC with ASP details and X post link
- [ ] X post includes #OKXAI hashtag and demo video attached directly
