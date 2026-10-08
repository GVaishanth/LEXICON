# LEXICON — The Word Archive VI

An editorial collection of nine word games and a **separate Education reading room**. It runs as a static website: no account, backend, build step, or game-service dependency. The personal record stays in the browser on the device where you play.

## Design & motion system

The interface is authored against two in-repo design documents:

- **`DESIGN.md`** — the *Archival Lexicography & Tactile Folio* system: colour tokens with contrast ratios, the four-family type system (Albert Sans, Playfair Display, Source Serif 4, JetBrains Mono), concentric radii, and shadow-versus-border elevation rules.
- **`PRODUCT.md`** — audience, purpose, and the four product principles the design must honour.

Motion follows four public craft systems, implemented by hand with no build step:

| Source | What was applied |
| --- | --- |
| [Impeccable](https://impeccable.style/) | Slop refusals (no eyebrow chips, no pulsing status dots, no Inter-default or cream-by-reflex palette, no gradient text), AA-verified tile colours, browser-surface theming (selection, caret, scrollbar, focus rings), `text-wrap: balance/pretty`, and a detector-clean build. |
| [transitions.dev](https://transitions.dev/) | The motion token ladder (`--duration-quick/fast/medium`, `--ease-smooth-out`) plus authored recipes: icon swap (p5), text-state swap (p6), modal open/close (p7), error shake (p12), sliding pill tabs (p16), 3D tilt plate (p19), grid-rows accordion (p21), asymmetric toast (p22), opening-chevron hover (p24). Every recipe keeps a static cue alongside the animation and guards `prefers-reduced-motion`. |
| [GSAP skills](https://github.com/greensock/gsap-skills) | A single authored hero rehearsal via `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`, timeline sequencing with position parameters, `Flip` for Education collection re-flow, and `gsap.to` width tweening for pill indicators (no layout properties in CSS transitions). GSAP ships as two vendored files in `js/vendor/`; the site loads it locally with no CDN. |
| [make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better) | Concentric border radii, shadow-as-border elevation tokens, `scale(.96)` press feedback on every control, interruptible CSS transitions over keyframes for interactive states, `font-variant-numeric: tabular-nums` on all counters and clocks, icon strokes matched to text weight, `currentColor` SVG icons, and 44px touch targets. |

To confirm the build stays detector-clean (optional, requires the Impeccable CLI):

```bash
npx impeccable detect index.html css/style.css js/app.js
```

## Open or publish

Serve the repository root with any static file server so that ES modules load correctly:

```bash
python3 -m http.server 8000
# Open http://localhost:8000/
```

## Deploying to GitHub Pages

Every app asset uses a relative path (`./css/…`, `./js/…`), so a project-site subpath also works and no configuration is required. The repository ships with `.nojekyll` so GitHub serves the files byte-for-byte instead of running Jekyll over them. Choose one of the two sources:

**Option A — GitHub Actions (recommended).** The workflow in `.github/workflows/pages.yml` publishes the repository root on every push to `main`:

1. Push the repository to GitHub (branch `main`).
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The first run publishes the site; the job summary links to `https://<user>.github.io/<repo>/`.

**Option B — Branch publishing.** In **Settings → Pages → Source: Deploy from a branch**, pick `main` / `root (/)`. Because `.nojekyll` is present, no Jekyll processing occurs.

Either way, do not upload generated package folders; there are no packages to install for the website. The `Deploy to GitHub Pages` workflow in Option A performs no build — it uploads the checked-in files as-is.

## The collection

| Area | What it does |
| --- | --- |
| Daily Dispatch | One deterministic five-letter answer for each local calendar date; a completed scored daily entry is locked for that date. |
| Time Machine | Replay an earlier daily date without changing the scored daily record or the personal-day ranking. |
| Concise / Classic / Extended | Four-, five-, and six-letter boards; six attempts each. |
| Cinematic Archive | Guess a film title from its year and clue. |
| Gallows | Letter-by-letter Hangman. |
| Marathon | Solve four-, five-, and six-letter stages in sequence. |
| Anagram | Unscramble the letters of a five-letter word in up to six attempts. |
| Battle | Local two-reader, one-device match on a shared five-letter answer. |
| Education | Independent, searchable offline reading room with 36 curated word histories and a source link for every entry; no board or score. |

### Battle: pass, review, conceal

Enter two different reader names and start a match. Each reader has an **independent board and keyboard**, but both solve the **same answer**. A reader makes one valid guess, reviews only their own feedback, then presses **Conceal & pass**. The opaque handoff screen covers the game until the next reader presses **Ready**. Both readers receive the same number of turns if the first reader solves; each has at most six guesses. A solve beats an unsolved board. If both solve in the same round, the shorter **active-turn time** wins when it differs by at least one second; otherwise the result is a draw. The clock stops during handoff, review, open dialogs, and backgrounded tabs.

A finished scored match is stored only in the separate **Matches on this device** history. It does **not** affect solo statistics, streaks, or the personal-day ranking. Leaving an unfinished match discards it.

### Personal leaderboard by day

Open **Personal record** in the top navigation. **Your days** groups completed, scored solo games by the *local day on which they were played*, not by puzzle date. Sort by **Best days** (most solves, then win rate, then average attempts on solved word-grid games) or **Recent days**. Past-date replays, Zen entries, and Battle matches are excluded. There are no shared rankings, URLs, accounts, or score uploads. Clearing browser storage removes this device's record.

### Zen Mode

Enable Zen in **Settings** for calmer colours, no match clock, and unscored play. Zen hides the statistics entry point and in-game statistics. A scored Daily Dispatch already completed that day can be replayed as an unscored Zen practice entry. Turning Zen off during an entry does **not** retroactively score it; a match that becomes untimed remains untimed. Start a new entry with Zen off to resume scored play.

## Word and story data

- `js/words.js` contains the generated, bundled archive: 2,500 four-letter entries; 20,220 allowed five-letter guesses, including 5,759 possible answers; 5,000 six-letter entries; and 112 film titles. The archive-generation sources are [Oxford 3000/5000 lists](https://github.com/ittuann/The-Oxford-5000-Word-Lists), [Wordle allowed words](https://github.com/tabatkins/wordle-list), [SGB five-letter words](https://github.com/charlesreid1/five-letter-words), and [dwyl English words](https://github.com/dwyl/english-words).
- `js/education.js` is a **separately edited collection of 36 stories**, not a story for every game word. Each entry links to its Wiktionary source and is readable without a connection. The source links themselves need a connection.
- Optional post-game definitions use [Free Dictionary API](https://dictionaryapi.dev/). If offline or unavailable, gameplay and Education still work. Google Fonts are optional; local fallback fonts are defined in CSS.

To regenerate `js/words.js` from the source lists, Python and `requests` are required **only for that optional maintenance step**:

```bash
python3 -m pip install requests
python3 scripts/generate_words.py
```

## Project map

```text
index.html                 Three views, game controls, handoff screen, and dialogs
css/style.css              Design tokens, motion recipes, boards, reading room, responsive and Zen styles
js/app.js                  Routing, rendering, interactions, motion layer, date logic, storage, sharing
js/game.js                 Word-grid, Hangman, Anagram, Marathon, Battle engines
js/leaderboard.js          Pure local-day grouping, ordering, and streak calculations
js/education.js            36 offline sourced histories and filtering
js/words.js                Pre-generated word and movie archive
js/vendor/gsap.min.js      GSAP 3.15 core, vendored locally (motion timelines)
js/vendor/Flip.min.js      GSAP Flip plugin, vendored locally (layout re-flow)
scripts/generate_words.py  Optional archive regeneration
scripts/verify.mjs         Engine and local-record invariant checks
PRODUCT.md                 Audience, purpose, and product principles
DESIGN.md                  Colour, type, surface, and motion tokens
architecture.md            Detailed flow and persistence notes
```

To check the engine and day-ranking invariants from the repository root, use Node.js 20+:

```bash
node --experimental-default-type=module scripts/verify.mjs
```

The website itself needs no Node.js, Python, external packages, or connection after its static files are served. It uses browser `localStorage`; private modes that disallow storage can still play but may not retain progress. See [architecture.md](architecture.md) for the exact state transitions and storage keys.
