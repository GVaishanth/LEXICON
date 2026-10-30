# LEXICON — The Word Archive VI

An editorial collection of nine word games and a **separate Education reading room**. It runs as a static website: no account, backend, build step, or game-service dependency. The personal record stays in the browser on the device where you play.

## Design and motion

The interface uses the iOS 27 Celosia-style gradient themes (Teal and Ink by default, with Panther, Blue and Slate also selectable), concentric radii, shadow-as-border elevation, and a restrained motion system. The full design and motion notes are in [architecture.md](architecture.md#7-accessibility-motion-and-practical-limits).

Motion follows four public craft systems, implemented by hand with no build step:

| Source | What was applied |
| --- | --- |
| [Impeccable](https://impeccable.style/) | Slop refusals (no eyebrow chips, no pulsing status dots, no Inter-default or cream-by-reflex palette, no gradient text), AA-verified tile colours, browser-surface theming (selection, caret, scrollbar, focus rings), and `text-wrap: balance/pretty`. |
| [transitions.dev](https://transitions.dev/) | The motion token ladder (`--duration-quick/fast/medium`, `--ease-smooth-out`) plus authored recipes: icon swap, text-state swap, modal open/close, error shake, sliding pill tabs, 3D tilt plate, grid-rows accordion, asymmetric toast, and opening-chevron hover. Every recipe keeps a static cue alongside the animation and respects `prefers-reduced-motion`. |
| [GSAP skills](https://github.com/greensock/gsap-skills) | One authored hero entrance via `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`, timeline sequencing, `Flip` for Education collection re-flow, and `gsap.to` width tweening for pill indicators. GSAP ships as two vendored files in `js/vendor/`; the site loads it locally with no CDN. |
| [make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better) | Concentric border radii, shadow-as-border tokens, `scale(.96)` press feedback, interruptible CSS transitions, `font-variant-numeric: tabular-nums` on counters and clocks, `currentColor` SVG icons, and 44px touch targets. |

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

There is nothing to install or build for the website. The workflow uploads the checked-in files as they are.

## The collection

| Area | What it does |
| --- | --- |
| Daily Dispatch | One deterministic five-letter answer for each local calendar date; a completed scored daily entry is locked for that date. |
| Time Machine | Replay an earlier daily date without changing the scored daily record or the personal-day ranking. |
| Concise / Classic / Extended | Four-, five-, and six-letter boards; six attempts each. |
| Cinematic Archive | Guess a film title from its year and clue. |
| Gallows | Letter-by-letter Hangman; every round opens with a riddle clue for the word. |
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

- `js/words.js` contains the generated, bundled archive: 2,495 four-letter entries; 20,207 allowed five-letter guesses, including 5,747 possible answers; 4,999 six-letter entries; and 112 film titles. The archive-generation sources are common-word headword lists (supplied as local files to the script), [Wordle allowed words](https://github.com/tabatkins/wordle-list), [SGB five-letter words](https://github.com/charlesreid1/five-letter-words), and [dwyl English words](https://github.com/dwyl/english-words).
- `js/education.js` is a **separately edited collection of 36 stories**, not a story for every game word. The Open Shelf reshuffles them on every visit and features a different one each time. Each entry links to its Wiktionary source and is readable without a connection. The source links themselves need a connection.
- Education search shows ranked suggestion cards as you type. Matches are ranked by match type (exact, starts with, close spelling, contains), then by word length and your own earlier lookups. See [architecture.md](architecture.md#5-education-and-dictionary).
- `data/dictionary.txt` holds all 370,054 alphabetic words from [dwyl/english-words](https://github.com/dwyl/english-words) (Unlicense). A small version file lets the browser download the list again only when it changes..
- Definitions and pronunciation come from the [Free Dictionary API](https://dictionaryapi.dev/), which is based on Wiktionary (CC BY-SA). Looked-up entries are cached in the browser. If offline or unavailable, gameplay and Education still work. Google Fonts are optional; local fallback fonts are defined in CSS.

To regenerate `js/words.js` from the source lists, Python and `requests` are required **only for that optional maintenance step**:

```bash
python3 -m pip install requests
python3 scripts/generate_words.py
```

To regenerate the dictionary word list (standard library only):

```bash
python3 scripts/generate_dictionary.py
```

## Repository layout

```text
index.html                      Views, game controls, handoff screen, and dialogs
css/style.css                   Design tokens, motion recipes, boards, reading room, responsive and Zen styles
js/app.js                       Routing, rendering, interactions, motion layer, storage, sharing
js/game.js                      Word-grid, Hangman, Anagram, Marathon and Battle engines
js/words.js                     Generated word and movie archive
js/clues.js                     Gallows riddle clue bank
js/leaderboard.js               Local-day grouping, ordering and streak calculations
js/education.js                 36 offline sourced histories and filtering
js/dictionary.js                Dictionary lookup, ranked suggestions, ghost completion
js/store.js                     IndexedDB storage (word list, definitions, search history)
js/vendor/                      GSAP 3.15 core and Flip plugin, with GSAP licence
data/dictionary.txt             370,054 words, fetched once and stored in IndexedDB
data/dictionary-version.txt     Version of the word list
sw.js                           Service worker (offline shell)
manifest.webmanifest, icons/    Web app manifest and icons
scripts/generate_words.py       Optional archive regeneration
scripts/generate_dictionary.py  Optional dictionary regeneration
.github/workflows/pages.yml     GitHub Pages deployment
architecture.md                 Flow, storage and component notes
readme.md                       This file
```

## Licences and attribution

- Word list: [dwyl/english-words](https://github.com/dwyl/english-words), Unlicense.
- Definitions: [Free Dictionary API](https://dictionaryapi.dev/), based on Wiktionary, CC BY-SA 4.0.
- GSAP and Flip: GreenSock Standard "No Charge" licence, included in `js/vendor/LICENSE.txt`.

The website needs no Node.js, Python, external packages, or connection after its static files are served. It uses browser `localStorage` and IndexedDB; private modes that disallow storage can still play but may not retain progress. See [architecture.md](architecture.md) for the exact state transitions and storage keys.
