# External Services & Editor Changes

A plain-language, non-technical tracker of two things:

1. **Every outside service this project depends on** — what it's for, what happens if it goes
   down, and how serious that would be.
2. **Every way this editor has been changed from stock Scratch** — so it's always clear what's
   custom versus what comes straight from the Scratch Foundation.

This file covers both this repo (`scratch-club-editor`) and its companion asset repo,
[`scratch-club-assets`](https://github.com/uw-pkir/scratch-club-assets). It's kept up to date as
work continues — if something here looks stale, ask for it to be refreshed.

**Last updated:** 2026-09-17

## The short version

- **No student accounts, logins, or personal data are collected or sent anywhere.** Nothing in
  this app asks a kid to sign in, and no project or personal information is uploaded to any
  server we run — projects save as files, the same way a Word document would.
- Every network request this app makes on its own (i.e., not counting a browser's own extension
  loader from the Scratch Foundation, which teachers can independently audit) goes to one of the
  three outside services listed below — all of them are read-only, anonymous, and none of them
  require a login.
- Everywhere below marked **Fails gracefully** means: if that service is slow or unreachable, that
  one feature quietly doesn't work, but the rest of the editor keeps working normally — nothing
  crashes or blocks the whole app.

## External services this depends on

| Service | What it's for | If it goes down | Risk |
|---|---|---|---|
| **GitHub Pages** (github.com) | Hosts the actual editor website once deployed for real. | The whole site becomes unreachable until GitHub is back. This is the exact same hosting teacher-studio already uses, so it's a familiar risk, not a new one. | Same as any GitHub-hosted site — GitHub's uptime has historically been very reliable, but it is a single point of failure for the site being reachable at all. |
| **jsDelivr** (`cdn.jsdelivr.net`, `data.jsdelivr.com`) | A free, public content-delivery network (like the infrastructure Netflix uses to stream video quickly). We use it to serve the class's custom sprite/costume/backdrop/sound library from `scratch-club-assets` without every student's browser hitting GitHub directly, which has stricter usage limits. | The custom sprite/costume/backdrop/sound library (see below) doesn't show up. Everything else in the editor — the built-in Scratch library, saving, all other extensions — is unaffected. **Fails gracefully.** | Low. jsDelivr is a large, well-established, free service used by a huge number of websites. Changing to serve these files ourselves instead is possible later if this ever becomes a concern. |
| **Scratch Foundation's own asset servers** (`cdn.assets.scratch.mit.edu`) | Serves the thumbnails and files for Scratch's *built-in* sprite/costume/backdrop/sound library (the stock art that ships with every version of Scratch). We decided to keep using Scratch's own copy rather than hosting a mirror ourselves, to keep things simple (see "Choices we made" below). | The built-in Scratch art library's thumbnails/files fail to load. Custom class art (via jsDelivr, above), a student's own uploaded images/sounds, and everything else keep working. **Fails gracefully**, though a broken-looking built-in library would be a noticeable, confusing problem for a class if it happened. | Low-to-moderate. This is Scratch's own production infrastructure serving scratch.mit.edu itself, so it's about as reliable as Scratch's own website being up. |

### Currently turned off, but worth knowing about if re-enabled

| Service | What it's for | Status |
|---|---|---|
| `translate-service.scratch.mit.edu` | Powers the **Translate** extension block. | **Disabled** (greyed out as "Coming Soon" in the editor) pending a decision on whether it's appropriate for a non-scratch.mit.edu deployment to call this Scratch Foundation server directly. Scratch's Terms of Use don't explicitly forbid it, but Scratch's own biggest fork (TurboWarp) avoids calling this specific one directly, routing it through their own server instead — so we're being cautious until that's reviewed. |
| `synthesis-service.scratch.mit.edu` | Powers the **Text to Speech** extension block. | **Disabled**, same reason. Unlike Translate, TurboWarp does call this one directly without apparent issue, which is a point in favor of turning it back on — still pending your review. |

If either gets turned back on, using that extension in a project would send the typed text (no
name, no account, nothing else identifying) to that Scratch Foundation server to get a
translation or spoken-audio result back — the same request a project on the real scratch.mit.edu
would make.

## Choices we made (not exactly "risks," but worth knowing)

- **Kept the built-in Scratch art library pointed at Scratch's own servers** instead of copying
  it to our own hosting. Simpler to set up and maintain, at the cost of the small dependency
  above. Revisit if a fully offline/walled-off deployment ever becomes a hard requirement.
- **Custom class library changes aren't instant — and can be slow.** Because of how jsDelivr
  caches things, a newly-added sprite/costume/sound can take a while to actually appear for
  students. In testing on 2026-09-17, a new file took **over an hour** to show up, even after
  using jsDelivr's own "purge" tool. Plan additions at least a day ahead of when a class needs
  them, not the same morning. Full details in `scratch-club-assets`'s own README, and in
  `QA-COMPLIANCE-REVIEW.md`'s issue #1.

## Changes made from stock Scratch (this repo)

Everything below is additive — new files, or small, isolated edits — rather than rewrites of
Scratch's own code, specifically so future updates from the Scratch Foundation stay easy to pull
in. See `AGENTS.md`'s "npm workflow" section for the technical mechanics.

| Change | What it does | Why |
|---|---|---|
| New page: `scratch-club-editor.html` | A version of the editor with no account/login menu, no Share button, no "My Stuff," no community links. Saving/loading works through the normal file menu (Save/Load to your computer) instead of a server account. | This is the actual point of the project — no logins or social features for the school's concerns. |
| Translate & Text to Speech extensions | Greyed out / shown as "Coming Soon," can't be added to a project. | Pending your call on the question above. |
| Logo swap | The Scratch cat wordmark (top left) is replaced with a plain, neutral geometric mark. Done via a webpack "alias" that swaps the image file, without editing Scratch's own menu bar code at all — so this can't create a merge conflict when pulling in future Scratch updates, at most a future Scratch rename of that exact file would need the alias path updated (a build error you'd notice immediately, not a silent break). One known small gap: the button's screen-reader label still says "Scratch" internally, since that text is hardcoded in Scratch's own file rather than tied to the image — left as-is to keep this a genuine no-touch change. | You asked to remove Scratch branding, since this deployment isn't affiliated with or endorsed by the Scratch Foundation. |
| Custom asset library (`custom-asset-library.js`) | On startup, the editor fetches your class's sprite/costume/backdrop/sound files from `scratch-club-assets` (via jsDelivr, see above) and adds them into the normal "Choose a Sprite/Costume/Backdrop/Sound" pickers, alongside Scratch's own built-in art. | So you can add your own class art without editing any code — see that repo's README. |
| Added dependency: `js-md5` | A small, standard library used only to generate internal ID numbers for custom assets. Does not make any network requests itself. | Required by how Scratch's own project format validates data — technical detail, not user-facing. |
| `.claude/launch.json` | Local development configuration (how to preview the site on this machine). Not part of the deployed site. | Developer convenience only. |

## Changes made from a blank repo (`scratch-club-assets`)

This repo didn't exist before this project — everything in it is new, by design (see its own
README for the "how to add a file" instructions). Structurally:

| Folder | What it's for |
|---|---|
| `costumes/`, `backdrops/`, `sprites/`, `sounds/` | Drop image/audio files here (via GitHub's website) and they show up in the editor automatically — see that repo's README for exact steps. |

No server, database, or account system was added anywhere — this is a small, plain file
repository. The only thing that makes it "active" is the `custom-asset-library.js` code (above)
fetching from it.
