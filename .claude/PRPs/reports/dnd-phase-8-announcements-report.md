# Report: DnD Phase 8 — Announcements + ARIA

## The criterion was already violated, and not by anything we wrote

"No English string literal in the drag path" was met for every string this repo authors: both handles
read the `messages` catalogue, the kits' shells carry only `aria-hidden` on an icon, and neither
kit's `dnd.tsx` contained an `aria-*`, a `title` or a text node.

The violation was imported. `@dnd-kit/dom@0.1.21`'s `Accessibility` plugin sits in
`defaultPreset.plugins`, neither kit passed `plugins`, and it had been writing English into both
kits' DOM since phase 4 — a `role="status" aria-live="polite"` region on `document.body`, a hidden
instructions node wired onto each handle, and `aria-roledescription="draggable"`.

It was also bad on its own terms. The plugin's callbacks receive only `source.id` and `target.id`, so
its best sentence is _"Picked up draggable item 7."_ — a record id. This phase is therefore less about
translation than about taking ownership of announcements that were already being made, badly.

## What shipped

Sentences come from the catalogue's `ordering` group, which its own docblock had reserved for exactly
this. Each key is a **whole sentence** taking named values — never a stem plus a suffix, because word
order differs between languages. Rows and columns have separate keys rather than one key taking a
grid-built name: "row 3" is itself a phrase, and composing it above the catalogue would put an English
fragment back inside a translatable sentence.

The grid builds them, not the kit: only it can turn an id into a column's header or a row's position.
The port carries them as an optional bag in its own vocabulary, so a custom adapter gets them for
free and `DndDropEvent` / `DndDragOverEvent` stayed byte-identical.

## Three defects a review found, all of the same family

Each one was code that **claimed** something it did not do — the failure mode this session kept
meeting.

1. **`messages.ordering.draggable` reached nothing.** No production code read it; the plugin wrote its
   own hardcoded word. Four docs claims and a kit-parity row asserting a divergence were false, and a
   translated dictionary would have been silently ignored. The handles now author the attribute; the
   plugin writes its value only when the attribute is absent, so ours wins where it lands.
2. **The drop sentence named the position the item started from.** The builder read state back after
   the commit, assuming a synchronous re-render the architecture does not promise. Wrong for rows
   uncontrolled, and wrong for **every controlled grid**, where the move leaves through `onChange`.
   The landing is now **derived** from a pickup snapshot rather than observed.
3. **The announcements bag froze after the first render.** The library's plugin registry reuses
   instances keyed by constructor and only assigns `options`, while `Accessibility` reads its options
   solely in the constructor — so the first render's bag was the only one ever used and a runtime
   locale switch kept announcing in the old language. A stable bag whose callbacks read live values at
   call time fixes both that and the memo churn underneath it.

A fourth instance of the same shape was found by asking for it explicitly: **`instructions` cannot be
made live**, because the library builds its hidden text node from the string captured at construction.
That one is documented at the key and at the build site rather than fixed.

## A simplification the fixes earned

Making the position derived removed the reason the adapter committed from the plugin's `dragend`
listener. The machinery built for it — `commitDrop`, a `settled` / `committed` pair, and a gate
scoping the commit to the keyboard — was then carrying a docblock explaining why it was harmless.

The argument for keeping it was that deleting it would make the sentence depend on the plugin's
listener running before the provider's. **That dependence was already there**: the sentence is built
inside the plugin's listener from refs the provider's handler clears, so an inverted order breaks it
with the idempotence in place exactly as without. The pair only ever protected the _commit_.

So it went, the provider commits on every path as it did before the phase, and the order dependence is
now stated with its citation plus what happens if a library version inverts it — the refs are cleared,
the translation refuses, and the drop goes **unannounced**. Silence rather than a sentence naming a
position the item is not in, which is why it is safe to depend on. A test drives the inverted order, so
the degradation is measured rather than asserted, and another asserts the adapter performs no commit
of its own, so a re-introduction fails rather than passing quietly.

## Announced or silent — the rules, and the one case that cannot be closed

- A **refused** drop announces nothing. The predicates the hover was gated on are re-asked at release,
  because the gate ran on an earlier frame and a table that changed mid-gesture can refuse what it
  allowed.
- A **pointer** drag announces nothing. It is already visible to whoever made it.
- Movement is announced as the position the user **settles on**, not every position passed through:
  the library coalesces those announcements, and a region speaking every step of a key repeat would be
  unusable.
- **Not closeable:** a controlled consumer that discards or defers `onChange` leaves the grid unable to
  learn whether anything happened, so the sentence names the intended landing. The old state-read was
  accidentally right there and wrong about every grid that _does_ apply the change — deriving plus the
  refusal gate is strictly better, not better on average.

## Two measured kit differences, neither worked around

- **HeroUI drops `aria-roledescription`** — React Aria's forward allow-list, not the kit's adapter.
  shadcn carries the catalogue's value; HeroUI keeps the library's English. Forcing it would need an
  imperative `ref` write in a slot every button in the kit renders. Pinned by tests in both kits that
  cite each other, so it reads as measured rather than as an oversight.
- A **second dependency** now ships to shadcn registry consumers: `@dnd-kit/dom`, because the plugin
  classes live only there and `@dnd-kit/react` re-exports just the manager and two sensors, and pnpm's
  isolated layout makes a transitive dependency unresolvable undeclared. It downloads nothing new. The
  optionality guarantee held for free — `tree-shaking.test.ts` matches the `@dnd-kit` scope prefix
  rather than a package name.

## Honest limit

**No screen reader was run.** What is verified is that the right sentence reaches a correctly shaped
live region at the right moment, in both kits, across repeated runs. Whether it _reads well_ through
NVDA or VoiceOver is unverified, and the browser spec's own docblock says so. The PRD asks for "a
manual check of a full keyboard drag"; that check did not happen and this report does not claim it.

One spec case is weaker than it looks and says so: `ordering.draggable` defaults to the same word the
library writes, so in the default locale an identical attribute is equally consistent with the
catalogue being applied and with it being ignored. A unit test with an **overridden** dictionary is
what actually covers that path.

## Found, not fixed

`ordering: { column: false }` does not refuse a column drop — `canDropColumn` is a pure core helper
over the leaf list and never consults the feature config. Unreachable today, since no handle renders
and no drag can start, and `GridDndProvider`'s commit path has the identical blind spot. Pre-existing
rather than introduced here, so it is recorded rather than changed mid-phase.

## Gate results

Measured on the finished tree, not taken from a sub-task's report.

- `pnpm run ci` (lint → typecheck → test → build → size): **30/30 tasks, exit 0**.
  `@ez-kit/data-grid-react` 1009, core 797, shadcn 130, heroui 146, docs 211.
- `@ez-kit/data-grid-react` under React 18: **1009/1009**.
- Full browser suite, both kits plus the docs project: **996 passed, 5 skipped, 0 failed**, exit 0,
  on a dev server killed and `.next` / `.source` deleted beforehand.
- Budgets after the phase: `dist/dnd.js` **1681 B / 2 kB** in both kits — it _shrank_ when the commit
  machinery went, from 1727 B with the gate and 1711 B before it. Core `index` 12.54 / 14.4 kB,
  react `index` 31.21 / 35.5 kB.

The browser suite is what retired the one thing neither a review nor an implementer could settle by
reading: removing the adapter's commit returns every drop to the library's own
`trackRendering` → `startTransition` path, and whether that changes the `Feedback` drop animation was
unverifiable without a browser. Thirty-five ordering specs pass on the changed commit path.

## What this phase taught, beyond its own scope

**All three HIGHs were the same shape: code asserting something about itself that it did not do.** A
message key no production code read, under four documentation claims saying it worked. A position
read back from state that had not updated, under a docblock saying "by then the commit has landed". A
bag frozen after the first render, under a docblock calling its memoisation "a correctness
requirement". None of them could be caught by types, tests or the build — each was internally
consistent and lied only outward.

The question that found them is worth reusing: not "are there bugs" but **"find everything that is
configured once, read once, and assumed live."** That phrasing produced a fourth instance nobody had
looked for — the instructions text, frozen at mount by the library's own construction — which would
otherwise have surfaced as a translator's bug report.

The second reusable move is the one that deleted machinery rather than adding it. When the fix made
the drop position derived, the commit-ordering apparatus kept working but stopped being needed. The
argument for keeping it was a dependence it supposedly prevented — and that dependence turned out to
exist either way, because the pair protected the commit and never the sentence. **Asking what a
mechanism actually buys, rather than whether it still works, is what made the simplification
visible.**
