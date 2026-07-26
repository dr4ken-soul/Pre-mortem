# FRONTEND_SPEC.md — Premortem

Full frontend specification. Every decision here was confirmed directly with Paul across the design gate process. Nothing in this file is an assumption.

## 0. Assets in this folder

This spec is handed off alongside the following reference images. Read all four before writing any component. They are in the reference-images/ folder alongside this file.

- **comp-1-entry-state.png** — the full entry state: ghost bento cells, contract address input field, RUN ANALYSIS button, corner markers, footer strip, system status IDLE
- **comp-2-scanning-state.png** — the active scanning state: address visible in top cell, bar indicators in lens cells, bright scan line, ANALYZING label and progress sweep, SYSTEM STATUS SCANNING
- **comp-3-results-state.png** — fully populated results state: red verdict border, High Risk in Fraunces, scores in lens cells, annotation callouts, audio player, share button, SYSTEM STATUS COMPLETE
- **comp-4-share-card.png** — the 1200 by 630 share card: red left border, verdict headline, three lens rows with separator lines, wordmark and timestamp

Match layout, cell proportions, border treatment, annotation callout style, score typography weight, corner marker positions, footer strip format, and system status indicator from these images. Where the images and this spec conflict, this spec takes precedence.

## 1. Design tokens — Forensic Slate

```css
:root {
  --bg-primary: #090b0f;
  --bg-secondary: #10131a;
  --bg-elevated: #161a24;

  --system-steel: #4a6fa5;
  --system-steel-dim: rgba(74, 111, 165, 0.22);
  --system-steel-faint: rgba(74, 111, 165, 0.09);
  --system-steel-bright: rgba(74, 111, 165, 0.75);

  --text-primary: #dde3ec;
  --text-secondary: #7a8499;
  --text-muted: #3d4558;

  --border-subtle: rgba(255, 255, 255, 0.04);
  --border-default: rgba(255, 255, 255, 0.06);

  --verdict-risk: #ef4444;
  --verdict-caution: #eab308;
  --verdict-clear: #22c55e;

  --verdict-risk-dim: rgba(239, 68, 68, 0.12);
  --verdict-caution-dim: rgba(234, 179, 8, 0.10);
  --verdict-clear-dim: rgba(34, 197, 94, 0.10);
}
```

No hardcoded hex values inside any component file. Every colour reference pulls from these variables.

## 2. Typography

Display: **Fraunces** — used in one place only: the verdict headline in the results state and the wordmark in both the nav and the share card. Weight 300, italic, optical size variable. Import via Google Fonts.

Body: **Barlow** — all running copy, lens descriptions, button text, finding sentences, descriptor text. Weights 300, 400, 500, 600. Import via Google Fonts.

Data and system: **Space Mono** — every address, score number, system label, annotation callout value, status indicator, node label, footer content, tag label. Weight 400 and 700. Import via Google Fonts.

Do not substitute any of these three fonts. Do not use Inter, Roboto, or any system font in a display role.

## 3. Spacing and grid base unit

8px base unit throughout. All padding, gap, and margin values are multiples of 8px. Radius is 0 across the entire product. This is a schematic, not a card-based UI. No border-radius anywhere.

## 4. Navigation strip — C1

Fixed full-width strip at the top of the viewport. Height: 40px. Background: rgba(9, 11, 15, 0.95) with backdrop-blur of 8px. Border-bottom: 1px solid var(--border-subtle).

Three elements inside the strip:

**Left — wordmark.** The plain typographic string "premortem" set in Fraunces, weight 300, font-size 14px, letter-spacing 0.04em, var(--text-primary). No icon, no mark, no symbol attached. This is the only place Fraunces appears at this weight without italic. Navigation wordmark is an intentional exception to the italic-only rule for Fraunces.

**Right — system status indicator.** Two lines stacked, right-aligned. First line: "SYSTEM STATUS" in Space Mono, 7px, letter-spacing 0.18em, var(--text-muted). Second line: the current status value (IDLE, SCANNING, or COMPLETE) in Space Mono, 9px, letter-spacing 0.14em, var(--system-steel), followed immediately by a small dot element. The dot is 6px wide, 6px tall, border-radius 50%, inline with the status text, background var(--system-steel). On IDLE state the dot is at 40% opacity. On SCANNING state the dot pulses using a CSS keyframe animation between 60% and 100% opacity on a 1.2-second ease-in-out loop. On COMPLETE state the dot is steady at 80% opacity.

The system status value is driven by a Zustand store. The three valid states are idle, scanning, and complete.

## 5. Background treatment

Two layers. Both are fixed position, full viewport, pointer-events none, z-index 0.

**Dot grid layer.** CSS background-image using radial-gradient: `radial-gradient(rgba(74, 111, 165, 0.10) 1px, transparent 1px)`. Background-size: 20px 20px. This aligns to the 8px base unit in a way that creates a blueprint graph-paper feel without being too dense. Never change this opacity above 0.12 as it will compete with cell content.

**Scan line layer.** A single div fixed to the viewport, left 0, right 0, height 1px (idle) or 2px (scanning). Background is a horizontal linear-gradient: `linear-gradient(90deg, transparent 0%, var(--system-steel-dim) 25%, var(--system-steel) 50%, var(--system-steel-dim) 75%, transparent 100%)`.

Idle state: 1px height, --system-steel-dim for the peak, animation duration 9 seconds linear infinite, top animating from 0 to 100vh.

Scanning state: 2px height, --system-steel-bright for the peak, box-shadow `0 0 12px rgba(74, 111, 165, 0.45)`, animation duration 2.4 seconds linear infinite. The class toggle `.scan-active` on the scan line element switches between the two states.

State transition: when analysis starts, add `.scan-active` to the scan line element immediately. When the verdict event arrives from SSE, remove `.scan-active`.

## 6. Corner markers and outer frame

**Screen corner markers.** Four fixed-position elements at the four corners of the viewport. Each marker is a bracket-style crosshair composed of two thin lines (CSS border, 1px solid var(--system-steel-faint), 12px long each, L-shaped). Top-left marker carries the label "L1" in Space Mono, 7px, var(--system-steel-faint), positioned 4px inside the bracket. Top-right carries "L2". Bottom-left carries "L3". Bottom-right has no text label. These are decorative only, pointer-events none, z-index 0.

**Grid outer frame.** A positioned div that wraps the entire bento grid area. Border: 1px dashed var(--system-steel-faint). At each of its four corners, a small "+" character in Space Mono, 8px, var(--system-steel-faint), positioned absolutely at the inner face of the corner. This outer frame is inset from the viewport edge by the grid padding (20px). It does not have a background. It is a visual container layer only.

## 7. Footer strip

Fixed full-width strip at the bottom of the viewport. Height: 28px. Border-top: 1px solid var(--border-subtle). Background: rgba(9, 11, 15, 0.95). Display: flex, align-items: center, justify-content: center. Content is a single line in Space Mono, 7px, var(--text-muted), letter-spacing 0.14em.

Content string (pipe-separated): `SYSTEM PREMORTEM v1.0.0 | ENV PRODUCTION | LAYER XLAYER BASE | TIME [live UTC]`

The TIME segment updates every second using a JavaScript interval that formats the current UTC time as HH:MM:SS followed by "UTC". On entry state the time portion shows "--:--:-- UTC" until the interface has confirmed connectivity.

## 8. Bento grid layout

The bento grid sits between the nav strip (40px) and the footer strip (28px). Padding on all sides: 20px, except top and bottom which are 12px. The overall grid container uses CSS Grid with the following exact definition:

```css
.bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 200px;
  grid-template-rows: 152px 1fr 64px;
  gap: 8px;
  height: calc(100vh - 40px - 28px - 24px);
  padding: 12px 20px;
}
```

Cell placement:

- Input cell (entry state) / Verdict cell (results state): `grid-column: 1 / -1; grid-row: 1`
- Contract lens cell: `grid-column: 1; grid-row: 2 / 4`
- Market lens cell: `grid-column: 2; grid-row: 2 / 4`
- Supply lens cell: `grid-column: 3; grid-row: 2 / 4`
- Audio brief cell: `grid-column: 4; grid-row: 2`
- Share verdict cell: `grid-column: 4; grid-row: 3`

The three lens cells each span rows 2 and 3. The utility column splits into audio on top and share on bottom. Nothing in this grid placement changes between states. The top cell content changes, the lens cells populate, but the grid positions are identical across all three states.

## 9. Entry state — input cell

The input cell occupies the full-width top row. Border: 1px solid var(--system-steel-dim). Background: var(--bg-secondary). Padding: 20px 24px. Internal layout: flexbox, row direction, align-items center, gap 28px.

**Left column (flex: 1):**

Tag label: "ANALYSIS INPUT — CONTRACT OR TOKEN ADDRESS" in Space Mono, 7px, letter-spacing 0.22em, var(--system-steel). Margin-bottom 8px.

Descriptor text: "Paste any contract or token address. Premortem runs all three lenses in parallel and returns a single verdict." in Barlow, 11px, weight 300, line-height 1.6, var(--text-secondary). Margin-bottom 14px.

Contract address field: full-width input element, background var(--bg-primary), border 1px solid var(--system-steel-faint), padding 9px 14px, Space Mono 10px, var(--text-muted), letter-spacing 0.03em, placeholder text "0x — paste contract or token address". On focus, border changes to 1px solid var(--system-steel-dim). No border-radius.

Supply data expander: below the address field, margin-top 10px, a single line reading "VESTING SCHEDULE — optional, add for supply analysis" in Space Mono, 7px, var(--text-muted), letter-spacing 0.16em. A "+" character in var(--system-steel) at the end. Clicking this line expands a textarea below it using a motion/react animate presence with a height transition. The textarea is Space Mono, 10px, var(--text-muted), background var(--bg-primary), border 1px solid var(--system-steel-faint), padding 8px 12px, 4 rows tall, placeholder "Paste vesting table text here, or upload a screenshot below". Below the textarea, a file upload zone: dashed border 1px var(--system-steel-faint), padding 10px, Barlow 10px var(--text-muted) reading "Drop vesting schedule screenshot here or click to upload". Accept: image/png, image/jpeg, image/webp.

**Right column (flex-shrink: 0):**

Chain selector: two buttons side by side (XLAYER and BASE), Space Mono 8px, letter-spacing 0.14em. Selected chain: background var(--system-steel), var(--text-primary). Unselected: background transparent, border 1px solid var(--system-steel-faint), var(--text-muted). Margin-bottom 10px. Default selection: XLAYER.

RUN ANALYSIS button: Barlow, 11px, weight 600, letter-spacing 0.1em, text-transform uppercase, var(--text-primary), background var(--system-steel), no border, no radius, padding 11px 22px. Hover state via CSS class: background lightens slightly. Disabled state when address field is empty.

Verdict hint: below the button, the italic string "verdict will appear here" in Fraunces, weight 300, 10px, var(--text-muted). This element disappears when the results state begins.

## 10. Entry state — ghost lens cells

Three equal cells occupying the lower grid area. Each cell: background var(--bg-secondary), border 1px dashed var(--system-steel-faint). Padding: 15px 16px.

Inside each ghost cell:

Corner annotation marker: absolute positioned, top-right corner. Contract cell: "L1" in Space Mono 6px var(--system-steel-faint). Market cell: "L2". Supply cell: "L3".

Lens tag: the lens name in Space Mono, 7px, letter-spacing 0.2em, text-transform uppercase, var(--text-muted). "CONTRACT LENS", "MARKET LENS", "SUPPLY LENS".

Score placeholder: the string "- -" in Space Mono, 30px, color rgba(61, 69, 88, 0.55). This is a placeholder string, not an em dash.

Below the score placeholder: three skeleton bars stacked. Each bar is a div with height 5px, background var(--bg-elevated), using a shimmer CSS animation. Widths: 78%, 60%, 40%. A second group of two bars below, widths 68% and 60%, with margin-top 6px.

Bottom status strip: flush to the bottom of the cell, border-top 1px solid var(--border-subtle), padding 6px 0 0, Space Mono 6px var(--text-muted), letter-spacing 0.14em. Contract cell reads: "NODE CT-LENS-00 | STATUS IDLE | FEED --". Market cell reads: "NODE MK-LENS-00 | STATUS IDLE | FEED --". Supply cell reads: "NODE SP-LENS-00 | STATUS IDLE | FEED --".

## 11. Entry state — ghost utility cells

Audio brief cell: background var(--bg-secondary), border 1px dashed rgba(74, 111, 165, 0.12). Flex column, align-items center, justify-content center, gap 8px. Contains a ghost circle (28px, border 1px solid var(--system-steel-faint)), below it the label "AUDIO BRIEF" in Space Mono 6px var(--text-muted). Bottom status strip same format: "NODE ABR-00 | STATUS IDLE".

Share verdict cell: same border treatment. Flex column, align-items center, justify-content center. Contains the string "SHARE VERDICT" in Space Mono 7px var(--text-muted), letter-spacing 0.18em. Below it a ghost circle same as above. Bottom status strip: "NODE SHR-00 | STATUS IDLE".

## 12. Scanning state — input cell transformation

When the user submits, the input cell content transitions. The address field, descriptor, and supply expander fade out using motion/react animate presence. In their place:

Tag label changes to "ANALYZING — CONTRACT ADDRESS" in Space Mono 7px var(--system-steel).

Contract address displays in Space Mono 12px var(--text-primary), full string, no truncation, background var(--bg-primary), border 1px solid rgba(74, 111, 165, 0.3), padding 9px 14px.

Progress sweep: full-width div, height 1px, background var(--bg-elevated), relative positioned. An absolutely positioned inner div, width 60%, height 100%, background linear-gradient(90deg, transparent, var(--system-steel), transparent), animating left from -60% to 100% on a 2-second ease-in-out infinite loop.

Status row: flex row, gap 10px, align-items center. A small pulsing dot (6px, var(--system-steel), border-radius 50%, CSS pulse animation). Space Mono string "RUNNING ALL THREE LENSES IN PARALLEL" in 9px var(--system-steel), letter-spacing 0.14em.

The RUN ANALYSIS button is replaced with a static non-interactive label "ANALYZING" in Space Mono 10px var(--text-muted). The chain selector and verdict hint are hidden. The supply data content is hidden.

The input cell border changes from var(--system-steel-dim) to rgba(74, 111, 165, 0.42) on scanning state.

## 13. Scanning state — lens cells

As each SSE lens_complete event arrives, that lens cell transitions to its results view using motion/react. While a lens is still scanning, the cell is in scanning state:

Border changes from dashed to solid, color rgba(74, 111, 165, 0.28).

Lens tag appends "— SCANNING" so it reads "CONTRACT LENS — SCANNING" in var(--system-steel).

The score placeholder is replaced by an animated bar group. Six vertical bars, each 3px wide, border-radius 1px. The bars animate height independently using staggered CSS keyframes, creating an audio-spectrum scanning effect. Bar heights cycle between 8px and 24px. Background rgba(74, 111, 165, 0.35) on idle, animating to rgba(74, 111, 165, 0.65) at peak.

Below the bars: the skeleton shimmer bars remain, using the active shimmer animation (moving gradient from right to left).

Bottom status strip updates: "NODE CT-LENS-00 | STATUS SCANNING | FEED LIVE".

## 14. Results state — verdict cell

When the verdict SSE event arrives, the top cell transforms into the verdict cell using motion/react. The entire cell content fades out and the verdict cell content fades in. The cell border changes to: top 1px solid var(--border-default), right 1px solid var(--border-default), bottom 1px solid var(--border-default), left 4px solid [verdict colour variable]. The left border colour is the one expressive moment of verdict-specific colour in the top cell. The cell background remains var(--bg-secondary). No background fill change.

Left side of verdict cell content:

Verdict tag: "VERDICT" in Space Mono 7px var(--system-steel) letter-spacing 0.22em, margin-bottom 6px.

Verdict headline: the verdict string ("High Risk", "Caution", or "Clear") rendered in Fraunces, weight 300, italic, font-size 40px, var(--text-primary), line-height 1. This is the only place Fraunces italic appears in the product. It enters with a blur-to-focus reveal via motion/react: `initial={{ filter: 'blur(8px)', opacity: 0 }}` to `animate={{ filter: 'blur(0px)', opacity: 1 }}` over 0.6 seconds.

Token address: full address string in Space Mono 9px var(--text-secondary), letter-spacing 0.04em, margin-top 8px.

Right side of verdict cell content (flex-shrink 0, text-align right):

"RECOMMENDATION" label in Space Mono 7px var(--text-muted) letter-spacing 0.18em, margin-bottom 4px.

Recommendation string in Space Mono 11px letter-spacing 0.06em, colour matching the verdict: var(--verdict-risk) for "Do not trade", var(--verdict-caution) for "Trade with caution", var(--verdict-clear) for "Clear to trade".

## 15. Results state — populated lens cells

When a lens_complete SSE event arrives for a lens, that cell transitions from scanning state to results state via motion/react `animate={{ opacity: [0, 1] }}` over 0.3 seconds.

Cell border reverts to solid 1px var(--border-default) (no longer dashed, no longer scanning-bright).

Lens tag returns to its base form without "— SCANNING".

Score number: the final score renders in Space Mono, font-size 36px, font-weight 700, line-height 1, margin 4px 0 8px. The colour is determined by the score value: 0 to 25 is var(--verdict-clear), 26 to 60 is var(--verdict-caution), 61 to 100 is var(--verdict-risk). The score counts up from 0 to its final value over 0.8 seconds using motion/react. This count-up is the one expressive motion moment in the lens cells.

Finding sentence: one to two lines of Barlow, 11px, weight 300, line-height 1.5, var(--text-secondary). This is the human-readable summary of the lens's primary finding.

Annotation callouts: two to four callout rows below the finding sentence. Each callout row is a flex container, align-items centre, gap 0. From left to right: a small circle element (6px wide, 6px tall, border-radius 50%, background matching the score colour at 70% opacity), a long horizontal line (flex: 1, height 1px, background var(--border-default)), a value label in Space Mono 7px var(--text-muted) letter-spacing 0.12em. Each callout row represents one specific data finding (for example: "OWNER MINT" with value "true", "TIMELOCK" with value "none", "PROXY" with value "upgradeable"). There is a key label to the left of the circle in Space Mono 7px var(--text-muted) with flex-shrink 0, margin-right 6px.

The full callout row structure from left to right: [KEY LABEL] [●] [——————] [VALUE]

Bottom status strip updates: "NODE CT-LENS-00 | STATUS COMPLETE | FEED LIVE".

If the supply lens received no data from the user, the supply cell shows: lens tag "SUPPLY LENS", no score, and a centred message in Barlow 10px var(--text-muted) reading "Add a vesting schedule to complete supply analysis." A small Space Mono 7px link below reads "PASTE TEXT OR UPLOAD IMAGE" in var(--system-steel). Clicking it expands a compact inline input within the Supply cell.

## 16. Results state — audio cell

When the audio_ready SSE event arrives, the audio cell populates.

Circular play button: 36px wide, 36px tall, border 1px solid rgba(74, 111, 165, 0.35), background transparent. Inside: a standard play triangle using CSS borders, colour var(--text-secondary). Hover class brightens the border to rgba(74, 111, 165, 0.6) and the triangle to var(--text-primary). When clicked, plays the MP3 via the HTML Audio API. While playing, the play button shows a pause icon (two vertical rects, 3px wide, 10px tall, 4px gap). On completion, resets to play icon.

Waveform display: a row of 12 vertical bars to the right of the play button. Each bar is 2px wide, border-radius 1px, background rgba(74, 111, 165, 0.35). Bar heights are statically set to produce a natural waveform shape (not uniform). While audio is playing, bars animate height using staggered CSS keyframes matching the scanning bar animation. On pause or idle, bars are static.

Duration label: "0:30" in Space Mono 9px var(--text-secondary), below the play button and waveform row.

Label: "AUDIO BRIEF" in Space Mono 6px var(--text-muted) letter-spacing 0.17em, at the bottom.

Bottom status strip updates: "NODE ABR-00 | STATUS READY".

## 17. Results state — share cell

When the card_ready SSE event arrives, the share cell activates.

Content: a single button, full-width, height 40px, background transparent, border 1px solid rgba(255, 255, 255, 0.1), Barlow 10px weight 600 letter-spacing 0.1em text-transform uppercase var(--text-primary), reading "SHARE VERDICT". Hover class: border-color rgba(255, 255, 255, 0.2), var(--text-primary).

When clicked, the share card PNG at /api/card/:address/:chainId opens in a new tab. No custom share modal needed for the MVP.

Below the button, in Space Mono 6px var(--text-muted): "OPENS IMAGE FOR SHARING ON X".

Bottom status strip updates: "NODE SHR-00 | STATUS READY".

## 18. Share card specification

The share card is a React component rendered by Satori to PNG at exactly 1200 by 630 pixels. It must load Fraunces, Barlow, and Space Mono as arrayBuffer font data before rendering. The card does not use Tailwind, it uses inline styles only (Satori requirement).

Card container: width 1200, height 630, background #090b0f, border-left 5px solid #ef4444 (or #eab308 or #22c55e depending on verdict), position relative. Fine dot matrix pattern simulated via a repeated SVG pattern background.

Card is divided into three horizontal zones with flexDirection column:

**Top strip (height 40px):** padding 0 32px, display flex, justifyContent space-between, alignItems centre, borderBottom `1px solid rgba(255, 255, 255, 0.06)`. Left: chain label in Space Mono 9px #4a6fa5 letter-spacing 0.2em text-transform uppercase. Right: shortened token address in Space Mono 9px #7a8499.

**Middle zone (flex: 1):** padding 28px 32px 20px. Contains: "VERDICT" in Space Mono 8px #4a6fa5 letter-spacing 0.24em text-transform uppercase, margin-bottom 8px. Verdict headline in Fraunces italic weight 300, font-size 64px, color #dde3ec, line-height 1. Single line finding summary below in Barlow weight 300, font-size 13px, color #7a8499, margin-top 8px. This is the headlineReason string from the reasoning call.

**Bottom zone:** padding 16px 32px 0. Three horizontal data rows, each with borderTop `1px solid rgba(255, 255, 255, 0.05)`, padding `10px 0`, display flex, alignItems baseline, gap 16px. Row structure: lens label (Space Mono 8px #3d4558 letter-spacing 0.16em text-transform uppercase, width 140px flex-shrink 0), score number (Space Mono 15px font-weight 700, colour based on score value), finding text (Barlow weight 300, font-size 11px, #7a8499, flex 1).

Footer row below the three data rows: padding-top 12px, display flex, justifyContent space-between. Left: "premortem" in Fraunces weight 300, font-size 12px, #3d4558. Right: timestamp string formatted as "YYYY-MM-DD HH:MM UTC" in Space Mono 8px #3d4558.

## 19. Component patterns

**Borders over fills.** Interior cells use border lines, not box shadows or filled card surfaces. The only background variation is between --bg-primary, --bg-secondary, and --bg-elevated. No drop shadows anywhere in the product.

**Hover states are CSS class based.** No inline onMouseEnter or onMouseLeave handlers. Button hover states use a `.is-hovered` class applied via the Tailwind `hover:` prefix or a CSS selector. Never React event handlers for visual hover effects.

**Skeleton shimmer.** All loading states use a CSS shimmer: `background: linear-gradient(90deg, var(--bg-elevated) 25%, rgba(74, 111, 165, 0.06) 50%, var(--bg-elevated) 75%); background-size: 200% 100%; animation: shimmer 1.8s infinite linear`. The scanning bar animation is separate from skeleton shimmer and is not used in non-scanning contexts.

**No spinners anywhere.** No circular loading indicator appears at any point in the product.

**Chain selector.** The two-button chain selector in the input cell uses background-color transition 150ms ease for the selected state change. No animation library is needed here.

## 20. Animation specification

All motion via motion/react. No framer-motion imports. No exceptions.

Background dot grid and scan line: pure CSS only. No JavaScript animation library involved.

Scan line state change (idle to scanning): `.scan-active` CSS class toggle. Transition of animation-duration property is not reliable; use CSS custom property `--scan-duration` and update it via JavaScript when toggling state.

Ghost cell skeleton shimmer: pure CSS keyframe animation.

Entry to scanning state — input cell content transition: motion/react AnimatePresence wrapping the two content variants. Exit: opacity 0 over 0.2 seconds. Enter: opacity 1, translateY from 4px to 0 over 0.3 seconds.

Scanning to results state — lens cell population: when a lens_complete event arrives, the cell content transitions in using `initial={{ opacity: 0, y: 6 }}` to `animate={{ opacity: 1, y: 0 }}` with a 0.3-second ease transition.

Lens cells stagger: if multiple lens events arrive close together, stagger their entrance with a 0.08-second delay per cell from left to right (Contract first, Market second, Supply third).

Score count-up: using motion/react useMotionValue and useTransform or a simple animate utility counting from 0 to the final score value over 0.8 seconds with an easeOut curve.

Verdict headline reveal: `initial={{ filter: 'blur(8px)', opacity: 0 }}` to `animate={{ filter: 'blur(0px)', opacity: 1 }}` over 0.6 seconds, ease out. Fires after the score animations have started.

Verdict cell left border colour: CSS transition on border-left-color, 0.4 seconds ease. Starts as var(--border-default) and transitions to the verdict colour when the verdict renders.

Audio and share cell entrance: same staggered fade and translateY as lens cells, entering after the lens cells have completed their animation, with a 0.12-second delay.

Scroll-triggered entrance on mobile: when viewport is narrowed to a single-column stack, cells below the fold enter with `initial={{ opacity: 0, y: 12 }}` to `animate={{ opacity: 1, y: 0 }}` on intersection observer trigger via motion/react whileInView.

No page transition animations. Premortem is a single URL with no route changes. The state machine is: idle, scanning, results. These are controlled via Zustand store, not router transitions.
