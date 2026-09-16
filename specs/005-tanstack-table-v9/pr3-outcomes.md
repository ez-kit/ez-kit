# PR 3 outcomes — what the pinning carve-out left for PRs 4-6

Sibling of `pr1-outcomes.md` and `pr2-outcomes.md`, written to the same purpose: PR 4, PR 5 and
PR 6 should be able to start from this document plus the tree, without re-deriving anything PR 3
already measured.

**Commits** (branch `integration/tanstack-v9`, still local — nothing pushed, no PR opened):

| SHA        | Subject                                                                     |
| ---------- | --------------------------------------------------------------------------- |
| `08a65de8` | `feat(data-grid-react)!: rename the column-pinning vocabulary to start/end` |
| `39c8dee3` | `feat(data-grid-shadcn,data-grid-heroui)!: key the pin icons by start/end`  |
| `8b057fcd` | `feat(…)!: make the column-pin DOM contract logical`                        |
| `45e9748e` | `test(docs): cover column pinning under RTL`                                |
| `d58d0aea` | `docs(docs): keep the dead pin-variable spelling out of the guard's prose`  |

No changeset was written (PR 6 writes one for the whole migration). AGENTS.md is untouched.

---

## 0. The gates, as measured after `d58d0aea`

Run individually with `pnpm --filter <pkg> <gate>`. **Nothing red below is column pinning.**

| Package                    | typecheck                | lint                | test                                       | build     |
| -------------------------- | ------------------------ | ------------------- | ------------------------------------------ | --------- |
| `@ez-kit/data-grid-react`  | **82 errors** (was 99)   | **green**           | **726/726** (was 721/4)                    | **fails** |
| `@ez-kit/data-grid-shadcn` | **1 error** (was 3)      | 1 error (cascade)   | **40/40**                                  | **green** |
| `@ez-kit/data-grid-heroui` | **2 errors** (unchanged) | 16 errors (cascade) | 45/50                                      | **green** |
| `@ez-kit/docs`             | 150 errors (PR 4's)      | —                   | vitest green on the pinning-relevant files | —         |

`pnpm --filter @ez-kit/docs registry:build` **succeeds**, and the payload it writes carries
`PinStart` / `PinEnd` and `--dg-pin-start-shadow` / `--dg-pin-end-shadow` and none of the old names.

### 0.1 The criterion PR 3 was given cannot be met, and why

The brief's criterion was "`@ez-kit/data-grid-react` green on typecheck, lint, test and build; both
kits green on the same four". Two of those eight are unreachable from the pinning rename, and this
was flagged to the team lead before any code was written rather than discovered at the end.

- **`data-grid-react` typecheck / build.** `pr2-outcomes.md` §2.2 already recorded it: 17 of the
  package's 99 typecheck errors were pinning, and 82 are a second, unrelated family — generic
  variance at the widest instantiation under `exactOptionalPropertyTypes`, plus test harnesses
  missing `features`. PR 3 cleared **exactly the 17** and the count is now **exactly 82**, which is
  the cleanest evidence available that the two sets were disjoint. `build`'s `dts` half still fails,
  in `data-grid.tsx`, on a member of that family. `pr3-recon.md` §3's claim that its Task 2 "makes
  the react package go green" was a derivation made before `tsc` was ever run; §2.1a of
  `pr2-outcomes.md` corrects it, and the measurement above confirms the correction.
  **Nobody owns the 82.** They are not PR 3's, they are not PR 4's (docs) and they are not PR 5's
  (kits). They need a row.
- **The kits' typecheck / lint / test.** shadcn carries 1 typecheck error and heroui 2, all in the
  kits' own `index.test.ts(x)`: `createTable<User>` and `TableState` need the v9 `TFeatures`
  parameter and a `features` option. Every lint error in both kits is `no-unsafe-*` firing on the
  error-typed values those produce, and heroui's 5 test failures are the same cause at runtime.
  This is the kits' v9 migration, i.e. **PR 5's**, and `specs/005-tanstack-table-v9/pr5-recon.md`
  exists. PR 3 did not take it: doing so would have been a second migration inside a rename.
  shadcn went 3 → 1 because two of its three were the vendored `'left' | 'right'` prop type, which
  is PR 3's.

---

## 1. What PR 3 delivered

All five dead name sets are gone from code. `rg` over `packages/` and `apps/`, excluding
CHANGELOGs and `dist/`, returns **nothing** for any of:

1. `ColumnPinSide.Left` / `.Right`
2. `GridMenuIcon.PinLeft` / `.PinRight`
3. `messages.columnMenu.pinLeft` / `.pinRight`
4. `ColumnActionId.PinLeft` / `.PinRight` **and** their `'pin-left'` / `'pin-right'` values
5. `--dg-pin-left` / `--dg-pin-right`, `--dg-pin-left-shadow` / `--dg-pin-right-shadow`,
   `data-pinned='left'|'right'`, `data-pin-shadow='left'|'right'`

The sixth surface — `columnPinning: { left, right }` — survives only in `.mdx`; see §3.

### 1.1 Decisions taken, which must not be re-litigated

**a. `ColumnActionId`'s string values were renamed, not just its members** (trap T4).
`'pin-left'` / `'pin-right'` → `'pin-start'` / `'pin-end'`. Leaving them would have made `PinStart`
the only member on that object whose value contradicts its key, beside `MoveStart: 'move-start'`
two lines below. It is a consumer break and it is named in §4.

**b. The pin-shadow offsets went fully logical, and the measurement flipped with them** (trap T3).
Three answers were defensible; this is the one taken and the reason.

`measurePinnedEdges` reads `getBoundingClientRect`, which is in **viewport** coordinates and
therefore physical, while `data-pin-shadow='start'` is logical. Keeping the inline style physical
while the attribute went logical would have been coherent only by accident: under RTL the
start-pinned block sits on the right, so `edges.left` would have been measured from the wrong
block. The function now takes the grid's direction (`table.grid.direction`, the same read
`header-cell.tsx` uses for keyboard reordering) and returns `{ start, end }` — distances from the
overlay's own inline edges — which are applied as `insetInlineStart` / `insetInlineEnd`.
`data-attrs.test.tsx`'s four `style.left` / `style.right` expectations moved to
`style.insetInlineStart` / `style.insetInlineEnd` with it.

`updateScrollShadows` got the same treatment for the same reason: `scrollLeft` is signed under RTL
(0 at the inline-start edge, running negative towards the end), so both booleans are now computed
from `Math.abs(scrollLeft)` and read "scrolled away from the inline-start edge" / "not yet at the
inline-end one" in either direction.

**c. `box-shadow` has no logical form, so each kit restates the offset's sign under `[dir='rtl']`.**
`inset 10px` / `inset -10px` say which physical side of the 16px strip hugs the pinned block, and
that flips. Two extra rules per kit. `[dir='rtl']` rather than `:dir(rtl)` because the attribute is
what an RTL app sets anyway and it reaches a consumer's older browsers; the descendant form matches
whether `dir` sits on `<html>` or on a wrapper.

**d. The grid's `direction` option still does not reach the DOM, and PR 3 did not make it.**
`direction: 'rtl'` tells the grid which way it is laid out; it does not lay the page out. The RTL
example therefore sets **both** `dir='rtl'` on a wrapping `div` and `direction='rtl'` on the grid.
Making `<DataGrid>` stamp `dir` itself is a real option and arguably the right one — it would make
`inset-inline-*` resolve without the app's help — but it is a behaviour addition, not a rename, and
it belongs in a decision of its own.

**e. `shadcn/src/components/ui/table.tsx` was edited in place** (trap T5). Its
`pinned?: 'left' | 'right' | false` is a hand-written literal that does not follow `ColumnPinSide`
— HeroUI's does, through `ThProps` / `TdProps` → `react/src/types.ts` — so the rename could not
reach it any other way. Moving a two-token prop type into a `blocks/` wrapper would restructure a
registry payload file to no end. Justified in `8b057fcd`'s message, per AGENTS.md.

**f. Row pinning was not renamed.** `data-pinned='top'|'bottom'`, `top:` / `bottom:` in
`global.css`, `--dg-row-pin-offset`. A vertical axis has no logical names. A note to that effect is
now in `global.css` beside the column rules so the next reader does not "unify" them; AGENTS.md's
own rule is PR 6's to rewrite.

**g. The English default labels stay `'Pin Left'` / `'Pin Right'`, and the kits' glyphs stay
`ArrowLeft` / `ArrowRight`.** The key names the axis, the wording names what an LTR reader sees —
the `moveStart: 'Move left'` / `MoveStart → ChevronLeft` convention, already established.

### 1.2 New coverage, and why it exists

**`apps/docs/test/css-custom-properties.test.ts`** (helper in `css-custom-properties/dg-vars.ts`)
— the answer to trap T1. It collects every `--dg-*` custom property the three data-grid React
packages' JavaScript writes as a string literal, every one their stylesheets read through `var()`,
and every one those stylesheets declare, then asserts in **both** directions: nothing written that
nothing reads, nothing read that nothing sets. Failures report `file:line`.

It exists because this is the one contract in the repo with no type behind it and a fallback on
every reader: `style.setProperty('--dg-pin-start-shadow', …)` takes a `string`, and
`var(--dg-pin-start-shadow, 0)` renders `0` forever if the name stops matching. Two writers, four
readers across two kits, no type error, no unit failure, and — as `pr3-recon.md` §5 established —
no browser spec addresses `data-pin-shadow` at all. **Verified by mutation**: renaming one of
heroui's two readers back to the old spelling fails the second case with
`packages/data-grid/react/heroui/src/styles.css:180  var(--dg-pin-right-shadow)`.

It is modelled on `e2e-slots.test.ts` and reuses its `stripComments` scanner, so a docblock naming
a variable is not counted as reading it. Today it covers 9 written names and 15 read sites. What it
cannot see: a property assembled at runtime, and a consumer's own stylesheet.

**`data-attrs.test.tsx` — `writes the pin-shadow opacity variables onto the table wrapper`.** The
source-literal guard above needs a live writer behind it; this asserts the wrapper actually carries
both names. jsdom lays nothing out so both read `'0'` — the value is not the point, the name is.

**`apps/docs/e2e/packages/data-grid/pinning/rtl-columns.spec.ts`** + the `column-pinning-rtl`
example. See §2 for its status.

---

## 2. The one thing PR 3 could not verify: the browser suite

**No docs example renders on this tree, pinning or otherwise.** Measured, not inferred, against a
dev server on this worktree:

1. Every example throws `TypeError: header.column.getCanResize is not a function` at
   `header-cell.tsx:130`.
2. Registering `columnResizingFeature` on one example moves it one layer down, to
   `TypeError: Cannot read properties of undefined (reading 'isPending')` at `body.tsx:82`.

That is v9 feature registration in the docs app — PR 4's sweep, which was in flight in this
worktree while PR 3 ran. The consequence: **all 18 specs under `e2e/packages/data-grid/pinning/`
fail at `expect(page.locator('table')).toBeVisible()`**, including the three in `rows.spec.ts`
that PR 3 never touched. So the failure is not attributable to the rename, and the rename's e2e
half — `columns.spec.ts`'s two updated selectors and the whole new RTL spec — is **unverified by
execution**. It was verified by reading, which trap T8 says is the minimum: `e2e-slots.test.ts`
compares `data-slot` literals only, `data-pinned` **values** are outside its regex entirely, and a
value-keyed selector that matches nothing produces a clean "expected 1, got 0" rather than an error.

**PR 4 or PR 5, whichever gets the examples rendering, must run
`pnpm --filter @ez-kit/docs exec playwright test e2e/packages/data-grid/pinning` for both kits and
report the result.** The RTL spec in particular has never executed; its assertions are stated as
relations between the two pinned columns (`start.x > end.x`) precisely so that a spec which
accidentally runs against an LTR layout fails rather than passing, but that design has not been
exercised.

Also unrun for the same reason: `apps/docs/test/docs-option-names.test.ts`, which bails with
`Type @ez-kit/data-grid-react#ReactGlobalFilteringConfig resolved to zero properties … run
pnpm build first` because `data-grid-react`'s `build` fails on the 82. So **whether
`pinning/api.mdx` is forced scope cannot be answered yet** — `pr3-recon.md` §6 predicted it would
be, and that prediction stands untested.

---

## 3. What PR 4 inherits — the docs still naming a physical pin value

PR 3 took only what it had to: `pinning/columns.mdx` (it carries the new RTL example, and leaving
the rest of that page saying `initialSide: 'left'` two paragraphs above a section explaining that
the sides are logical would have been worse than not adding the section), and the eight example
**components**, which are code — a stale `'left'` there is silently "not pinned", not a doc typo.
Everything below is untouched and is PR 4's, refreshed against the tree:

| `file:line`                                | What                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `data-grid/pinning/api.mdx:31`             | `false \| 'left' \| 'right' \| ColumnPinningDef`                                                                                |
| `data-grid/pinning/api.mdx:32,33`          | `pinning.side` / `pinning.initialSide`: `'left' \| 'right'`                                                                     |
| `data-grid/pinning/api.mdx:42,44`          | `initialState.columnPinning` / `state.columnPinning`: `{ left?, right? }` → **`{ start, end }`**                                |
| `data-grid/pinning/index.mdx:6-7,19`       | prose "left or right edge", "stays against the left edge"                                                                       |
| `data-grid/pinning/index.mdx:43-44`        | **"physical directions, not logical ones … does not flip when the grid runs right-to-left"** — now false; design §5 reverses it |
| `data-grid/pinning/index.mdx:53,54`        | `pinning: 'left'`, `pinning: { initialSide: 'left' }`                                                                           |
| `data-grid/columns/index.mdx:40,107`       | `false \| 'left' \| 'right' \| {…}`; prose "pin to left/right"                                                                  |
| `data-grid/columns/grouped-headers.mdx:65` | prose "left / centre / right"                                                                                                   |
| `data-grid/selection/index.mdx:109`        | "Pinned `'left'` at `44px` by default"                                                                                          |
| `data-grid/expanding/sub-content.mdx:30`   | "Pinned `'left'` at `44px` by default"                                                                                          |
| `data-grid/row-actions/api.mdx:51`         | `false \| 'left' \| 'right' \| {…}`; defaults `'left'` / `'right'`                                                              |
| `data-grid/row-actions/index.mdx:6`        | prose "right edge"                                                                                                              |
| `data-grid/state/index.mdx:16,96,152`      | `pinning: { initialSide: 'left' }`, `pinning: 'left'`                                                                           |
| `data-grid/state/index.mdx:22,117`         | prose "`id` pinned left", "left and right ids"                                                                                  |
| `data-grid/state/index.mdx:107`            | `initialState={{ columnPinning: { right: ['name'] } }}` → **`end`**                                                             |

Pages naming `data-pinned` with **no value** need no change: `theming.mdx:26`, `kit-parity.mdx:73`,
`layout/index.mdx:63`, `advanced/react.mdx:64`, `pinning/columns.mdx:61`.

The `columnPinning` rows are the sharp ones: a consumer copying
`initialState={{ columnPinning: { right: ['name'] } }}` out of the docs writes an object with no
recognised key, which merges to "nothing pinned" rather than throwing.

---

## 4. What PR 6's changeset must name

The rename is **five** distinct consumer-visible breaks, not one, and design §5 says the CSS cost
goes in "in those words" rather than behind "migrated to TanStack v9".

1. **`ColumnPinSide.Left` / `.Right` → `.Start` / `.End`, and the option values with them.**
   `pinning: 'left'`, `pinning: { side: 'left' }`, `pinning: { initialSide: 'right' }` are all now
   `'start'` / `'end'`. This is the one most consumers hit, because it is in every column def.
2. **`initialState.columnPinning` / `state.columnPinning` are `{ start, end }`, not
   `{ left, right }`.** Upstream's shape, taken in PR 1. A stale key is **accepted and ignored** —
   it merges to "nothing pinned" — so this one fails silently at runtime and deserves a sentence of
   its own.
3. **`GridMenuIcon.PinLeft` / `.PinRight` → `.PinStart` / `.PinEnd`.** A break for any kit or app
   that supplies its own icon map: these are required keys of `Record<GridMenuIcon, …>`, so it is a
   compile error rather than a silent one — the only part of this rename that cannot fail open.
4. **`messages.columnMenu.pinLeft` / `.pinRight` → `.pinStart` / `.pinEnd`.** A translation
   override keyed by the old name reverts to English. Whether the compiler catches it depends on
   how exact the `messages` option's type is; the repo's own Russian localization example was the
   first consumer of this and had to be renamed. The English defaults are unchanged.
5. **`ColumnActionId.PinLeft` / `.PinRight` → `.PinStart` / `.PinEnd`, and the ids they carry
   (`'pin-left'` / `'pin-right'` → `'pin-start'` / `'pin-end'`).** `ColumnActionId` is exported and
   the values reach the DOM as menu-item ids, so a menu customisation or a QA selector keyed on one
   stops matching.

Plus the DOM/CSS contract, for anyone who has run `npx shadcn add` and copied the payload into
their project, or who styles the grid themselves:

6. **`data-pinned` on a column is `start` / `end`; `data-pin-shadow` likewise.** Row pinning is
   unchanged (`top` / `bottom`).
7. **`--dg-pin-left` / `--dg-pin-right` → `--dg-pin-start` / `--dg-pin-end`, and
   `--dg-pin-{left,right}-shadow` → `--dg-pin-{start,end}-shadow`.** A consumer who copied
   `styles.css` and then updates gets the new variable names against their old rules, or their own
   overrides silently stop applying. Accepted at `0.x`; it must be stated, not implied.
8. **The structural stylesheet positions pinned cells with `inset-inline-start` /
   `inset-inline-end`.** A consumer overriding `left:` / `right:` on `[data-pinned]` no longer wins
   by specificity in the way they expect.

Per AGENTS.md, `@ez-kit/data-grid-shadcn` must **not** appear in the changeset (private, in
`.changeset/config.json`'s `ignore`); the kit-visible change ships through
`@ez-kit/data-grid-react` and `@ez-kit/docs`. And **never `major` on `0.x`** — design §6.

---

## 5. Traps hit, and two the recon got wrong

**T1 (shadow variables fail open) — real, and now guarded.** §1.2.

**T3 (measured offsets are physical) — real, and the largest piece of actual thinking in this PR.**
§1.1b.

**T5 (vendored file) — real.** §1.1e.

**T6 (`getBoundingClientRect` stub keyed on the `data-pinned` value) — real, and cheap to avoid
once you know.** The stub at `data-attrs.test.tsx:176-177` was renamed in the same pass as the
source, so the predicted `'300px'` vs `'304px'` misdiagnosis never happened. Budget the warning,
not the time.

**T8 (`e2e-slots.test.ts` gives no cover) — confirmed by reading it, and it is worse than "no
cover" here**: see §2. The e2e half of this PR is the only half with no green run behind it.

**T2 (`pinLeft` message key may not error) — not established.** The repo's own example was fixed by
rename, and the docs app's typecheck is red for unrelated reasons, so whether a stale key is a
compile error or a silent revert was never isolated. Assume the worst and say so in the changeset
(§4.4).

### Two corrections to `pr3-recon.md`

**`apps/docs/public/r/data-grid.json` is NOT "a generated artifact checked into the repo".**
Recon §4 says it is, and that PR 3 must commit the regenerated file. It is **gitignored** —
`.gitignore:13` covers `apps/docs/public/r/` and `.gitignore:12` covers
`packages/**/registry.json`. Both are built at deploy time. `registry:build` was run and its output
inspected (it carries only the new names), but there is nothing to commit and there never was.
Recon §4's "the published registry keeps serving `PinLeft`" concern is therefore moot: the registry
is rebuilt from source on every deploy.

**Recon §1a's `pin-styles.ts` entry was already stale when written** — PR 2 had brought that file's
comparisons forward. `pr2-outcomes.md` §2.1a caught this first; confirmed here.

### One thing worth knowing about this worktree

Another agent ran `git add -A` mid-session, staging ~90 of its own files into the shared index
alongside two of PR 3's in-flight files, and edited PR 3's new example component in place. Every
commit after that point was made with `git commit -F - -- <explicit paths>`, which builds a
temporary index from the named paths' working-tree content and leaves the rest of the index alone —
`lint-staged` then sees only those paths, which is the behaviour you want anyway. Worth knowing if
a later PR shares a worktree.
