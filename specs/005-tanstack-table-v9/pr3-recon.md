# PR 3 reconnaissance — the pinning carve-out

**Date:** 2026-09-16
**Branch:** `integration/tanstack-v9`, worktree `/Users/sergejolcev/orca/workspaces/ez-kit/data-grid-bump`
**Method:** static read only. No build, no `tsc`, no `vitest`, no `eslint` was run — another agent was
committing PR 2 concurrently. Every line number below was re-derived from the working tree as it
stood at this pass, **not** copied from `pr1-outcomes.md` §3.1 (which predates PR 2). Where the two
disagree the tree is quoted and the disagreement is called out.

**Tree state caveat:** at the time of this pass PR 2 was still **uncommitted** — `git status` showed
106 modified files, `HEAD` was `cf14f78f` (PR 1's last commit), and
`specs/005-tanstack-table-v9/pr2-outcomes.md` did **not** exist. Task 21's "exact residue" record
that the plan promises PR 3 is therefore not yet written; §2 below is this pass's own derivation of
it and should be reconciled against `pr2-outcomes.md` once that lands.

---

## 0. What is already done, and must not be redone

Verified against the tree, not against the plan:

- **Core's half (PR 1, Task 4) is complete.** `ColumnPinSide` is `{ Start: 'start', End: 'end' }`
  at `packages/data-grid/core/src/column/types.ts:686-691`; `GridMenuIcon.PinStart` / `.PinEnd` at
  `packages/data-grid/core/src/menu-icon/menu-icon.ts:24,26`; `messages.columnMenu.pinStart` /
  `pinEnd` at `packages/data-grid/core/src/messages/types.ts:76,78` with the English defaults still
  `'Pin Left'` / `'Pin Right'` at `packages/data-grid/core/src/messages/defaults.ts:40,41`. No
  translation shim exists and none should be added.
- **Core's state slice is already `{ start, end }`.** `packages/data-grid/core/src/column-state/column-state.ts:13,15`,
  `packages/data-grid/core/src/create-table/create-table-options.ts:779`, and the core tests
  (`create-table.test.ts:1580-1666`, `column-state.test.ts:73-101`,
  `create-table-options.test.ts:225-232`) all read `columnPinning.start` / `.end`.
- **PR 2 renamed the column getters.** `pin-shadow-overlay.tsx:85,86` call
  `getStartLeafColumns()` / `getEndLeafColumns()`; `visual-column-order.ts:30-32` calls
  `getStartVisibleLeafColumns()` / `getCenterVisibleLeafColumns()` / `getEndVisibleLeafColumns()`.
  Getters only — the `'left'` / `'right'` **values** are untouched and are PR 3's.
- **Upstream's contract, read from the installed `.d.ts`** (`node_modules/.pnpm/@tanstack+table-core@9.2.4/…/features/column-pinning/columnPinningFeature.types.d.ts`):
  - `type ColumnPinningPosition = false | 'start' | 'end'` (line 15)
  - `interface ColumnPinningState { start: Array<string>; end: Array<string> }` (lines 16-19)
  - `getIsPinned: () => ColumnPinningPosition` (line 62), `pin: (position: ColumnPinningPosition) => void` (line 71)
  - `getStart` / `getAfter` take `ColumnPinningPosition | 'center'`
    (`features/column-sizing/columnSizingFeature.types.d.ts:108,120`)

  **This is more than `pr1-outcomes` §3.1's three dead name sets.** `ColumnPinningState` changing
  from `{ left, right }` to `{ start, end }` is a **fourth** dead name set, reaching
  `initialState.columnPinning` / `state.columnPinning` in the public API and in the docs. §3.1 does
  not mention it; core has already migrated to it, the docs have not.

---

## 1. Every remaining `left` / `right` pinning site, by kind

Counts exclude `CHANGELOG.md` files (historical record, correctly frozen) and
`apps/docs/public/r/data-grid.json` (a build artifact — see §4).

### 1a. `ColumnPinSide.Left` / `.Right` — **8 references, 2 files** (both compile errors today)

| `file:line`                                                                | What                                                                                   |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `packages/data-grid/react/react/src/utils/pin-styles.ts:22`                | `isPinned === ColumnPinSide.Left`                                                      |
| `packages/data-grid/react/react/src/utils/pin-styles.ts:23`                | `['--dg-pin-left'] = column.getStart(ColumnPinSide.Left)` — two dead names on one line |
| `packages/data-grid/react/react/src/utils/pin-styles.ts:25`                | `isPinned === ColumnPinSide.Right`                                                     |
| `packages/data-grid/react/react/src/utils/pin-styles.ts:26`                | `['--dg-pin-right'] = column.getAfter(ColumnPinSide.Right)`                            |
| `packages/data-grid/react/react/src/data-grid/column-menu-sections.ts:117` | `isPinned !== ColumnPinSide.Left`                                                      |
| `packages/data-grid/react/react/src/data-grid/column-menu-sections.ts:123` | `column.pin(ColumnPinSide.Left)`                                                       |
| `packages/data-grid/react/react/src/data-grid/column-menu-sections.ts:127` | `isPinned !== ColumnPinSide.Right`                                                     |
| `packages/data-grid/react/react/src/data-grid/column-menu-sections.ts:133` | `column.pin(ColumnPinSide.Right)`                                                      |

The two `import { … ColumnPinSide … }` lines (`pin-styles.ts:1`, `column-menu-sections.ts:1`) stay —
the symbol is still exported, only its members were renamed.

§3.1 recorded `pin-styles.ts:21,22,24,25` and `column-menu-sections.ts:116,122,126,…`. The tree is
one line further down in both files; **use the table above.**

### 1b. `GridMenuIcon.PinLeft` / `.PinRight` — **6 references, 3 files**

| `file:line`                                                                | What                                       |
| -------------------------------------------------------------------------- | ------------------------------------------ |
| `packages/data-grid/react/react/src/data-grid/column-menu-sections.ts:121` | `icon: GridMenuIcon.PinLeft`               |
| `packages/data-grid/react/react/src/data-grid/column-menu-sections.ts:131` | `icon: GridMenuIcon.PinRight`              |
| `packages/data-grid/react/shadcn/src/blocks/icons.tsx:41`                  | `[GridMenuIcon.PinLeft]: ArrowLeft`        |
| `packages/data-grid/react/shadcn/src/blocks/icons.tsx:42`                  | `[GridMenuIcon.PinRight]: ArrowRight`      |
| `packages/data-grid/react/heroui/src/blocks/icons.tsx:37`                  | `[GridMenuIcon.PinLeft]: <ArrowLeft …/>`   |
| `packages/data-grid/react/heroui/src/blocks/icons.tsx:38`                  | `[GridMenuIcon.PinRight]: <ArrowRight …/>` |

§3.1's line numbers for all three files still hold.

Both kit maps are typed `Record<GridMenuIcon, …>`, so a missing key is a compile error and a stale
key is an excess-property error — **this set cannot fail silently**, which is unusual for this
migration and is worth noting as the one safe rename here.

### 1c. `ColumnActionId.PinLeft` / `.PinRight` — **4 references, 1 file** (not in §3.1)

| `file:line`                                                                | What                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `packages/data-grid/react/react/src/data-grid/column-menu-sections.ts:16`  | `PinLeft: 'pin-left'` (the const-object member **and** its string value) |
| `packages/data-grid/react/react/src/data-grid/column-menu-sections.ts:17`  | `PinRight: 'pin-right'`                                                  |
| `packages/data-grid/react/react/src/data-grid/column-menu-sections.ts:119` | `id: ColumnActionId.PinLeft`                                             |
| `packages/data-grid/react/react/src/data-grid/column-menu-sections.ts:129` | `id: ColumnActionId.PinRight`                                            |

`ColumnActionId` is **exported** (`column-menu-sections.ts:12,24`) and its string values
(`'pin-left'` / `'pin-right'`) reach the DOM as menu-item ids. §3.1 misses it entirely. It is a
separate decision from 1a/1b: the member names should follow, but changing the **string values** is
an additional consumer-visible break. See trap T4.

### 1d. `messages.columnMenu.pinLeft` / `.pinRight` — **4 references, 2 files**

| `file:line`                                                                | What                           |
| -------------------------------------------------------------------------- | ------------------------------ |
| `packages/data-grid/react/react/src/data-grid/column-menu-sections.ts:120` | `label: messages.pinLeft`      |
| `packages/data-grid/react/react/src/data-grid/column-menu-sections.ts:130` | `label: messages.pinRight`     |
| `apps/docs/shared/data-grid/examples/components/localization.tsx:54`       | `pinLeft: 'Закрепить слева'`   |
| `apps/docs/shared/data-grid/examples/components/localization.tsx:55`       | `pinRight: 'Закрепить справа'` |

The two source sites are compile errors (`GridMessages['columnMenu']` now declares `pinStart` /
`pinEnd`). The example is an object literal passed to `messages` — **whether it errors depends on
whether the `messages` option's type is exact**; if it is a partial deep-merge type, a stale key is
accepted and silently ignored, and the Russian label disappears with nothing failing. See trap T2.

### 1e. CSS custom properties

**Pin offsets — `--dg-pin-left` / `--dg-pin-right`** (2 writers, 2 consumers, 1 prose mention):

| `file:line`                                                 | Role                                                                                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `packages/data-grid/react/react/src/utils/pin-styles.ts:23` | writes `--dg-pin-left`                                                                                               |
| `packages/data-grid/react/react/src/utils/pin-styles.ts:26` | writes `--dg-pin-right`                                                                                              |
| `packages/data-grid/react/react/src/styles/global.css:88`   | `left: var(--dg-pin-left)`                                                                                           |
| `packages/data-grid/react/react/src/styles/global.css:92`   | `right: var(--dg-pin-right)`                                                                                         |
| `packages/data-grid/react/heroui/src/styles.css:218-219`    | prose: "`--dg-pin-left` / `--dg-pin-right`, from `column.getStart('left')` / `getAfter('right')`" — now doubly stale |

Neither kit's stylesheet _consumes_ these two; only the shared structural sheet does. That narrows
the kit blast radius for this pair to a comment.

**Shadow opacity — `--dg-pin-left-shadow` / `--dg-pin-right-shadow`** (2 writers, 4 consumers,
2 prose mentions):

| `file:line`                                                              | Role                                     |
| ------------------------------------------------------------------------ | ---------------------------------------- |
| `packages/data-grid/react/react/src/data-grid/table.tsx:29`              | writes `--dg-pin-left-shadow`            |
| `packages/data-grid/react/react/src/data-grid/table.tsx:30`              | writes `--dg-pin-right-shadow`           |
| `packages/data-grid/react/shadcn/src/styles.css:255`                     | `opacity: var(--dg-pin-left-shadow, 0)`  |
| `packages/data-grid/react/shadcn/src/styles.css:262`                     | `opacity: var(--dg-pin-right-shadow, 0)` |
| `packages/data-grid/react/heroui/src/styles.css:169`                     | `opacity: var(--dg-pin-left-shadow, 0)`  |
| `packages/data-grid/react/heroui/src/styles.css:176`                     | `opacity: var(--dg-pin-right-shadow, 0)` |
| `packages/data-grid/react/react/src/data-grid/table.tsx:111`             | prose                                    |
| `packages/data-grid/react/react/src/data-grid/pin-shadow-overlay.tsx:68` | prose                                    |

Every consumer has a `, 0` fallback. **A rename that misses a consumer produces an invisible
shadow, not an error** — this is the single highest-risk item in the PR. See trap T1.

**Not renamed** (axis-neutral or row-axis, leave alone): `--dg-pin-shadow-color`,
`--dg-pin-cell-background`, `--dg-row-pin-offset`, `--dg-header-height`.
Note `--dg-pin-shadow-color` and `--dg-pin-cell-background` are **also declared outside the
data-grid**, at `packages/form/react/shadcn/src/global.css:57,90,95` — out of scope, but proof the
`--dg-pin-*` namespace has a consumer this PR is not touching.

### 1f. CSS `left:` / `right:` declarations that must become `inset-inline-start` / `inset-inline-end`

| `file:line`                                                  | Declaration                                                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `packages/data-grid/react/react/src/styles/global.css:86-89` | `[data-slot='th'][data-pinned='left'], [data-slot='td'][data-pinned='left'] { left: var(--dg-pin-left) }` |
| `packages/data-grid/react/react/src/styles/global.css:90-93` | `…[data-pinned='right'] { right: var(--dg-pin-right) }`                                                   |

Those two are the whole of the physical-to-logical CSS change for the **cells**. Everything else
under `data-pinned` is either axis-neutral (`global.css:82-85` `@apply sticky z-[1]`,
`global.css:101` the resizer exclusion) or the **row** axis (`global.css:186-199`,
`top:` / `bottom:` — correctly physical, do not touch).

Two more that are _not_ CSS but are the same decision:

| `file:line`                                                               | Declaration                                          |
| ------------------------------------------------------------------------- | ---------------------------------------------------- |
| `packages/data-grid/react/react/src/data-grid/pin-shadow-overlay.tsx:124` | inline `style={{ left: edges.left ?? leftSize }}`    |
| `packages/data-grid/react/react/src/data-grid/pin-shadow-overlay.tsx:130` | inline `style={{ right: edges.right ?? rightSize }}` |

and the structural rule they sit under, `global.css:210-212`
(`[data-pin-shadow] { @apply absolute top-0 bottom-0 … }`). See trap T3 — these offsets are
**measured** from `getBoundingClientRect()` and are genuinely physical.

### 1g. `data-pinned` — writers and the selectors that target them

**Column-axis writers** (value becomes `'start' | 'end'`):

| `file:line`                                                        | Element                                          |
| ------------------------------------------------------------------ | ------------------------------------------------ |
| `packages/data-grid/react/react/src/data-grid/header-cell.tsx:147` | `<th>`                                           |
| `packages/data-grid/react/react/src/data-grid/header-cell.tsx:347` | `<th>` (second render path)                      |
| `packages/data-grid/react/react/src/data-grid/cell.tsx:477`        | `pinnedAttrs` for `<td>` (type at `cell.tsx:62`) |
| `packages/data-grid/react/react/src/data-grid/footer-cell.tsx:64`  | `<td>`                                           |
| `packages/data-grid/react/react/src/data-grid/creating-row.tsx:87` | draft-row `<td>`                                 |

All five write `getIsPinned()`'s return value straight through, so they need **no code change** —
the value changes under them. Their **doc comments** name the old values:
`cell.tsx:88`, `footer-cell.tsx:45`, `pin-styles.ts:15`.

**Row-axis writers — unchanged, `'top' | 'bottom'`:** `body.tsx:156,172`,
`virtual-body.tsx:104,126`, `row.tsx:141` (type `row.tsx:37`, prose `row.tsx:64`, `body.tsx:67`).

**Selectors keyed on a column-axis `data-pinned` value** — every one of these must move together:

| `file:line`                                                                    | Selector                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `packages/data-grid/react/react/src/styles/global.css:86,87`                   | `[data-pinned='left']` (th, td)                               |
| `packages/data-grid/react/react/src/styles/global.css:90,91`                   | `[data-pinned='right']` (th, td)                              |
| `packages/data-grid/react/react/src/data-grid/pin-shadow-overlay.tsx:7`        | `LEFT_PINNED_CELL = "[data-slot='th'][data-pinned='left']"`   |
| `packages/data-grid/react/react/src/data-grid/pin-shadow-overlay.tsx:8`        | `RIGHT_PINNED_CELL = "[data-slot='th'][data-pinned='right']"` |
| `packages/data-grid/react/react/src/data-grid/data-attrs.test.tsx:100,176,177` | test selectors                                                |
| `apps/docs/e2e/packages/data-grid/pinning/columns.spec.ts:30`                  | `toHaveAttribute('data-pinned', 'left')`                      |
| `apps/docs/e2e/packages/data-grid/pinning/columns.spec.ts:33`                  | `[data-slot="tbody"] [data-slot="td"][data-pinned="left"]`    |

`columns.spec.ts:31,39` and `rows.spec.ts:24,26,27` use `data-pinned` **without a column value**
(`not.toHaveAttribute`, bare `[data-pinned]`, or `'top'`/`'bottom'`) and are unaffected.

Selectors that name `data-pinned` with **no value** and stay as they are:
`shadcn/src/styles.css:173,174,183,184,189,190,196,200`;
`heroui/src/styles.css:180,196,197,204,208`;
`shadcn/src/components/ui/table.tsx:71` (`data-[pinned]:bg-muted/40`).

### 1h. `data-pin-shadow` — writers and selectors

| `file:line`                                                                            | Role                                         |
| -------------------------------------------------------------------------------------- | -------------------------------------------- |
| `packages/data-grid/react/react/src/data-grid/pin-shadow-overlay.tsx:123`              | writes `data-pin-shadow='left'`              |
| `packages/data-grid/react/react/src/data-grid/pin-shadow-overlay.tsx:129`              | writes `data-pin-shadow='right'`             |
| `packages/data-grid/react/shadcn/src/styles.css:252`                                   | `[data-pin-shadow='left']`                   |
| `packages/data-grid/react/shadcn/src/styles.css:259`                                   | `[data-pin-shadow='right']`                  |
| `packages/data-grid/react/heroui/src/styles.css:166`                                   | `[data-pin-shadow='left']`                   |
| `packages/data-grid/react/heroui/src/styles.css:173`                                   | `[data-pin-shadow='right']`                  |
| `packages/data-grid/react/react/src/styles/global.css:210`                             | `[data-pin-shadow]` (valueless — unaffected) |
| `packages/data-grid/react/react/src/data-grid/data-attrs.test.tsx:115,139,140,185,186` | test selectors                               |
| `packages/data-grid/react/react/src/data-grid/pin-shadow-overlay.tsx:53`               | prose                                        |

**No e2e spec addresses `data-pin-shadow` at all** — the shadow is covered only by the four jsdom
tests in `data-attrs.test.tsx`.

### 1i. Type literals

| `file:line`                                                       | What                                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `packages/data-grid/react/shadcn/src/components/ui/table.tsx:90`  | `React.ComponentProps<'th'> & { pinned?: 'left' \| 'right' \| false }` |
| `packages/data-grid/react/shadcn/src/components/ui/table.tsx:109` | same for `<td>`                                                        |

These are **hand-written literals in a vendored `components/ui/**`file**, which AGENTS.md declares
immutable-by-default. HeroUI has no equivalent problem:`heroui/src/blocks/core/table-adapters.tsx:251,269`take`ThProps`/`TdProps`from`@ez-kit/data-grid-react`, which resolve through
`react/src/types.ts:213,214` (`pinned?: ColumnPinSide | false`) and follow automatically.
See trap T5.

`shadcn/src/components/ui/calendar.tsx:115,124` (`orientation === 'left'/'right'`) is
`react-day-picker`'s vocabulary, unrelated — do not touch.

### Count summary

| Kind                                                    | References                      | Files                  |
| ------------------------------------------------------- | ------------------------------- | ---------------------- |
| 1a `ColumnPinSide.Left/.Right`                          | 8                               | 2                      |
| 1b `GridMenuIcon.PinLeft/.PinRight`                     | 6                               | 3                      |
| 1c `ColumnActionId.PinLeft/.PinRight` (+ string values) | 4                               | 1                      |
| 1d `messages.pinLeft/.pinRight`                         | 4                               | 2                      |
| 1e `--dg-pin-left/right`                                | 4 code + 1 prose                | 3                      |
| 1e `--dg-pin-{left,right}-shadow`                       | 6 code + 2 prose                | 4                      |
| 1f `left:`/`right:` → `inset-inline-*`                  | 2 CSS + 2 inline style          | 2                      |
| 1g `data-pinned` column writers                         | 5 (value-transparent) + 3 prose | 5                      |
| 1g `data-pinned='left'/'right'` selectors               | 10                              | 4                      |
| 1h `data-pin-shadow='left'/'right'`                     | 11                              | 5                      |
| 1i `'left' \| 'right'` prop types                       | 2                               | 1                      |
| 1j `columnPinning.{left,right}` state shape (docs only) | 3                               | 2                      |
| **Total source/spec references**                        | **~63**                         | **~20 distinct files** |

Plus §5's docs inventory (36 further references across 19 files).

---

## 2. The four failing tests PR 2 left

All four are in
**`packages/data-grid/react/react/src/data-grid/data-attrs.test.tsx`**, in the
`describe` block covering pinning data attributes. Each constructs columns with
`pinning: { side: 'left' }` / `{ side: 'right' }` — a value `ColumnPinningDef.side?: ColumnPinSide`
no longer accepts (`core/src/column/types.ts:717`), so they fail **at typecheck** and, once forced
past that, at runtime: the seed never lands in `columnPinning.start` / `.end`, so nothing is pinned
and every assertion below finds `null`.

| Line   | Test name                                                                                     | What it asserts                                                                                                                                                                                                                                   |
| ------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `:88`  | `pinned columns emit data-pinned on th`                                                       | `[data-slot='th'][data-pinned='left']` exists for a column with `pinning: { side: 'left' }`.                                                                                                                                                      |
| `:103` | `renders pin-shadow overlays via data-pin-shadow when columns are pinned`                     | `[data-pin-shadow='left']` **and** `[data-slot='pin-shadow-overlay']` both render when one column is pinned.                                                                                                                                      |
| `:124` | `positions each pin shadow independently by the summed width of that side (>1 pinned column)` | Regression #42. With 2 left-pinned (180+120) and 1 right-pinned (90): `left.style.left === '300px'`, `right.style.right === '90px'`, and the overlay itself carries **neither** (`overlay.style.left === ''`).                                    |
| `:156` | `positions each pin shadow at the measured DOM edge of its pinned block`                      | The measured edge beats the model offset. Stubs `Element.prototype.getBoundingClientRect` keyed on `[data-slot='th'][data-pinned='left']` / `='right'` (lines 176-177) and expects `left.style.left === '304px'`, `right.style.right === '94px'`. |

**"Done" means all four green.** Note the last two are the only coverage the pin-shadow geometry
has anywhere — there is no e2e case for it — and their `getBoundingClientRect` stub is keyed on the
`data-pinned` **value**, so the rename has to reach line 176-177 or the stub silently stops matching
and both tests fall back to the zero rect (trap T6).

Beyond the tests, PR 2 also leaves these **typecheck** errors for PR 3 (derived, not measured —
`tsc` was not run):

- `utils/pin-styles.ts` — 4 errors (`ColumnPinSide.Left`/`.Right` ×2 each, lines 22,23,25,26)
- `data-grid/column-menu-sections.ts` — 6 errors (`ColumnPinSide.Left`/`.Right` at 117,123,127,133;
  `messages.pinLeft`/`.pinRight` at 120,130) plus 2 for `GridMenuIcon.PinLeft`/`.PinRight` (121,131)
- `shadcn/src/blocks/icons.tsx:41,42` and `heroui/src/blocks/icons.tsx:37,38` — 2 each
  (missing required key + excess property, against `Record<GridMenuIcon, …>`)
- `data-attrs.test.tsx:90,105,126,127,128,158,159,160` — 8 `pinning: { side: … }` literals

---

## 3. Task that makes the react package go green

**Task 2 below** (`pin-styles.ts` + `column-menu-sections.ts` + the four `data-attrs` tests). PR 2's
criterion explicitly excluded the column-pinning surface; those are the only react-package files
holding it. Everything after Task 2 is kits, CSS, registry and e2e.

---

## 4. shadcn registry payload — blast radius

`packages/data-grid/react/shadcn/registry.config.mjs` compiles, via
`scripts/generate-shadcn-registry-manifest.mjs`, everything under `src/` in these buckets:

- `srcDir: 'src'`
- `typeByTopDir`: `blocks/` → `registry:component`, `hooks/` → `registry:hook`,
  `lib/` → `registry:lib`, `components/` → `registry:ui`
- `rootFiles: ['data-grid.tsx', 'styles.css']`
- `excludeTopLevel: ['index.ts', 'index.test.ts']`
- `fileTypeOverrides`: `blocks/cell-types.ts` and `blocks/icons.tsx` → `registry:lib`,
  `styles.css` → `registry:file`

Output: `apps/docs/public/r/data-grid.json`, **97 files**. `npx shadcn add <url>` copies them
verbatim into a consumer's project.

**Of those 97, exactly three carry pinning names:**

| Registry path                 | Pinning content                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/blocks/icons.tsx`        | `GridMenuIcon.PinLeft` / `.PinRight` (source lines 41,42)                                                       |
| `src/styles.css`              | `[data-pin-shadow='left'/'right']` (252,259), `var(--dg-pin-left-shadow)` / `(--dg-pin-right-shadow)` (255,262) |
| `src/components/ui/table.tsx` | `pinned?: 'left' \| 'right' \| false` (90,109) — **vendored**, see T5                                           |

`src/components/ui/action-bar.tsx` matches `left:` / `right:` but as CSS positioning of a floating
bar, unrelated to pinning. `src/components/ui/calendar.tsx` matches `'left'` as day-picker
orientation, unrelated.

`apps/docs/public/r/data-grid.json` is a **generated artifact checked into the repo**. It must be
regenerated (`pnpm --filter @ez-kit/docs registry:build`) in the same PR, or the published registry
keeps serving `PinLeft` against a react package that no longer exports it — which is exactly the
"copied consumer gets different variable names on update" cost design §5 says goes into the
changeset **in those words**. The changeset should name all four breaks: `ColumnPinSide` members,
the icon map keys, the message keys, and the CSS variables.

Per AGENTS.md, `@ez-kit/data-grid-shadcn` must **not** appear in the changeset (it is `private` and
in `.changeset/config.json`'s `ignore`); the kit-visible change ships through
`@ez-kit/data-grid-react` and `@ez-kit/docs`.

---

## 5. The e2e surface

### Specs that address pinning

`apps/docs/e2e/packages/data-grid/pinning/` holds exactly two files:

**`columns.spec.ts`** (63 lines, example `column-pinning-static`, viewport 800×700):

| Line     | Selector / assertion                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| `:30`    | `grid.header('name')` → `toHaveAttribute('data-pinned', 'left')` — **breaks on rename**                           |
| `:31`    | `grid.header('status')` → `not.toHaveAttribute('data-pinned', /.*/u)` — value-free, survives                      |
| `:33`    | `[data-slot="tbody"] [data-slot="td"][data-pinned="left"]` — **breaks on rename**                                 |
| `:39`    | `[data-slot="th"][data-pinned], [data-slot="tbody"] [data-slot="td"][data-pinned]` — value-free, survives         |
| `:46`    | `getComputedStyle(free).position !== 'sticky'` baseline                                                           |
| `:50-62` | geometry: pinned header's `x` holds within 1px while `scrollBy({x: 200})` moves the free column the full distance |

**`rows.spec.ts`**: `data-pinned` with `'top'` / `'bottom'` only (`:24,26,27`) — **row axis, no change**.

`row-actions/row-actions.spec.ts:126` also asserts `data-pinned', 'top'` — row axis, no change.

`data-slot` literals used by these specs: `tr`, `th`, `td`, `tbody`, `table-scroll` (via
`apps/docs/e2e/fixtures.ts`). **None of them change**, which is precisely the problem — see below.

### RTL coverage: there is none, anywhere

Searched `apps/docs/e2e/**` and `apps/docs/shared/data-grid/examples/**` for `rtl`, `RTL`, `dir=`,
`dir:`, `direction:` — **zero matches**. No spec sets `direction`, no example sets it, and no
fixture offers it. Design §5's claim that "`direction` exists and `layout/sticky.spec.ts` covers
sticky" refers to the **grid option** (`core/src/types.ts:846`, `direction?: GridDirection`, with
`'rtl'` documented at `types.ts:716`) — not to any e2e coverage of it.

So PR 3 must author, for both kits:

1. an RTL example (there is no `direction: 'rtl'` example to point a spec at — a new component plus
   a `manifest.json` id plus a `registry.ts` entry if it is a new source file), and
2. an RTL pinning spec asserting that a `start`-pinned column sticks to the **right** viewport edge
   under `dir="rtl"`.

Without (1), (2) has nothing to open. This is the largest genuinely-new piece of work in PR 3.

### `apps/docs/test/e2e-slots.test.ts` — will **not** catch this rename

Read in full. It collects `data-slot="…"` **literals only** (`SLOT_AUTHORS` = the three data-grid
React package `src/` trees; `E2E_ROOT` = `apps/docs/e2e`) and fails on a spec slot no package
authors. It says nothing about `data-pinned`, `data-pin-shadow`, or any attribute **value**.

`pin-shadow-overlay` is the only pinning-related `data-slot` and it is not being renamed. So:
**`columns.spec.ts:30` and `:33` can go stale and every gate in `verify` stays green** — the exact
#233 failure mode the test was written to prevent, one attribute over. Its own guard test
(`reads both sides of the contract`, lines 46-51) would still pass.

---

## 6. Docs and `.mdx` — the list PR 4 inherits

**Do not rewrite these in PR 3** unless a task explicitly claims them; they are listed so PR 4 gets
a list rather than a search. Note `apps/docs/test/docs-option-names.test.ts` resolves documented
option names against the real exported types, so the `pinning/api.mdx` rows below will **fail
`verify`** once the react package builds — PR 3 may be forced to take at least `pinning/api.mdx`.

Relevant `page-type-map.ts` entries: `PinningApi` (:113), `PinningColumns` (:114), `PinningIndex`
(:149), `PinningRows` (:153), with the governing-type notes at `:466-479`.

### `.mdx` pages naming a pinning value

| `file:line`                                                       | What                                                                                                                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/docs/content/docs/data-grid/pinning/api.mdx:31`             | `false \| 'left' \| 'right' \| ColumnPinningDef`                                                                                                                  |
| `apps/docs/content/docs/data-grid/pinning/api.mdx:32`             | `pinning.side`: `'left' \| 'right'`                                                                                                                               |
| `apps/docs/content/docs/data-grid/pinning/api.mdx:33`             | `pinning.initialSide`: `'left' \| 'right'`                                                                                                                        |
| `apps/docs/content/docs/data-grid/pinning/api.mdx:42`             | `initialState.columnPinning`: `{ left?, right? }` → **`{ start, end }`**                                                                                          |
| `apps/docs/content/docs/data-grid/pinning/api.mdx:44`             | `state.columnPinning`: `{ left?, right? }` → **`{ start, end }`**                                                                                                 |
| `apps/docs/content/docs/data-grid/pinning/index.mdx:6-7`          | prose "left or right edge"                                                                                                                                        |
| `apps/docs/content/docs/data-grid/pinning/index.mdx:19`           | prose "stays against the left edge"                                                                                                                               |
| `apps/docs/content/docs/data-grid/pinning/index.mdx:43-44`        | **"`left` / `right` … are physical directions, not logical ones … does not flip when the grid runs right-to-left"** — the paragraph design §5 explicitly reverses |
| `apps/docs/content/docs/data-grid/pinning/index.mdx:53,54`        | code: `pinning: 'left'`, `pinning: { initialSide: 'left' }`                                                                                                       |
| `apps/docs/content/docs/data-grid/pinning/columns.mdx:18,19`      | `initialSide: 'left'` / `'right'`                                                                                                                                 |
| `apps/docs/content/docs/data-grid/pinning/columns.mdx:29,42`      | prose + `pinning: 'left'`                                                                                                                                         |
| `apps/docs/content/docs/data-grid/columns/index.mdx:40`           | `false \| 'left' \| 'right' \| { side?, initialSide? }`                                                                                                           |
| `apps/docs/content/docs/data-grid/columns/index.mdx:107`          | prose "pin to left/right"                                                                                                                                         |
| `apps/docs/content/docs/data-grid/columns/grouped-headers.mdx:65` | prose "left / centre / right"                                                                                                                                     |
| `apps/docs/content/docs/data-grid/selection/index.mdx:109`        | "Pinned `'left'` at `44px` by default"                                                                                                                            |
| `apps/docs/content/docs/data-grid/expanding/sub-content.mdx:30`   | "Pinned `'left'` at `44px` by default"                                                                                                                            |
| `apps/docs/content/docs/data-grid/row-actions/api.mdx:51`         | `false \| 'left' \| 'right' \| {…}`; "Defaults: `'left'` for selection and expand, `'right'` for actions"                                                         |
| `apps/docs/content/docs/data-grid/row-actions/index.mdx:6`        | prose "right edge"                                                                                                                                                |
| `apps/docs/content/docs/data-grid/state/index.mdx:16,96`          | `pinning: { initialSide: 'left' }`                                                                                                                                |
| `apps/docs/content/docs/data-grid/state/index.mdx:22`             | prose "`id` pinned left"                                                                                                                                          |
| `apps/docs/content/docs/data-grid/state/index.mdx:107`            | `initialState={{ columnPinning: { right: ['name'] } }}` → **`end`**                                                                                               |
| `apps/docs/content/docs/data-grid/state/index.mdx:117`            | prose "left and right ids"                                                                                                                                        |
| `apps/docs/content/docs/data-grid/state/index.mdx:152`            | `**pinning: 'left'` / `pinning: { side }`\*\*`                                                                                                                    |

Pages naming `data-pinned` **without a value** — no change needed:
`theming.mdx:26`, `kit-parity.mdx:73`, `pinning/columns.mdx:61`, `layout/index.mdx:63`,
`advanced/react.mdx:64`.

### Example components naming a pinning value

| `file:line`                                                                   | What                                                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `apps/docs/shared/data-grid/examples/components/column-pinning.tsx:11,16`     | `initialSide: 'left'`                                                                |
| `apps/docs/shared/data-grid/examples/components/column-pinning.tsx:35,41`     | `initialSide: 'right'`                                                               |
| `apps/docs/shared/data-grid/examples/components/pinning/static-column.tsx:11` | `pinning: 'left'` — **the `column-pinning-static` example `columns.spec.ts` drives** |
| `apps/docs/shared/data-grid/examples/components/pinning/both-axes.tsx:11`     | `initialSide: 'left'`                                                                |
| `apps/docs/shared/data-grid/examples/components/columns/combined.tsx:15,32`   | `initialSide: 'left'` / `'right'`                                                    |
| `apps/docs/shared/data-grid/examples/components/crud/columns.ts:10`           | `initialSide: 'left'`                                                                |
| `apps/docs/shared/data-grid/examples/components/production/data.ts:97`        | `initialSide: 'left'`                                                                |
| `apps/docs/shared/data-grid/examples/components/localization.tsx:54,55`       | `pinLeft` / `pinRight` message keys                                                  |

**`pinning/static-column.tsx:11` is not PR 4's** — `columns.spec.ts` opens that example, so PR 3's
e2e task has to take it together with the spec, or the browser suite finds an unpinned column.

---

## 7. Proposed task breakdown

Ordered. Each is sized for one subagent and carries its own checkable criterion. Tasks 4 and 5 are
the DOM-contract pair and **must land in one commit**.

---

**Task 1 — Inventory reconciliation (5 min, do first).**
Read `specs/005-tanstack-table-v9/pr2-outcomes.md` (written after this pass) and diff its Task 21
residue against §2 above. Reconcile any disagreement before touching code.
_Criterion:_ the failing-test list and error counts in §2 are confirmed or corrected in writing.

---

**Task 2 — The react package's pinning half. ⭐ This is the task that makes `--filter @ez-kit/data-grid-react` go green.**
Files: `utils/pin-styles.ts`, `data-grid/column-menu-sections.ts`, `data-grid/data-attrs.test.tsx`,
`utils/visual-column-order.ts` (the stale comment, lines 26-28),
`utils/visual-column-order.test.ts:10,22,23,27,38,39` (the mock's `'left'`/`'right'`).
Rename: §1a, §1c, §1d's two source sites, §1b's two source sites, and the four tests' `side:` seeds
plus their `data-pinned` selectors (`:100,176,177`) and `data-pin-shadow` selectors
(`:115,139,140,185,186`). Also `--dg-pin-left`/`--dg-pin-right` → `--dg-pin-start`/`--dg-pin-end` at
`pin-styles.ts:23,26` and the matching `global.css:86-93` rules, switched to
`inset-inline-start` / `inset-inline-end`.
_Criterion:_ `pnpm --filter @ez-kit/data-grid-react run build lint typecheck test` all green,
including the four `data-attrs.test.tsx` tests named in §2. `rg "ColumnPinSide\.(Left|Right)"` over
`packages/data-grid/react/react/src` returns nothing.

---

**Task 3 — Both kits' icon maps.**
`shadcn/src/blocks/icons.tsx:41,42`, `heroui/src/blocks/icons.tsx:37,38`.
`GridMenuIcon.PinLeft/.PinRight` → `.PinStart/.PinEnd`. The glyphs stay `ArrowLeft` / `ArrowRight`
— the English default strings stay `'Pin Left'` / `'Pin Right'`, and the glyph follows the wording,
not the key (same convention as `MoveStart` → `ChevronLeft` on the line below).
_Criterion:_ `pnpm --filter @ez-kit/data-grid-shadcn typecheck` and
`--filter @ez-kit/data-grid-heroui typecheck` green; `Record<GridMenuIcon, …>` accepts both maps.

---

**Task 4 — The DOM contract: `data-pinned` and `data-pin-shadow` values. ⚠️ Pairs with Task 5.**
Writers: nothing to change for `data-pinned` (§1g — the five writers are value-transparent), but
**`pin-shadow-overlay.tsx:7,8,123,129`** must move (`LEFT_PINNED_CELL`/`RIGHT_PINNED_CELL`
selectors and the two `data-pin-shadow` values). Decide and record the inline-offset question —
trap T3 — before writing.
Doc comments to correct in the same pass: `cell.tsx:88`, `footer-cell.tsx:45`, `pin-styles.ts:15`,
`pin-shadow-overlay.tsx:53,68`, `table.tsx:111`, `visual-column-order.ts:5-6,26-28`,
`heroui/src/styles.css:218-219`.
_Criterion:_ every string literal spelling a column-axis pin side in the three packages' `src/` is
`start`/`end`; `rg "data-pin(ned|-shadow)='(left|right)'" packages/data-grid/react/*/src` empty.

---

**Task 5 — Both kits' stylesheets + the shadcn vendored prop type. ⚠️ Pairs with Task 4.**
`shadcn/src/styles.css:252,255,259,262`; `heroui/src/styles.css:166,169,173,176`.
`[data-pin-shadow='left'/'right']` → `'start'/'end'`; `--dg-pin-left-shadow` / `--dg-pin-right-shadow`
→ `--dg-pin-start-shadow` / `--dg-pin-end-shadow`, matched against the writers at
`react/src/data-grid/table.tsx:29,30`. The two `inset 10px` / `inset -10px` box-shadow offsets are
physical and must become logical or be swapped under RTL — decide explicitly.
`shadcn/src/components/ui/table.tsx:90,109`: `pinned?: 'left' | 'right' | false` →
`'start' | 'end' | false`. This is a deliberate edit to a vendored file — justify it in the commit
message per AGENTS.md (see T5).
_Criterion:_ `rg -- "--dg-pin-(left|right)"` over `packages/` returns nothing; both kits typecheck;
no `[data-pin-shadow='left'|'right']` rule survives.

---

**Task 6 — Registry payload regeneration + changeset.**
`pnpm --filter @ez-kit/docs registry:build`; commit the regenerated
`apps/docs/public/r/data-grid.json`. Write a `minor` changeset (never `major` — design §6's
changesets trap: `major` on `0.x` publishes `1.0.0`) against `@ez-kit/data-grid-react` and
`@ez-kit/docs`, **never** `@ez-kit/data-grid-shadcn`. The text names all four breaks in plain words:
`ColumnPinSide` members, both kits' icon-map keys, the `columnMenu.pinLeft`/`.pinRight` message
keys, and the `--dg-pin-*` CSS variables a `shadcn add` consumer has already copied.
_Criterion:_ `node scripts/check-changesets.mjs` passes; the regenerated JSON contains no
`PinLeft` / `PinRight` / `--dg-pin-left-shadow` / `--dg-pin-right-shadow`; `git diff` on the JSON
touches exactly `icons.tsx`, `styles.css` and `components/ui/table.tsx`.

---

**Task 7 — e2e: update the existing column-pinning spec and its example.**
`apps/docs/e2e/packages/data-grid/pinning/columns.spec.ts:30,33` → `'start'`.
`apps/docs/shared/data-grid/examples/components/pinning/static-column.tsx:11` → `pinning: 'start'`
(the example the spec opens; if it stays `'left'` the column is not pinned and every assertion in
the file fails).
_Criterion:_ `e2e` passes for both kits on the `pinning/` directory. Verify by **reading the spec
back** as well as running it: a value-keyed selector that matches nothing produces a clean
"expected 1, got 0" and not an error, so a half-applied rename looks like a real regression.

---

**Task 8 — e2e: the new RTL pinning case (both kits).**
No RTL example and no RTL spec exist (§5). Author:
(a) an example component under `apps/docs/shared/data-grid/examples/components/pinning/` setting
`direction: 'rtl'` with one `start`-pinned and one `end`-pinned column;
(b) its `manifest.json` entry (`id` → `sourceFile` + `exportName`) **and** its `registry.ts` entry
(hand-maintained; a miss throws only at page render, and lint/typecheck/build all still pass);
(c) a spec asserting the `start`-pinned column sticks to the **right** viewport edge under RTL and
holds its `x` across `scrollBy`, mirroring `columns.spec.ts:50-62`.
_Criterion:_ `e2e` green for both kits; `node apps/docs/scripts/verify-manifest-coverage.mjs`
passes (the new example must be referenced from some `.mdx`).

---

**Task 9 — `pinning/api.mdx` (forced scope only).**
`docs-option-names.test.ts` resolves documented option names against the real exported types, so
`pinning/api.mdx:31-33,42,44` fails `verify` the moment the packages build. Take **only** that page
(plus its `page-type-map.ts` entry at `:113` if a count drifts), and leave the other 18 docs files
in §6 to PR 4.
_Criterion:_ `pnpm --filter @ez-kit/docs test -- docs-option-names` green.

---

**Not in PR 3** (PR 6's tail, per design §7): the AGENTS.md rewrite of the "align is logical,
pinning is physical" rule, and the "row pinning stays `top`/`bottom` — two axes, not an
inconsistency" note. PR 3 should not touch AGENTS.md.

---

## 8. Traps

Ordered by how likely each is to ship undetected.

**T1 — The shadow-opacity variables fail open. (highest risk)**
`--dg-pin-left-shadow` / `--dg-pin-right-shadow` are written by JS
(`table.tsx:29,30`, via `style.setProperty` — a **string**, invisible to TypeScript) and read by
four CSS rules, each with a `, 0` fallback (`shadcn/styles.css:255,262`;
`heroui/styles.css:169,176`). Rename the writer and miss one consumer and that kit's pin shadow is
permanently invisible, with no type error, no test failure — `data-attrs.test.tsx` asserts the
overlay's **position**, never its opacity — and no e2e assertion (§5: no spec addresses
`data-pin-shadow` at all). This is precisely the "a value that silently stops being reached"
defect, and this variable pair is its cleanest instance in the repo.
_Mitigation:_ rename writer and all four consumers in one commit (Tasks 4+5 paired), then
`rg -- "--dg-pin-(left|right|start|end)-shadow" packages/` and confirm 2 writers / 4 consumers of
the **new** name and zero of the old.

**T2 — `pinLeft` / `pinRight` are message keys a consumer overrides, and a stale one may not error.**
`apps/docs/shared/data-grid/examples/components/localization.tsx:54,55` passes
`columnMenu: { pinLeft: 'Закрепить слева', pinRight: 'Закрепить справа' }`. If the `messages` option
takes a deep-`Partial` (which a localization API normally does), a stale key is **accepted and
ignored** — the example renders the English default and nothing fails. Verify the option's exactness
before assuming the compiler catches it; if it does not, every consumer's translation silently
reverts to English on upgrade. That is the strongest argument for the changeset naming the message
keys explicitly (Task 6).

**T3 — The pin-shadow offsets are measured physically and cannot simply be renamed.**
`pin-shadow-overlay.tsx:124,130` set inline `style={{ left: … }}` / `{ right: … }` from
`measurePinnedEdges()` (`:31-44`), which computes
`lastLeft.getBoundingClientRect().right - box.left` and `box.right - firstRight…left` — **viewport
coordinates, genuinely physical**. Under RTL the `start`-pinned block sits on the right, so
`edges.left` would be measured from the wrong block. Renaming the `data-pin-shadow` value to
`start`/`end` while leaving the inline style physical is coherent only if the measurement also flips.
There are three defensible answers (keep physical inline + logical attribute; go fully logical with
`insetInlineStart`; branch on `direction`) and picking one silently is how this ships wrong. Decide
in Task 4, in writing, and note that `data-attrs.test.tsx:144,145,185,186` assert
`style.left` / `style.right` by name — whichever answer wins, those four expectations move with it.

**T4 — `ColumnActionId`'s string values (`'pin-left'` / `'pin-right'`) reach the DOM and are not in §3.1.**
`column-menu-sections.ts:16,17`. `ColumnActionId` is exported (`:12,24`), so the ids are public: a
consumer's menu customisation or a QA selector can key on them. Renaming the const members without
the string values leaves `PinStart: 'pin-left'` — internally consistent, externally stale, and
nothing tests it. Renaming both is a further consumer break that belongs in the changeset. Either
choice is defensible; making it by accident is not.

**T5 — `shadcn/src/components/ui/table.tsx` is vendored-immutable and holds a `'left' | 'right'` literal.**
Lines 90 and 109 hand-write `pinned?: 'left' | 'right' | false` rather than importing `ColumnPinSide`
— so the type does **not** follow core's rename (HeroUI's does, via
`ThProps`/`TdProps` → `react/src/types.ts:213,214`). AGENTS.md forbids casual edits to
`components/ui/**` and directs new behaviour to `blocks/`. But this file is already this repo's
deliberate fork (`display: 'block'`, `data-[pinned]:bg-muted/40` at `:71`), and moving the prop type
to a `blocks/` wrapper would restructure a registry payload file for a two-token change. Editing it
in place is the right call — but it needs saying in the commit message, not doing quietly, and the
regenerated registry JSON is the thing that reaches consumers.

**T6 — `data-attrs.test.tsx`'s `getBoundingClientRect` stub is keyed on the `data-pinned` value.**
Lines 176-177 match `"[data-slot='th'][data-pinned='left']"` / `='right'`. Rename the attribute value
in the source and not in the stub and the stub matches nothing, every element falls through to the
zero rect at `:179`, `measurePinnedEdges` returns `NO_EDGES` (because `box.width === 0` at `:33`),
the model fallback kicks in, and the test fails with `'300px'` vs `'304px'` — a _plausible-looking_
geometry failure that reads as a real pinning regression rather than as a stale selector. Budget
time for this one being misdiagnosed.

**T7 — `visual-column-order.ts:26-28` is a comment that is now factually false, and its test mocks the old values.**
The comment says "upstream renamed the getters, not the `'left'` / `'right'` pinning positions,
which this package still writes (AGENTS.md: column pinning is physical)". Upstream renamed **both**
(`ColumnPinningPosition = false | 'start' | 'end'`), and AGENTS.md's rule is the one design §5
rewrites. Worse, `visual-column-order.test.ts:27` mocks
`getIsPinned: () => … 'left' … 'right' … false` through an
`as unknown as DataTable<GridFeatures, object>` cast (`:42`) — so the mock type-checks and the test
passes while feeding the production code a value it can never receive in reality. The test proves
nothing about pinning and would keep passing through the whole rename.

**T8 — `e2e-slots.test.ts` gives no cover here, and it is easy to assume it does.**
It compares `data-slot` **literals** only (§5). `data-pinned` and `data-pin-shadow` are different
attributes, and attribute _values_ are outside its regex entirely. `columns.spec.ts:30,33` can go
stale with every `verify` gate green — the #233 failure mode one attribute over. Do not treat a
green `verify` as evidence the e2e selectors survived; read them.

**T9 — `columnPinning` state shape is a fourth dead name set nobody inventoried.**
v9's `ColumnPinningState` is `{ start, end }`. Core migrated; the docs did not
(`pinning/api.mdx:42,44`, `state/index.mdx:107`). A consumer copying
`initialState={{ columnPinning: { right: ['name'] } }}` out of the docs writes an object with no
recognised key — which merges to "nothing pinned" rather than throwing. `pr1-outcomes.md` §3.1
lists three dead name sets; this is the fourth.

---

## 9. Where this pass disagrees with `pr1-outcomes.md` §3.1

1. **Line numbers moved.** `pin-styles.ts` is `22,23,25,26` (§3.1: `21,22,24,25`);
   `column-menu-sections.ts` `ColumnPinSide` sites are `117,123,127,133` (§3.1: `116,122,126,…`) and
   its `messages` sites are `120,130` (§3.1: `119,129`). The `GridMenuIcon` sites in both kits'
   `icons.tsx` are unchanged (`shadcn:41,42`, `heroui:37,38`), but in `column-menu-sections.ts` they
   are `16,17,121,131` (§3.1: `15,16,120,130`).
2. **Three dead name sets is four.** §3.1 omits `ColumnPinningState`'s `{ left, right }` →
   `{ start, end }` (T9), which core has already taken and the docs have not.
3. **§3.1 omits `ColumnActionId.PinLeft`/`.PinRight` and its `'pin-left'`/`'pin-right'` string
   values** (T4) — a fifth surface if the strings are counted separately.
4. **"everything else only compares `getIsPinned()`" understates the CSS side.** True of the five
   TSX writers, but `pin-shadow-overlay.tsx:7,8` holds two hard-coded value selectors, and there are
   10 `[data-pinned='left'|'right']` and 11 `[data-pin-shadow='left'|'right']` sites across CSS,
   tests and specs (§1g, §1h).
