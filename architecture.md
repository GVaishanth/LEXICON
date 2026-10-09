# LEXICON VI — Architecture

## 1. Delivery model

This is a static, client-side ES-module application. `index.html` links `css/style.css` and imports `js/app.js` with relative URLs; `app.js` imports the four local data/engine modules. GitHub Pages can serve the repository root or a project subdirectory without rewriting paths or running a build: the repository ships `.nojekyll` (no Jekyll processing) and `.github/workflows/pages.yml`, which uploads the root as-is on every push to `main` when the Pages source is set to *GitHub Actions*. There is no backend, authentication, scoreboard service, or scheduled job.

Gameplay, the bundled word archive, and the Education stories work without network requests. Post-game definitions (`dictionaryapi.dev`), optional Google Fonts, source links, and the browser's native sharing capabilities may use a connection. No request is made to upload play history.

## 2. Files and responsibilities

| File | Responsibility |
| --- | --- |
| `index.html` | Semantic hero, game and Education views; Battle setup and privacy curtain; personal record, settings, help and result dialogs. |
| `css/style.css` | Editorial themes, responsive boards, the handoff barrier, reading-room layout, reduced-motion and Zen treatments. |
| `js/words.js` | Generated arrays for the four-, five-, six-letter and movie archives, plus daily/random word helpers. |
| `js/clues.js` | Gallows clue bank: a riddle prompt for each of 690 five-letter answers; `getClueWord()` opens a round. |
| `js/game.js` | Pure-ish game engines: `Game`, `HangmanGame`, `AnagramGame`, `MarathonGame`, `BattleGame`; evaluation and Hard Mode validation. |
| `js/leaderboard.js` | Local-day normalization, scored-solo grouping, best/recent ordering, day streaks. |
| `js/education.js` | 36 independently edited, sourced histories with offline search and category filtering. |
| `js/app.js` | Single-page view router, DOM creation, settings, feedback, persistence, clock display, definitions, sharing, and the motion layer (entrance timeline, tilt, sliding indicators, text/icon swaps). |
| `js/vendor/gsap.min.js`, `js/vendor/Flip.min.js` | GSAP 3.15 core and Flip plugin, vendored locally and loaded as classic scripts before `app.js`. No CDN dependency; the page works fully offline. |
| `PRODUCT.md` | Audience, purpose and product principles recorded for design decisions. |
| `DESIGN.md` | The *Archival Lexicography & Tactile Folio* system: colour/type/surface tokens and the motion token ladder. |
| `scripts/generate_words.py` | Optional maintenance command that fetches archive sources and rewrites `js/words.js`. Not used by the deployed page. |
| `scripts/verify.mjs` | Dependency-free checks for evaluation, Battle resolution, data shapes and personal-day calculations. Not needed in production. |

## 3. Navigation and session model

`app.js` keeps one view active at a time: **hero**, **game**, or **education**. Education is its own reading view and never instantiates a game. The nine game modes all use the game view. Starting a new entry resets transient state, async definition serials and clocks, closes dialogs, and removes any Battle privacy overlay. Choosing a different destination during an unfinished Battle asks for confirmation. The top island is a **click-driven dropdown**: the ⋯ control (or the title bar) opens the navigation panel, outside click or Escape closes it, and hover never opens it. Inside the panel the mode pills wrap to the panel width, so all nine modes plus Education remain visible on any screen without scrolling sideways. A session entering Zen is latched as unranked even if Zen is turned off before completion.

The hero uses a **fixed illustrative grid with no completed answer row**, evaluated against a word deliberately excluded from the daily answer list. The actual daily answer is never rendered in that preview. Time Machine accepts dates from 2022-01-01 through yesterday; today's calendar cell enters the regular daily game. Daily selection uses a UTC day number derived from the *reader's local year, month and day*, rather than dividing local elapsed milliseconds by 86,400,000; this avoids daylight-saving drift. The same date maps to the same answer from the bundled list. Completed scored daily entries are locked for their local day; Zen can open an unscored practice session instead.

## 4. Game engines

`Game` owns a six-row board, guesses, evaluations, word length and state. It checks a full row, the mode's validity rules, optional Hard Mode constraints, and duplicate-aware tile feedback before accepting a guess. Five-letter word-grid and Battle guesses use the bundled allowed list; the smaller four- and six-letter archives are more permissive with other length-correct guesses. Anagram additionally requires the *same letter multiset* as its shuffled answer. `HangmanGame` is built with its answer and a riddle clue from `js/clues.js`, and the clue stays on screen above the letters for the whole round. Hangman tracks distinct guessed letters and errors. Every submitted word is checked against a prohibited-language list before archive validation: a word outside the archive raises the blue archive notice, prohibited language raises the red notice, and the answer pools are cleaned of prohibited entries at generation time so no round can become unsolvable. Marathon wraps successive four-, five- and six-letter `Game` instances.

Battle creates **two independent `Game('battle', answer)` instances** that share one five-letter answer. Only the active reader's board and keyboard are rendered. Its state machine is:

```text
handoff --Ready--> turn --valid guess--> review --Conceal & pass--> handoff
                                \--second reader's resolving guess--> finished
```

An invalid or incomplete guess stays in the current turn and does not advance the round. The full-viewport, opaque curtain is shown **before** switching readers; the game view is inert underneath. After Ready, the curtain hides and only the receiving reader's board/keyboard are drawn. Turns alternate, at most six per reader. If reader one solves, reader two receives a final attempt in that same round. A sole solver wins; two solvers at the same attempt count are compared by active time, with gaps below one second treated as a draw; two unsolved boards draw.

`BattleGame` uses `performance.now()` while the turn is active and accumulates milliseconds when paused. Review, handoff, hidden tabs and dialogs pause the clock. Zen makes the whole current match untimed; turning Zen off does not re-enable its clock or score it. Match summaries are persisted separately from solo history.

## 5. Education and optional definitions

`js/education.js` exposes categories and text filtering across word, origin, root, story and detail. The 36 stories are static, original editorial summaries with an external Wiktionary link attached to each entry. Selecting a card swaps the feature panel; search/filter changes only the Education view. No education interaction modifies game statistics.

Definitions are separate from Education. After a solved game or match, an optional request to `dictionaryapi.dev` displays part of speech, definition, example and phonetic when available. The request has a timeout, caches successful words in memory, and is guarded against showing an old response after navigation. Unavailable definitions leave the result intact.

## 6. Storage and personal-day ranking

The browser's `localStorage` holds all persistent state. Reads tolerate missing or malformed JSON; writes are guarded for storage-restricted browsers.

| Key | Content |
| --- | --- |
| `lexicon.v1.stats` | Scored solo games played and won, plus mode counts. |
| `lexicon.v1.history` | Bounded solo entries with play timestamp, local play-day key, mode, result and ranking flags. Includes identifiable past-date replays as unranked entries; Zen does not write an entry. |
| `lexicon.v1.daily` | Last completed scored daily entry and its local day, for the daily lock. |
| `lexicon.v1.battles` | Bounded on-device finished scored matches, reader names, outcome and timing; separate from solo games. |
| `lexicon.v1.theme`, `.hard`, `.zen`, `.sound` | Preference values. |

`groupPersonalDays()` ignores unranked, Zen, Time Machine and Battle outcomes. It groups remaining solo history by **local date of play**, not puzzle date, then computes attempts, solves, solved-word-grid average and win rate. `rankPersonalDays()` orders by solves, win rate, average attempts, and recent date; a second tab orders strictly by date. `getDayStreaks()` uses adjacent local day numbers, not consecutive game attempts. The heatmap and history are built from the same on-device data. No other reader's record can enter this ranking.

## 7. Accessibility, motion and practical limits

The interface uses buttons, headings, labels, `aria-pressed` for filters/sorts, visible focus styles, status announcements and keyboard input for guesses. The Battle curtain is a labeled modal-style barrier, with the game, top navigation and footer made inert while it covers the screen, plus keyboard focus contained inside the curtain (the collapsed navigation drawer is `visibility: hidden`, so keyboard focus never enters clipped content). Mobile boards and navigation fit a narrow viewport; the keyboard remains reachable while scrolling.

Motion is layered deliberately, following the token ladder in `DESIGN.md`:

- **CSS transitions** carry every interactive state (press `scale(.96)`, hover, toggles, drawer accordion, modal open/close asymmetry, toast rise, icon and text swaps). Interactive transitions are interruptible by design; keyframes are reserved for one-shot sequences (tile flips, shake, view entrance).
- **GSAP** carries the single authored moment — the hero entrance timeline, run once per page load inside a `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` guard — plus `Flip` re-flow when the Education collection filters, and the width tween of the sliding pill indicators so no layout property sits in a CSS transition.
- **Every animated state keeps a static cue** (colour, label, or icon) so motion is never the only feedback channel.
- **`prefers-reduced-motion`** removes decorative movement, entrance choreography, shake and reveal delays; the CSS media query neutralises transitions while status copy still updates instantly. Zen additionally tones down the palette and hides clocks and statistics.

Privacy here means **visual pass-and-play concealment**, not cryptographic secrecy from someone who can inspect browser internals. Stored names and outcomes remain in that browser until its site data is cleared. Offline Education covers only the 36 written stories, not every word in the generated game dictionary. Archive regeneration needs Python and remote source lists, but ordinary deployment and play do not.
