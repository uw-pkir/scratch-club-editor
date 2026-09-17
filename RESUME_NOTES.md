# scratch-club-editor — project status notes

Read this first if you're picking this project up in a new session or on a different computer.
Then `DEPENDENCIES-AND-CHANGES.md` for the plain-language list of every external service and every
change from stock Scratch, and `QA-COMPLIANCE-REVIEW.md` for the full functional/compliance test
pass. This file covers *status and how to get running again* — those two cover *what exists*.

**Last updated:** 2026-09-17

## What this project is

A self-hosted, de-socialized fork of the [Scratch editor](https://github.com/scratchfoundation/scratch-editor)
for youth coding programs — no accounts, no login, no community/social features, running entirely
in-browser on Chromebooks (or any device). Companion repo
[`scratch-club-assets`](https://github.com/uw-pkir/scratch-club-assets) holds a class's custom
sprite/costume/backdrop/sound library, editable by a teacher through GitHub's plain web UI, no
code required.

Full background on *why* this project exists (the original planning conversation, COPPA/FERPA
reasoning, hosting options considered) lives in the chat history that started this project, not in
a file — if that context is ever needed and unavailable, the short version is: a youth program
wanted Scratch on school Chromebooks without exposing kids to scratch.mit.edu's login/community
features, and without needing IT to approve a new SaaS vendor.

## Where things stand against the plan

| Phase | Status |
|---|---|
| 1 — Build & deploy vanilla | ✅ Done |
| 2 — De-social the shell | ✅ Done (`scratch-club-editor.html`, no account/social UI anywhere) |
| 3 — Network/asset decisions | ✅ Decided (default library stays on Scratch's CDN; Translate/TTS off pending a call — see Open Decisions) |
| 4 — Full extension pass | ✅ Done, expanded into a full custom asset library (multi-costume sprites supported) beyond the original scope |
| 5 — Local save/share workflow | 🟡 In progress — see below, this is the active thread |
| 6 — Device pilot (real Chromebook + real school network) | ⬜ **Not started — the big remaining gate.** Nothing past this should happen before it. |
| 7 — Upstream tracking setup | ✅ Done (`upstream` remote added, small isolated patch set, documented) |
| 8 — Backend (accounts + cloud save) | ⬜ Correctly deferred, gated on Phase 6 |

## Phase 5 in detail — where the active work is

The original ask was "make it easy to get projects into a shared Google Drive folder, with
multiple classes running at once." That turned into an exploration of a few different approaches,
landing here so far:

1. **Ruled out for now:** full Google Drive API + OAuth sign-in flow, and a real class-code
   backend/CMS — both reopen the "no login" principle and are real infrastructure builds. Not
   abandoned forever, just correctly identified as Phase 8-shaped, not Phase 5.
2. **Kept simple:** students still just use the stock "Save to your computer" — unchanged.
3. **Built and verified, two separate prototype tools**, deliberately decoupled from the student
   editor and from each other:
   - `scratch-club-player.html` — proves Scratch's own read-only "player" view can load a project
     hosted somewhere other than Scratch's servers. Confirmed working against a hand-built test
     project. Groundwork for a possible future teacher-moderated gallery (the idea: reuse the
     Show & Tell moderation pattern already running in teacher-studio — Form submission → raw
     sheet → teacher approval checkbox → GitHub Action publish). Not built further than the proof
     of concept.
   - `scratch-club-slideshow.html` — **the one actually working end-to-end as of this session.**
     A teacher pastes a public Google Drive folder link; it lists every `.sb3` in the folder and
     steps through them with Prev/Next, using the same `vm.loadProject()` call "Load from your
     computer" already uses (no re-hosting, no asset-path tricks). Verified today against a real
     folder with 3 real projects, including one using the Face Sensing extension — all loaded and
     ran correctly.

### The one thing still slightly rough

Green Flag does **not** auto-run when a project loads in the slideshow tool (removed deliberately
— calling `vm.greenFlag()` immediately after `vm.loadProject()` resolves raced ahead of some async
asset setup and silently no-opped on two of the three test projects). The teacher clicks the green
flag button themselves for each project now, same as stock "Load from your computer" already
requires. This is a reasonable permanent behavior, not necessarily a bug to chase further — flag
it as a possible future polish item only if it becomes a real annoyance in practice.

### Needed to actually use the slideshow tool

A Google Cloud API key (Drive API enabled, restricted to it). One already exists and is confirmed
working — **it lives only in `.env.local` at the repo root, which is gitignored and was never
committed, by design** (so it doesn't sit in git history). On a fresh clone on any computer, you
need to recreate that file yourself:

```
GOOGLE_DRIVE_API_KEY=<the key>
```

If the key itself isn't available from a password manager or prior note, a new one can be created
in a couple minutes — steps are in `DEPENDENCIES-AND-CHANGES.md` under "Prototype — not committed,
not deployed, needs setup before it works." `.claude/launch.json` already sources `.env.local`
automatically if present when starting the dev server.

## Getting a dev environment running from scratch (new computer)

1. Clone `https://github.com/uw-pkir/scratch-club-editor.git`, checkout `develop` (not `main` —
   `main` doesn't have Face Sensing yet, see below).
2. Install **Node 24.21.0** (exact version, see `.nvmrc`). On Windows without admin rights, the
   portable zip build from nodejs.org works fine — extract it anywhere and add it to your user
   PATH; no installer/admin needed.
3. **Windows only:** `npm run build`/`npm start` scripts use POSIX syntax (`BUILD_TYPE=dev
   webpack`), which breaks under `cmd.exe`. Fix once with:
   `npm config set script-shell "C:\Program Files\Git\bin\bash.exe"` (requires Git for Windows
   already installed, which it usually is).
4. `npm ci` from the repo root (installs the whole monorepo).
5. Recreate `.env.local` (see above) if you'll be testing the Drive slideshow tool.
6. Dev server: `.claude/launch.json` is already configured — starting the `scratch-gui-dev`
   preview runs `npm run start` inside `packages/scratch-gui` on port 8601. Pages:
   - `/scratch-club-editor.html` — the actual student-facing editor
   - `/scratch-club-slideshow.html` — the Drive slideshow tool
   - `/scratch-club-player.html` — the gallery-viewer prototype (hardcoded to a local test path,
     not meant to be used as-is)

## Why `develop`, not `main`

Face Sensing (a headline feature for this project) only exists on scratchfoundation's `develop`
branch, not yet on a numbered `main` release. Confirmed by direct source inspection early in this
project, not assumed. Revisit if it lands on `main` later — could simplify the upstream-tracking
story.

## Open decisions (yours to make, not blocking further build work)

1. **Translate & Text to Speech extensions** — currently greyed out ("Coming Soon"). TurboWarp
   (the largest Scratch fork) proxies Translate through their own server but calls Text to Speech
   directly — a soft signal, not a rule. Your call whether to re-enable either.
2. **Custom asset library propagation delay** — confirmed in testing to sometimes take over an
   hour via jsDelivr's caching, even after using their purge tool. Documented, not fixed. Worth a
   technical fix only if it becomes real classroom friction.
3. **Trademark/branding disclosure** — the QA review recommended a simple one-page disclosure for
   district procurement (this deployment isn't affiliated with/endorsed by the Scratch
   Foundation). Not written yet.
4. **Gallery vs. slideshow** — the teacher-moderated gallery (Show & Tell pattern) is a real,
   scoped-out option if the two-tool split (save locally + separate slideshow) turns out to be too
   much friction in practice. Don't build it speculatively — wait for that signal.

## The actual next step

**Phase 6.** Everything built so far has been tested on a laptop and in a sandboxed preview
browser. None of it has touched a real classroom Chromebook or a real school network/content
filter yet. That's the next real milestone, and per the original plan, nothing in Phase 8 should
start before it.
