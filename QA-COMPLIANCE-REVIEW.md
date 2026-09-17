# QA & Compliance Review

A full test pass through the editor as it stands today, written up the way a district technology
administrator would want to see it: what works, what's broken, and anything that could raise a
privacy, legal, or school-policy question before this goes anywhere near a classroom.

**Reviewed:** 2026-09-17, against commit `a22662e06a` on the `develop` branch.
**How this was tested:** live, in a real running build (not just reading code) — clicking through
the actual editor, inspecting real network traffic, downloading and validating a real saved
project file, and reading the console for errors. Two things could **not** be tested this way and
are called out explicitly below: real Chromebook hardware, and a real school network/content
filter. Both still need a hands-on check before rollout.

## Bottom line

Nothing found here is a "stop the project" problem. No accounts, no tracking, no cookies, no
COPPA-triggering data collection. The real issues are: **one clearly-broken piece worth fixing**
(the custom asset library shows up unreliably, sometimes for a long time), a few **rough edges**
worth knowing about, and a handful of **paperwork/procurement items** — things a district would
likely ask for regardless of how safe the tool actually is, because "ask for it anyway" is how
school IT departments operate.

## Functional test results

| Feature | Status | Notes |
|---|---|---|
| Page loads, no console errors | ✅ Pass | Only pre-existing, dev-only React warnings (invisible in the real production build — see below). |
| No account/login/Share/community UI anywhere | ✅ Pass | Confirmed with targeted searches across the whole page — none present. |
| Scratch logo (top left) | ✅ Pass | Does nothing when clicked — does **not** send anyone to scratch.mit.edu. |
| Settings menu | ✅ Pass | Only Language/Theme/Color Mode — no legal links, no account options. |
| Save to your computer | ✅ Pass | Verified the downloaded file is a genuinely valid `.sb3` (a real zip archive containing `project.json`, costumes, and sounds) — not just "a download happened." |
| Load from your computer | ⚠️ Not directly testable here | This automated testing tool can't drive a real operating-system file picker. This is completely unmodified, stock Scratch code we never touched, used by millions of people daily, so risk is low — but worth one manual click-test on a real computer for full confidence. |
| Face Sensing extension | ✅ Pass | Already confirmed working on your own laptop earlier, including the camera. |
| Video Sensing, Music, Pen extensions | ✅ Pass | Stock, unmodified, no external network calls. |
| Translate & Text to Speech | ✅ Pass | Correctly greyed out with a "Coming Soon" badge; clicking does nothing. |
| Custom sprite/costume/backdrop library | ✅ Pass, with a caveat | All three confirmed working end-to-end, including a real multi-costume sprite. See the propagation-delay issue below — this is the one real bug. |
| Custom sound library | ⚠️ Untested | No example sound file exists yet in `scratch-club-assets/sounds` to test against. Same code path as costumes/backdrops, so low risk, but not actually verified. |
| No cookies | ✅ Pass | Checked directly — none set. |
| No analytics/tracking scripts | ✅ Pass | Checked the page's HTML, build config, and startup code — nothing present. |
| Browser storage used | ✅ Pass, minor | Only one harmless internal logging-library setting is stored locally. No personal data. |
| Real Chromebook hardware | ⏳ Still pending | Phase 6 of the original plan — not yet done. |
| Real school network / content filter | ⏳ Still pending | Nobody has tried this from behind an actual district firewall yet. |

## Issues found

### 1. Custom asset library can take a long time to update (real bug, worth fixing)

The library that lets you add your own sprites/costumes/backdrops/sounds depends on a caching
service (jsDelivr) to avoid overloading GitHub. In testing today, a newly-added file took **over
an hour** to actually show up — notably longer than the "usually a minute or two" originally
written in that repo's README, which has since been corrected there. This is a real limitation of
the free service being used, not something a code fix alone can guarantee against.

**Practical impact:** a teacher adding a sprite the morning of class could easily have it not show
up all period. **Recommendation:** treat any addition as "ready by the next class," not "ready
today," until/unless a faster delivery method is worth building. Happy to look at that if this
becomes a real pain point.

### 2. No loading indicator for the custom library specifically

If a student opens "Choose a Sprite" within the first several seconds of the page loading, the
custom class library may not have arrived yet (no spinner or message says "still loading" for
this specific piece) — they'd need to close and reopen the picker. Minor, but worth knowing.

### 3. A few dev-only console warnings

All pre-existing in Scratch's own code (not something this project introduced), and all invisible
in the real deployed site — React strips these automatically outside of local development. One
warning did reference our new `dynamicBackdrops` data specifically; it's cosmetic (backdrops
render correctly) and looks like a latent, harmless quirk in a Scratch component that nobody had
ever actually fed real data into before. Not blocking.

### 4. Minor keyboard accessibility gap

Pressing Escape doesn't close the sprite/costume/extension picker windows — you have to click
"Back." This is inherited from stock Scratch, not something introduced here, but it's a real
accessibility rough edge worth being aware of (see the broader accessibility note below).

## Privacy law (COPPA and friends)

**COPPA** (the federal law governing children's data online) restricts collecting personal
information from kids under 13 without parental consent. Checked directly, not just assumed:

- No accounts, no sign-up, no name/email/birthdate collected — there's nothing to collect it
  *with*.
- No cookies set (verified directly).
- No analytics or tracking scripts anywhere in the code or the page (verified directly).
- The one thing worth a second look: **Face Sensing and Video Sensing use the camera.** I traced
  this in the actual source code, not just Scratch's own claims about it — the video is processed
  entirely on the student's own device and never sent anywhere. Nothing is uploaded, stored, or
  transmitted. Under COPPA, a service generally isn't "collecting" data it never actually
  receives, which is the same reasoning that lets things like Snapchat filters or Zoom virtual
  backgrounds work without extra consent flows. Low risk, but this is the one feature I'd expect a
  privacy-minded parent or reviewer to ask about first, so it's worth being ready to explain.
- Locally saved projects (`.sb3` files) and the one harmless browser-storage entry noted above
  never leave the student's device — they're not "collected" by anyone.

**FERPA** (student education records): not applicable — there are no student records, grades, or
identifiable school data involved anywhere in this system.

**State student data privacy laws:** many states have their own version of this (built on a model
sometimes called SOPIPA), and — separately from what the law technically requires — a lot of
districts have a *process* requirement: every tool, regardless of actual risk, has to go through a
formal review and sometimes a signed data privacy agreement before a teacher can use it with
students. Because this isn't a company with a legal entity behind it, that paperwork doesn't exist
yet. **Recommendation:** a simple one-page "what data this collects" document (this file plus
`DEPENDENCIES-AND-CHANGES.md` are most of the raw material for that) would smooth this over with
most districts, even though the honest technical answer is "none."

## Other things a district reviewer would likely flag

- **Accessibility (ADA / Section 508).** Scratch's drag-and-drop block editor has known,
  long-standing accessibility limitations for screen-reader and keyboard-only users — this is true
  of the *official* scratch.mit.edu too, not something this project made worse. Recent federal
  rules (2024) require public schools' web content to meet WCAG 2.1 AA by set deadlines. Districts
  already tolerate this for the real Scratch site, so there's precedent, but a strict reviewer
  could still raise it.
- **"Scratch" branding.** This still uses Scratch's name and logo throughout (unchanged from the
  original code) but isn't affiliated with or endorsed by the Scratch Foundation. Worth
  clarifying that distinction to anyone reviewing this formally — either with a short disclosure,
  or a light rebrand (the same thing TurboWarp, the most well-known Scratch fork, does) before
  wider rollout.
- **No single sign-on (Clever/ClassLink/Google Workspace).** Some districts have a blanket
  requirement that any classroom tool integrate with their identity system, regardless of whether
  the tool actually needs accounts. Having *no* login is a genuine privacy positive, but could
  still trip a procurement checklist that assumes every tool has one.
- **Network/content filter allowlisting.** A district's web filter may need to explicitly allow
  the domains this depends on — see `DEPENDENCIES-AND-CHANGES.md` for the full list. Most of
  these (GitHub, a major CDN) are broadly permitted by default at most schools, but this is worth
  confirming with IT before a class depends on it, not after.
- **Single points of failure.** Already documented in `DEPENDENCIES-AND-CHANGES.md` — worth a
  read alongside this file, since "what happens if X goes down" is exactly what that file answers.

## Things a teacher will likely run into

- **No safety net if a student forgets to save.** There's no account/cloud save, so a closed tab
  or crashed browser without a recent "Save to your computer" means lost work — same tradeoff
  as any file-based tool (Word, etc.), but worth explicitly telling kids about up front.
- **Custom library additions aren't instant** (see issue #1 above) — plan ahead of class time.
- **Shared devices.** If two students use the same Chromebook profile back-to-back without one of
  them saving/clearing first, project mix-ups are possible — worth a simple classroom-management
  habit (save with your name in the title) rather than a technical fix.
- **Translate/Text to Speech are currently off.** A teacher following an outside Scratch tutorial
  that uses either of those blocks will find them greyed out — worth a heads-up until that's
  resolved.
- **Not yet tested on the actual classroom hardware or network.** Everything above was verified
  in a controlled test environment on a capable computer. The real test — an actual Chromebook, on
  the actual school wifi/filter — is still outstanding.
