# Report: DnD Phase 11 — Docs, specs and release preparation

## Two of the PRD's items were already done

The composed DnD-bound grid for the docs app exists (`apps/docs/shared/DataGridDnd.tsx` with a
per-kit bundle each binding `dnd: adapter`), and the drag page is in `DocPage` and classified in
`PAGE_ENTRIES`. The PRD's worry that a drag options table would need `CreateDataGridOptions` resolved
as a governing type is **moot rather than solved**: the page deliberately has no options table,
because drag adds no option — `dnd` is a `createDataGrid` field documented in prose, like its sibling
`keyboardNavigation`. The worry revives only if someone adds such a table later.

`check-site-url.mjs` covers the install commands by construction: it walks every `.md`/`.mdx` with no
exception list.

## The changesets were the real work

Thirteen changesets written one per phase across eleven phases **all land in one CHANGELOG entry**,
read in sequence by someone who was not here. An audit found **nine** places where they contradicted
each other or described a state that no longer holds — where I had expected two.

The distinction that decided each fix: **stale** versus **historically true but superseded**. A
changeset describing an event that carried an index documents an API this release does not contain —
that is stale and gets rewritten. A changeset explaining why the drag adapter first shipped to every
consumer is the reasoning behind the split that followed — that is superseded, and deleting it would
leave the split looking arbitrary.

Two were **deleted** rather than rewritten, each for a reason worth recording:

- `shadcn-registry-ships-dnd` was merged into `registry-drag-item-split`. A forward pointer would not
  have worked: both are `@ez-kit/docs: minor`, CHANGELOG order is not controllable, and the pointer
  could have printed above the thing it points at.
- `dnd-row-drop-index` described a defect in a surface no release ever carried — a `patch` fixing
  something nobody could have been using, where the thing it fixed ships in the same entry. Its one
  durable fact moved into `dnd-row-drag` as a property of row drag. The resolved bump is unchanged,
  since siblings already take that package to `minor`.

## A claim of mine that was false, and how it was caught

I pushed a caveat into the phase-10 docs, plan, report and **commit message**: that the registry split
helps future installs only, because `shadcn add` has no uninstall and anyone who already ran the old
command is stranded with `@dnd-kit`.

**It is false.** `dnd.tsx` exists in the shadcn kit on neither `origin/main` nor `origin/develop`, and
`main`'s `registry.config.mjs` mentions drag zero times. The adapter has never been in a released
registry build; the changeset announcing it shipping to everyone is still pending in this very
release, beside the split that supersedes it. There is no stranded consumer because there is no
consumer.

I had reasoned from a true mechanism to a consequence I never checked. It was caught by an agent
verifying against `origin/main` instead of accepting the framing in my own instructions, and I
confirmed it myself before acting.

Corrected in four places, with the mechanism kept and the consequence dropped — `shadcn add` really
has no uninstall, and that is precisely why a registry item's dependency list deserves the care it
got; it is now stated as the reason drag became a separate item, so that declining it is a choice made
_before_ anything is installed. `AGENTS.md` carries an explicit retraction quoting the old claim with
its evidence, in the style that file already uses, rather than a silent edit.

**Not corrected:** the commit message of `eb46bc97` still carries the claim. Rewriting published
history was not worth it; this report is where the correction lives.

## Spec coverage, stated honestly

All six drag specs run on **both** kits through the project matrix — no spec is single-kit, and **no
suite is skip-only for either kit**, so drag breaking entirely on one kit fails several suites. The
three skips in the keyboard spec are documented React Aria differences (`Alt+Arrow`, the arrow caret,
the two-`Enter` pick-up), not untested holes, and the keyboard drag itself runs on both.

One gap was closed here: **a keyboard drag of a column had no browser coverage at all** — the keyboard
spec drove rows only, and the header was driven by pointer. Both new cases pass on both kits.

**Known gaps, recorded rather than closed:**

- No browser coverage for a keyboard drag of a **panel row**, or for announcements on the **panel** and
  **virtualized** surfaces.
- `column-panel-drag.spec.ts`'s Escape case **passes vacuously on HeroUI**: it cannot distinguish a
  cancel from the known write-without-`onChange` defect in that kit. That is the appearance of
  coverage, not coverage, and the defect behind it was deliberately left open.

## READMEs

Both kit READMEs said nothing about drag; both now have a section, and the split between them is the
point rather than a duplication: the HeroUI file describes a kit that **ships an adapter**, the shared
react file leads with the fact that it **defines the port** and names no drag library. Each links to
the docs page rather than restating an API, which AGENTS.md requires — a copied API goes stale faster
than anyone updates it.

## Gate results

- `pnpm run ci` (lint → typecheck → test → build → size): **30/30 tasks, exit 0**.
  `@ez-kit/data-grid-react` 1009, core 797, shadcn 130, heroui 146, docs 216.
- Full browser suite, both kits plus the docs project: **1000 passed, 5 skipped, 0 failed**, exit 0,
  on a dev server killed and `.next` / `.source` deleted beforehand.

That run mattered more than a formality here: this phase changed two **shared** spec helpers —
`draggingCount` now watches the column dragging attribute as well as the row one, and `pressAndSettle`
gained an order-reader parameter defaulted to the rows. Both were claimed to be widenings that leave
every existing call site behaving identically, and nothing at unit level can check that. Editing a
shared helper at the end of a long piece of work is a quiet way to move a dozen other assertions; the
suite is what confirms none moved.
