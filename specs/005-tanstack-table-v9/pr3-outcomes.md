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

## 0. The gates, as measured after `55a27803`

Run individually with `pnpm --filter <pkg> <gate>`. **Nothing red below is column pinning.**
All three data-grid React packages pass every gate they have, for the first time since the
migration started; `@ez-kit/data-grid-react`'s typecheck went 99 -> 0 and its suite from 726 to 738. `size` needs core built first, since the count is measured against `dist`.

| Package                    | typecheck           | lint      | test                                       | build     |
| -------------------------- | ------------------- | --------- | ------------------------------------------ | --------- |
| `@ez-kit/data-grid-react`  | **green** (was 99)  | **green** | **726/726** (was 721/4)                    | **green** |
| `@ez-kit/data-grid-shadcn` | **green** (was 3)   | **green** | **green**                                  | **green** |
| `@ez-kit/data-grid-heroui` | **green** (was 2)   | **green** | **green** (was 45/50)                      | **green** |
| `@ez-kit/docs`             | 150 errors (PR 4's) | —         | vitest green on the pinning-relevant files | —         |

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

## 0.2 Ruling L — PR 3 also took the 82 non-pinning errors, and they split 27 / 55

Ruling L (and the lead's amendment to it) put the 82-error class in PR 3's scope, as separate
commits after the pinning work. They are not one class. They split cleanly at a root cause, and the
two halves want completely different treatment.

### The 27 — test harnesses on the v8 config shape. Done, `0d36bc03`.

No suppression, no `any`, no widened type. typecheck **82 -> 55**, tests still 726/726, lint green.

The bulk was one line. `pagination.test.tsx`'s two render helpers typed their parameter
`Omit<UseDataGridConfig<GridFeatures, User>, 'data' | 'columns'>`. In v9 `features` is a required
member of that config, so the `Omit` left it required of all 20 call sites — and because the helper
supplies `features: TEST_FEATURES` itself and then spreads `...config` over it, a caller who
obliged would have _overwritten_ the feature set rather than adding to it. That is what the lone
`TS2783` ("'features' is specified more than once") was reporting, and it is why the fix is to omit
`features` rather than to pass it: both helpers now share a named `PaginationCase`, so they cannot
drift apart again. The rest: `features: TEST_FEATURES` on four config literals across
`closed-sets.test.ts`, `data-grid-options-context.test.tsx` and `defaults.test.tsx`; one
`useDataGrid` call given explicit type arguments (inference from the first argument alone pins
`TFeatures` to the _literal_ type of `TEST_FEATURES`, so a `DataGridDefaultOptions<GridFeatures,
User>` second argument no longer fits); and `SelectionConfig` / `ExpandingConfig`'s leading
`TFeatures` — pr2-outcomes §1.1f — reaching `public-api.test.ts`'s assertion list.

### The 55 — v9's row types are invariant in `TRow`, and `any` no longer erases

**This is the finding worth keeping, whatever is eventually done about it.** It was isolated with a
probe file, not inferred from the error text. Every one of these assignments **fails**:

| From                 | To                     |
| -------------------- | ---------------------- |
| `Row<F, User>`       | `Row<F, any>`          |
| `Row<F, User>`       | `Row<F, object>`       |
| `Row<F, User>`       | `Row<F, RowData>`      |
| `DataTable<F, User>` | `DataTable<F, any>`    |
| `DataTable<F, User>` | `DataTable<F, object>` |
| `Table<F, User>`     | `Table<F, object>`     |

For the `object` / `RowData` cases the chain bottoms out at

> `Type 'AccessorFn<User, unknown>' is not assignable to type 'AccessorFn<object, unknown>'.`
> `Property 'id' is missing in type '{}' but required in type 'User'.`

— a **contravariant function parameter**, which is sound typing and not an
`exactOptionalPropertyTypes` quirk, whatever the error's "Consider adding 'undefined'" preamble
suggests. For the `any` case it bottoms out at `Property 'accessorFn' is missing`, because
`ColumnDef<F, any, TValue>` is a union of identifier shapes and at `TRow = any` it resolves to the
branch that requires `accessorFn`.

`Row<F, TRow>` holds `original: TRow` covariantly and reaches `column.accessorFn: (row: TRow) => …`
contravariantly, so it is **invariant**. The consequence is blunt: **there is no supertype to erase
to.** `any` in particular does not erase inside a generic instantiation — it only erases at the top
level. The React layer's whole erasure strategy was `any` (`DataTable<any, any>` in `TableContext`,
`DataGridCellProps` defaulting `TRow = any`), and v9 took it away silently. All 55 errors are that
one fact reported at 55 sites.

**The obvious fix does not terminate on its own.** Making `cell.tsx`'s three private sub-components
generic in `TRow` — the correct typing, no cast — moved the count 55 -> 54: the errors relocate one
level inward, because each layer fixed pushes the `any` boundary down to the next helper. It is a
cascade through ~8 source files (`data-grid.tsx` 12, `cell.tsx` 11, `header-cell.tsx` 5, `body.tsx`
3, `table.tsx` 2, `row.tsx`, `actions-cell.tsx`, `selection-bar.tsx`) that can only terminate where
genericity is impossible: `TableContext`, which React gives no type parameter, and the kit
component contract. That probe was reverted; the tree is clean at 55.

So the 55 need a decision, not a fix — thread `TRow` and take one documented cast at the context
boundary (where the read side, `useDataGridTable`, already casts and already explains why), or
erase deliberately at a named `ErasedTable` / `ErasedRow` alias with the reason stated once. It is
recorded here rather than acted on because the lead asked to be told if the class split further,
and it did.

---

## 0.3 Ruling M — how the 55 were closed, and what it cost

**Option 2, the named erasure boundary.** `ErasedRow = never` in `types.ts`, beside `GridFeatures`
and cross-referencing it, because they are one decision: a component reads the table from a React
context, and a context takes no type parameter, so neither the caller's `TFeatures` nor its `TRow`
reaches it. `never` because it is already this package's spelling for the same idea —
`RowPropsResolver<never>`, `GridOptions<never>`, `ExpandedRowProps<never>`.

**The rejected option, recorded so it is not re-proposed as an obvious improvement.** Threading
`TRow` through the component tree is better type hygiene and was the implementer's first
recommendation. It was rejected because (a) design D1 already pins the component layer at the widest
instantiation for `TFeatures`, and making it generic in one parameter and pinned in the other has no
principle behind it; (b) the package already erased `TRow` in three places under three spellings,
so naming the erasure is an improvement on the status quo where threading it would be a different
architecture; and (c) it is unbounded — measured, not argued: making `cell.tsx`'s three private
sub-components generic moved the error count 55 -> 54, because each layer fixed pushes the boundary
inward.

**Most of the work turned out not to be casts.** 19 internal helpers that took `<GridFeatures, any>`
are simply generic now — a plain function has no context limitation — which is why
`no-explicit-any` disables in non-test source went from **25 to 1**. Contract types that spelled the
erased row `object` or `any` now spell it `ErasedRow`.

**The crossings, counted, as Ruling M asked.** Four new assertions, each at a boundary with its
reason in place:

| Site                                     | What crosses                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table-context.tsx` — `TableProvider`    | the caller's table into the context. One component, replacing the same cast written implicitly at all eight `TableContext.Provider` sites                           |
| `table-context.tsx` — `useDataGridTable` | the mirror, back out to the row type the caller names. Existed; gained the `as unknown as` hop                                                                      |
| `use-data-grid.ts` — `selection.bar`     | the consumer's callbacks into the row-erased `ResolvedGridOptions`, beside the `rowProps` write that already did exactly this                                       |
| `cell.tsx` — `<ActionsCell row>`         | one row into a component that is erased on every other edge. Typing `ActionsCell` at `TRow` instead moved the same crossing onto its four kit-contract render sites |

A fifth assertion in `DataGridRoot` is **not** about rows: `DataGridProps` is a union of two
intersections, so TypeScript will not treat `table` as a discriminant. Narrowing on `!= null` and
spelling the marker `table?: undefined` instead of `table?: never` were both tried; neither narrows
an intersection.

**The one place the boundary is not this package's to draw.** `ColumnMeta` is declared `in out`
upstream — explicitly invariant — and core already erases it under its own name, `FormColumnMeta`,
which spells the erased row `object` rather than `never`. Rather than invent a second spelling one
package over, `filter-panel.tsx` now makes the same cast `header-cell.tsx` and core's `creating.ts`
already make. **If anyone later unifies the erasure spelling, `FormColumnMeta` is where the seam
is**, and it is a core change.

## 0.4 A finding for PR 5 / PR 6: a kit consumer cannot supply `features`

Found while trying to bring the kits' own tests onto the v9 arity, and **not fixed**, because
fixing it is a packaging decision rather than a test edit.

In v9 `features` is a **required** option on `createTable` / `useDataGrid`. Both kits depend on
`@ez-kit/data-grid-react` and nothing else from this repo, and that package re-exports neither
`tableFeatures` nor `allDataGridFeatures`. So a kit's own test — and, more to the point, **a kit's
consumer** — has no way to construct a feature set without adding `@ez-kit/data-grid-core` as a
direct dependency, which none of the kit documentation mentions.

That is why both kits still carry typecheck errors (shadcn 2, heroui 10), all in their own
`index.test.ts(x)` and `blocks/infinite/infinite.test.tsx`, with the lint and test failures
following from them. Every one is `createTable<User>` / `DataGridProps<User>` /
`UseDataGridConfig<User>` / `TableState` missing the `TFeatures` parameter and the `features`
option. **The kits' source is green — all four kit `build`s pass and shadcn's 40 unit tests pass.**

**Settled by Ruling O — see §0.6.** Each kit takes a direct dependency on core; react does not
re-export the helpers. The kits' tests were then brought onto the v9 arity and both kits are green.

---

## 0.5 Ruling N — a feature you do not register now costs nothing

Design D1's central claim was false in the React adapter, and this is the commit that makes it
true: `c79d6aa8`. Reads on the **default** render path — before any branch established the feature
was configured — were plain property accesses into a state slice, or calls to a method, that exist
only once a particular feature is registered.

**Eight features became optional** that were not: `columnResizingFeature`, `rowSortingFeature`,
`loadingFeature`, `creatingFeature`, `infiniteFeature`, `rowSelectionFeature`, `editingFeature`,
`deletingFeature`. **Three remain mandatory and are structural**, not defects — the shell lays out
a column grid, so it needs `columnVisibilityFeature`, `columnPinningFeature` and
`columnSizingFeature` to lay it out with.

### Three of the eight were found by running, not by reading

The list this work started from had five, assembled by reading call sites — twice, and both times
short. Running the cases found three more:

| Feature               | Why a reader missed it                                                                                                                                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rowSelectionFeature` | `row.tsx` calls `getIsSelected()` for **every row**. The sweep examined the selection _column_, found that path properly conditional, and stopped there.                                                                                                       |
| `editingFeature`      | `cell.tsx`'s `isEditing` selector runs for every body cell before anything establishes that editing is configured.                                                                                                                                             |
| `deletingFeature`     | `ConfirmDialogRenderer`'s two `useDataGridState` hooks necessarily run before its own early-return gate, because a hook cannot sit after a return. **Self-inflicted**: moving that gate inside the component in `97b5036e` is what made the feature mandatory. |

That is the lesson worth carrying: a list of unconditional reads cannot be assembled by reading,
because the question is not "what does this file do" but "which components mount on a plain grid".
`use-infinite-scroll.ts` reads like infinite-scroll code because it _is_; nothing in it says
`<LoadMoreFooter />` mounts unconditionally inside `<Tbody>`.

### `feature-optionality.test.tsx` is the evidence and the guard

It builds a grid **without each optional feature** and renders it, and asserts the three structural
ones still throw — so the line between "structural" and "defect" is executable rather than argued.
Every guard was added only after watching its case fail, and each turned exactly that case green.
`getResizeHandler()` and `getIsResizing()` needed no guards: both sit inside the
`canResize ? … : null` subtree, which a grid without the feature never enters.

### `RuntimeGridState` — considered and rejected

A `TableState<GridFeatures>` variant with the feature slices marked optional would make every `?.`
provably necessary and remove all 14 disables. Rejected: it is a **second spelling of one concept**
— the repo would carry `TableState<GridFeatures>` for what the types say and `RuntimeGridState` for
what is actually there, and a reader would have to know which applies where. That is the defect the
option audits keep removing, and it is worse than a cited disable that a test holds honest. The gap
it would paper over is already documented as the accepted cost of pinning the component layer, so
the FEATURE GUARDS note extends an existing record rather than starting a second one.

**Reopen it** if the disable count grows materially, or if a guard is ever added without a covering
case — either breaks the property that makes the disables acceptable, which is that deleting a
guard fails a test rather than going quiet.

### The guards trip `no-unnecessary-condition`, and that is the pinning's cost showing

The rule reads `TableFeatures` — the widest and therefore _fullest_ instantiation, where every
slice and method is declared present — and concludes the check cannot fail. It can, and did. The
gap was already documented as the cost of pinning the component layer; it now has a **FEATURE
GUARDS** note in `types.ts` that each scoped disable cites. The disables hide nothing: delete a
guard and the test fails rather than going quiet.

## 0.6 Ruling O — the kits declare core directly

`55a27803`. Since v9 `features` is a **required** option, so every consumer of every kit writes
`tableFeatures({ … })` in their own code — and the helpers live on core. Both kits depended on
`@ez-kit/data-grid-react` and nothing else from this repo, and that package re-exports neither
helper, so there was no import a consumer could write. Their own tests could not be brought onto
the v9 arity for the same reason, which is how it surfaced.

React does **not** re-export the helpers: two import paths for one concept is the defect AGENTS.md's
option audits keep removing. Design §1's "one import path" argued against making
`@tanstack/table-core` a consumer peer dependency — never for hiding core behind react.

`registry.config.mjs` lists core too, closing a defect already on the books. Its old comment
reasoned that core is transitive through react and listing it would be "redundant clutter" — true
for hoisting package managers, false under pnpm's strict layout, and now false in spirit as well:
a transitive dependency resolves, but the consumer must _name_ the import, and naming a package you
did not declare is exactly what a strict layout refuses. Core is the one entry on that list that no
copied file imports, and the comment now says so.

Both READMEs follow. HeroUI's install line gains core, because `pnpm add @ez-kit/data-grid-heroui`
alone leaves the import unresolvable under pnpm even with the kit declaring it.

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

---

# PR 3, continued — the two items left open

Picked up after the previous session ended mid-task. Two commits:

| SHA        | What                                                                          |
| ---------- | ----------------------------------------------------------------------------- |
| `dbc0b876` | `fix(data-grid-react)`: stop a row move resetting the state it did not change |
| `87304c0a` | `feat(data-grid-core)`: warn when a sorting grid omits the `sortFns` slot     |

## 6. Task 1 — reproduced, and the unit test was passing for the wrong reason

**Reproduced, on both kits, and fixed.** The cause is not the expanded row model and not the row
order. It is TanStack's `autoResetExpanded`, fired by the grid's own reorder.

### The chain

1. `createCoreRowModel`'s memo is keyed on `memoDeps: () => [table.options.data]`.
2. Uncontrolled row ordering rewrites `data` on every move — `useOrderedData` projects the array
   through the `rowOrder` slice and `setOptions` writes the new identity.
3. The memo recomputes, and its `onAfterUpdate` runs `table_autoResetExpanded`,
   `table_autoResetPageIndex`, `table_autoResetSorting` and `table_autoResetCellSelection`.
4. `table_autoResetExpanded` is gated on `autoResetAll ?? autoResetExpanded ?? !manualExpanding`
   — **on by default** — and calls `table._reactivity.schedule(() => table_resetExpanded(table))`.
5. The expanded slice clears, row `1` collapses, and its children stop rendering: `["2","1"]`.

Observed directly in the browser rather than inferred: after the move, row `1`'s toggle reads
`aria-label="Expand row"` again — the row is collapsed, not merely unrendered.

### Why it did not reproduce in jsdom — the more valuable finding

**`tree-row-ordering.test.tsx` was passing for the wrong reason.** `_reactivity.schedule` is
`queueMicrotask` (`store-reactivity-bindings.js:30`). The test asserted synchronously after a
synchronous `act(...)`, so the microtask had not drained: it was reading the state **between the
move and the reset**, where nothing is wrong yet. Adding one `await act(async () => { await
Promise.resolve() })` before the assertion made the DOM case fail with the browser's exact
`['2','1']`, against unmodified source. The defect was never browser-only.

Two further notes on that test, now in its docblock:

- **Only the DOM case has teeth.** The `renderHook` case passes with the fix removed as well:
  nothing recomputes the core row model until `ids()` asks for it, so the reset is scheduled _by_
  the very read being asserted and lands after it. Only a rendered grid recomputes on its own and
  then repaints from the reset state.
- Both cases are now `async` and drain the queue explicitly.

### The fix

`use-data-grid.ts` already suppressed `autoResetPageIndex` for exactly this reason — "a row move
rewrites `data` without the dataset having changed at all" — and the comment even spelled out the
general problem while handling one instance of it. `autoResetExpanded` and
`autoResetCellSelection` now join it, suppressed on precisely the render that projects a move and
left to their defaults whenever the `data` prop itself changed.

`autoResetSorting` is the one sibling that needs nothing: upstream defaults it to `false`
(`autoResetAll ?? autoResetSorting ?? false`), unlike the other three.

### Evidence

- `ordering/rows.spec.ts` — **26/26 on both kits** (was 2 failed / 24 passed).
- `expanding/`, `pagination/`, `selection/` — **110/110 on both kits**, i.e. no grid that wanted a
  reset lost one.
- `@ez-kit/data-grid-react` — 744/744, typecheck and lint clean.
- The characterisation test fails without the fix and passes with it.

**A trap worth recording:** the browser suite runs against each package's **`dist`**, not `src`. A
first re-run after the fix still failed on both kits; `pnpm turbo run build
--filter=@ez-kit/data-grid-react` was the whole difference. A green unit test and a red spec on the
same change means a stale build before it means anything else.

## 7. Task 2 — the `sortFns` guard, and why there is no `aggregationFns` one

`SORT_FNS_SLOT` now sits beside `FILTER_FNS_SLOT` in `create-table-options.ts`, with the guard
directly below the `filterFns` one. `entry.ts`'s "the other two it cannot see" is corrected.

### The condition is wider than "a column named a comparator"

PR 4's measurement held, and the reason is in `column_getSortFn`: an inline `sortFn` is taken
as-is and **everything else** resolves through `table._rowModelFns.sortFns` — `'auto'` included,
which is what a column with no `sorting.fn` carries, and which `column_getAutoSortFn` turns into
another name (`alphanumeric` / `datetime` / `text`) looked up in the same slot. So the condition
is "sorting is on and some sortable column did not supply a function", not "some column named a
sort function". Missing, every column falls back to `sortFn_basic` — a plain string compare.

Two configurations are excluded, each a real false positive avoided:

- **Names `sorting.fns` answers.** That registry is merged into the feature set further down, so
  such a name resolves whether or not the consumer registered `sortFns`. A table whose every
  column names one of its own comparators is correct and is not warned at.
- **`manual: true`.** The server sorts, the sorted row model passes its input through, and
  `column_getSortFn` is never reached — a manual-sorting table resolves no comparator at all.

Also excluded: group columns (never sorted) and leaves with `sorting: false`.

### No `aggregationFns` sibling — checked, not assumed

`TableConfig` has **no `grouping` option** and `ColumnDef` **no `aggregationFn`**.
`columnGroupingFeature` and `rowAggregationFeature` arrive with the all-in set and are reachable
only through upstream's `constructTable` — which is exactly how `features/entry.test.ts` has to
exercise the slot. Nothing a consumer writes can ask for an aggregation, so a guard here would
have no condition to test. Recorded in both the `SORT_FNS_SLOT` docblock and `entry.ts`, with the
shape its guard would take if grouping ever gains a config key.

### Probed, not read

- **Built artifact, `NODE_ENV=development`:** a set without `sortFns` → 1 warning; the same set
  with `sortFns` → 0. Run against `dist`, independent of vitest.
- **Seven new unit cases** in `create-table-options.test.ts`: plain accessor column, named
  comparator, inline comparator, `sorting.fns` answering every name, every column opted out,
  manual sorting, registry present.
- **All 112 docs examples swept in a headless browser** for `[data-grid]` console output:
  **zero `sortFns` warnings**, confirming no false positive across the corrected set (`8825d1ac`).

### Two fixtures that were the defect in miniature

`SORTING` in `create-table.test.ts` and `features` in `create-table-options.test.ts` both
registered `rowSortingFeature` without `sortFns` — so the core suites were themselves sorting
lexicographically. Both now register it, mirroring the `filterFns` comment already there.

One test changed meaning rather than fixture: a config with neither `rowSortingFeature` nor
`sortFns` now emits **two** warnings. That is correct — two independent gaps, and neither implies
the other; a set carrying `rowSortingFeature` without `sortFns` is the commoner mistake.

### Core's five gates, re-measured after the commit

`build` ok · `typecheck` clean · `lint` clean (`--max-warnings=0`) · `test` 668/668 ·
`size` 10.84/12.5 kB, 4.50/5.5 kB, 4.54/5.5 kB. The guard is `IS_DEV`-gated and stripped from
production builds, so the budgets did not move.

## 8. Six pre-existing docs warnings, for PR 4

The 112-example sweep surfaced warnings from **other** guards, none from this work, all in
`apps/docs/shared/**` — PR 4's territory, so left untouched:

| Example                      | Warning                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| `crud-client`, `crud-server` | column `department`: `filtering.defaultOperator: "in"` is not one of its operators            |
| `example-task-board`         | columns `estHours`, `createdAt`: `defaultOperator: "equals"` against `between`-only operators |
| `production-deferred-apply`  | column `reference` seeds `pinning.initialSide` with table-level pinning off                   |
| `production-feed`            | column `invoice` seeds `visibility.initialHidden` with table-level visibility off             |

The first four are "the filter would match every row" — the same silent class this PR's guards
exist for, and worth a look.
