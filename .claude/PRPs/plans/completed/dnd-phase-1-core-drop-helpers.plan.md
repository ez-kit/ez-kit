# Plan: DnD Phase 1 — Core drop helpers

## Summary

Add `canDropRow` / `dropRow` and `canDropColumn` / `dropColumn` to `@ez-kit/data-grid-core`'s
ordering feature: pure helpers that validate and describe a **direct** move of one row/column onto
another, enforcing exactly the refusals the existing one-step helpers enforce. This is the only
place DnD boundaries are enforced, and it lands before any drag code exists — nothing in this phase
imports React or `@dnd-kit`.

## User Story

As an application developer wiring a drag affordance over the grid's existing ordering state,
I want a `drop` helper that validates a landing spot with the same rules a menu step honours,
so that a drag can never produce an arrangement the step path would have refused.

## Problem → Solution

`moveRow` / `moveColumn` describe a move to the **adjacent** item, computed by walking the order
from the source (`findNeighbour`). A drag names its target directly and may span many positions, so
there is nothing to walk — but the boundary rules (same pin band, same parent, both ends movable,
target in scope, no applied sort, no applied grouping) must still hold.
→ Two new helper pairs, one per axis, each mirroring the return convention of its own axis's step
helper, plus `canDropRow` / `dropRow` on `RowOrderingApi` so the controlled/uncontrolled mode switch
is not reimplemented in React.

## Metadata

- **Complexity**: Medium
- **Source PRD**: `.claude/PRPs/prds/data-grid-dnd.prd.md` (revision 3)
- **PRD Phase**: Phase 1 — Core drop helpers
- **Estimated Files**: 7 (2 created, 5 updated)
- **Parallel with**: Phase 2 (The port) — different packages, no shared file
- **Depends on**: nothing

---

## UX Design

N/A — internal change. This phase adds no affordance and renders nothing. The user-visible drag
arrives in Phase 4. The one user-observable consequence, enforced here, is negative: an illegal drop
is **refused on release** (no `onChange`, no state write, the item snaps back) rather than signalled
mid-drag. That trade is recorded in the PRD under _Boundaries, enforced at the commit_ and the
"Could"-tier invalid-drop affordance is the follow-up.

### Interaction Changes

| Touchpoint           | Before                                                   | After                                                      | Notes                                                                                                                                                         |
| -------------------- | -------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public core API      | `moveRow` / `canMoveRow`, `moveColumn` / `canMoveColumn` | + `dropRow` / `canDropRow`, `dropColumn` / `canDropColumn` | Additive only; no existing signature changes                                                                                                                  |
| `table.ordering`     | `canMoveRow`, `moveRow`                                  | + `canDropRow`, `dropRow`                                  | Additive member on `RowOrderingApi`                                                                                                                           |
| Existing affordances | menu entries, `Alt+Arrow`, column panel                  | unchanged                                                  | `ordering.test.ts`, `row-ordering.test.ts`, `row-ordering-feature.test.ts`, `row-ordering-keyboard.test.tsx`, `tree-row-ordering.test.tsx` must not be edited |

---

## Mandatory Reading

| Priority | File                                                                    | Lines        | Why                                                                                                                                                                                                 |
| -------- | ----------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | `packages/data-grid/core/src/features/ordering/ordering.ts`             | 1–176        | The column axis in full: `OrderableColumn`, `ColumnOrderingTable`, `pinnedBand`, `isVisible`, `isMovable`, `findNeighbour`, `canMoveColumn`, `moveColumn`. `dropColumn` reuses five of these seven. |
| P0       | `packages/data-grid/core/src/features/ordering/row-ordering.ts`         | 1–186        | The row axis in full: `RowMove`, `OrderableRow`, `RowOrderingTable`, `findNeighbour`, `canMoveRow`, `moveRow`, `applyRowMove`. `dropRow` mirrors `moveRow`'s structure exactly.                     |
| P0       | `packages/data-grid/core/src/features/ordering/row-ordering-feature.ts` | 93–178       | `isTopLevelRow`, `rowOrderingOption`, and the `canMoveRow` / `moveRow` API pair whose controlled/uncontrolled split `canDropRow` / `dropRow` copy verbatim.                                         |
| P1       | `packages/data-grid/core/src/features/ordering/ordering.test.ts`        | 1–219        | The exact test shape to mirror: `makeTable` helper, `ORDERING` feature set, AAA with `// Arrange` only in the first case of a `describe`, prose comments that say _why_.                            |
| P1       | `packages/data-grid/core/src/features/ordering/row-ordering.test.ts`    | 1–268        | Same, for rows: three feature sets (`ROW_ORDERING`, `ROW_ORDERING_GROUPED`, `ROW_ORDERING_TREE`), the `TREE` fixture, the sort/grouping/band/tree cases to duplicate for drops.                     |
| P1       | `packages/data-grid/core/src/types.ts`                                  | 640–704      | `ColumnOrderingConfig` (`onChange` receives the **full** order), `RowOrderingConfig` (`onChange` receives one `RowMove`; its presence selects controlled mode), `OrderingConfig`.                   |
| P2       | `packages/data-grid/core/src/index.ts`                                  | 191–207      | The existing ordering export block the new names join, and the docblock explaining why these helpers live in core rather than the React layer.                                                      |
| P2       | `packages/data-grid/core/src/features/entry.ts`                         | 101–106      | `export { rowOrderingFeature, type RowOrderState, type RowOrderingApi } from './ordering'` — `RowOrderingApi` already reaches the features entry, so an added member needs no export change.        |
| P2       | `packages/data-grid/react/react/src/data-grid/header-cell.tsx`          | 275–277      | The call shape a Phase 4/5 caller will copy: `if (!canMoveColumn(...)) return; table.setColumnOrder(moveColumn(...))`. Read it to see why `canDropColumn` must exist beside `dropColumn`.           |
| P2       | `packages/data-grid/core/src/feature-state/feature-state.ts`            | 59, 139, 149 | `AnyTable`, `readOwnSlice` (throws by name on a missing own slice), `readForeignSlice` (returns `undefined`).                                                                                       |

## External Documentation

None. This phase touches no external library.

**No external research needed** — the helpers are pure functions over types this package already
declares, mirroring helpers that already exist two files away. The one external reference informing
the _design_ was already read for the PRD (TanStack's `examples/react/row-dnd`, whose `arrayMove`
never consults a direction — which is why `applyRowMove` is untouched here).

---

## Patterns to Mirror

### NAMING_CONVENTION — closed sets, helper pairs, structural table types

```ts
// SOURCE: packages/data-grid/core/src/features/ordering/ordering.ts:57-79
export const ColumnMoveDirection = {
	Start: 'start',
	End: 'end',
} as const

export type ColumnMoveDirection = (typeof ColumnMoveDirection)[keyof typeof ColumnMoveDirection]
```

Const object + same-named union type. **No new closed set is introduced in this phase** — `DragAxis`
belongs to Phase 2's port, not here.

```ts
// SOURCE: packages/data-grid/core/src/features/ordering/ordering.ts:42
type ColumnOrderingTable = { getAllLeafColumns: () => OrderableColumn[] }

// SOURCE: packages/data-grid/core/src/features/ordering/row-ordering.ts:76
export type RowOrderingTable = AnyTable & { getRowModel: () => { rows: OrderableRow[] } }
```

Tables are named **structurally**, never as `Table<TFeatures, TData>`. Both files carry a long
docblock explaining that both alternatives were tried and why each fails (`TS2339` with `TFeatures`
unresolved; `TS2379` at every call site with the all-in instantiation). **Reuse these existing
types — do not declare new ones.**

### ERROR_HANDLING — refusal is a return value, never a throw

```ts
// SOURCE: packages/data-grid/core/src/features/ordering/ordering.ts:135-146
export function canMoveColumn(
	table: ColumnOrderingTable,
	columnId: string,
	direction: ColumnMoveDirection,
	scope: ColumnMoveScope = ColumnMoveScope.Visible,
): boolean {
	const columns = table.getAllLeafColumns()
	const index = columns.findIndex((column) => column.id === columnId)
	const column = columns[index]
	if (!column || !isMovable(column)) return false
	return findNeighbour(columns, index, direction, scope) !== undefined
}
```

Every refusal — unknown id, locked item, band crossing, parent crossing, applied sort — is a `false`
or an `undefined` or the-order-unchanged. Nothing in this module throws. The single exception is
`readOwnSlice(table, 'rowOrder')`, which throws `state slice "rowOrder" is missing` when the table
never registered `rowOrderingFeature` — a composition mistake, not a runtime condition. `dropRow`
inherits that throw by calling `readOwnSlice`, and the test for it already exists for `moveRow`
(`row-ordering.test.ts:227`); add the twin.

### LOGGING_PATTERN

None. **These modules log nothing.** Development-mode warnings in this package live in
`create-table/create-table-options.ts` (`REQUIRED_FEATURE`, the `pageSize`-written-twice warning),
not in feature helpers. Do not add a `console.warn` to a drop helper.

### DATA_ACCESS — slices read one at a time, own vs foreign distinguished

```ts
// SOURCE: packages/data-grid/core/src/features/ordering/row-ordering.ts:146-160
if ((readForeignSlice(table, 'sorting') ?? []).length > 0) return undefined
if ((readForeignSlice(table, 'grouping') ?? []).length > 0) return undefined
const rowOrder = readOwnSlice(table, 'rowOrder')

// Projected through `rowOrder` rather than read straight off the row model. An adapter
// rendering an uncontrolled order feeds `applyRowOrder`'s result back as `data`, which makes
// this projection a no-op — but a grid that has not done so yet would otherwise compute
// every move from the original positions, so a second step would undo the first.
const rows = applyRowOrder(table.getRowModel().rows, rowOrder, (row) => row.id)
```

`sorting` and `grouping` are **foreign** (`readForeignSlice`, absent ⇒ no sort/grouping); `rowOrder`
is the feature's **own** (`readOwnSlice`, absent ⇒ named throw). The `applyRowOrder` projection is
load-bearing and `dropRow` must do it too, for the identical reason.

### FEATURE_API — mode switch lives in the feature, not the helper

```ts
// SOURCE: packages/data-grid/core/src/features/ordering/row-ordering-feature.ts:134-171
const api: RowOrderingApi = {
	canMoveRow: (rowId, direction) => {
		const config = rowOrderingOption(table)
		if (config === undefined) return false
		if (config.onChange === undefined && !isTopLevelRow(table, rowId)) return false
		return moveRow(table, rowId, direction) !== undefined
	},

	moveRow: (rowId, direction) => {
		const config = rowOrderingOption(table)
		if (config === undefined) return

		const move = moveRow(table, rowId, direction)
		if (!move) return

		if (config.onChange) {
			config.onChange(move)
			return
		}

		if (!isTopLevelRow(table, rowId)) return

		const order = applyRowOrder(
			table.getCoreRowModel().rows.map((row) => row.id),
			readOwnSlice(table, 'rowOrder'),
			(rowId) => rowId,
		)
		writeOwnSlice(table, 'rowOrder', applyRowMove(order, move))
	},
}

assignTableInstanceData('rowOrderingFeature', table, { ordering: api })
```

Four things to copy exactly: the config is read **per call** (never captured at construction,
because the React adapter re-syncs `rowOrdering` every render); `config === undefined` means the
axis is off; `isTopLevelRow` gates the **uncontrolled** path only; the uncontrolled write
materialises a full order from `getCoreRowModel()` via `applyRowOrder` _before_ splicing, because
`applyRowMove` returns an order naming neither id unchanged.

### TEST_STRUCTURE

```ts
// SOURCE: packages/data-grid/core/src/features/ordering/ordering.test.ts:27-48
/**
 * Everything a column move can read: the order it writes, plus the pin band and the visibility
 * flag its neighbour rules consult. `rowSelectionFeature` is here for the one case that asks
 * whether a system column may move. Which of them a given case actually exercises is decided by
 * the config literal, not by the registration.
 */
const ORDERING = tableFeatures({
	columnOrderingFeature,
	columnPinningFeature,
	columnVisibilityFeature,
	rowSelectionFeature,
})

function makeTable(columns: ColumnDef<Row>[], config: Record<string, unknown> = {}) {
	return createTable({
		features: ORDERING,
		data: DATA,
		columns: createColumns<Row>(columns),
		ordering: true,
		...config,
	})
}

const FLAT: ColumnDef<Row>[] = [
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age' },
]
```

```ts
// SOURCE: packages/data-grid/core/src/features/ordering/ordering.test.ts:50-68
describe('moveColumn', () => {
	it('swaps a column with its neighbour, one step at a time', () => {
		// Arrange
		const table = makeTable(FLAT)

		// Act
		const order = moveColumn(table, 'email', ColumnMoveDirection.Start)

		// Assert
		expect(order).toEqual(['email', 'name', 'age'])
	})

	it('writes the complete order, never a partial one', () => {
		// A partial `columnOrder` reads to TanStack as "these first, then the rest as declared",
		// so anything short of the full list reorders columns nobody touched.
		const table = makeTable(FLAT)

		expect(moveColumn(table, 'name', ColumnMoveDirection.End)).toHaveLength(FLAT.length)
	})
```

Note the house style precisely: `describe` per exported function; `it` names state a **behaviour**
in prose ("does not land on a locked column either"), not a mechanism; `// Arrange` / `// Act` /
`// Assert` markers appear in the **first** case of a `describe` and are dropped afterwards when the
body is three lines; every non-obvious case opens with a comment saying _why the rule exists_, not
what the code does. Vitest, `describe` / `it` / `expect` imported from `'vitest'`. Tests live beside
the source as `<module>.test.ts`.

---

## Files to Change

| File                                                                         | Action | Justification                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/data-grid/core/src/features/ordering/drop.ts`                      | CREATE | `canDropColumn` / `dropColumn` / `canDropRow` / `dropRow` — the pure helpers. One module rather than appending to `ordering.ts` and `row-ordering.ts`: it keeps the drop rules readable as one set, and the step files are already 176/186 lines of dense docblock. |
| `packages/data-grid/core/src/features/ordering/drop.test.ts`                 | CREATE | The refusal matrix. One test per refusal, per the phase's success criteria.                                                                                                                                                                                         |
| `packages/data-grid/core/src/features/ordering/ordering.ts`                  | UPDATE | Export `isMovable`, `pinnedBand`, `isVisible` and the `OrderableColumn` / `ColumnOrderingTable` types for `drop.ts` (module-internal today). No behaviour change.                                                                                                   |
| `packages/data-grid/core/src/features/ordering/row-ordering.ts`              | UPDATE | Export `pinnedBand` and the `OrderableRow` type for `drop.ts`. No behaviour change.                                                                                                                                                                                 |
| `packages/data-grid/core/src/features/ordering/index.ts`                     | UPDATE | `export * from './drop'` — the folder barrel that `features/entry.ts` and `src/index.ts` read through.                                                                                                                                                              |
| `packages/data-grid/core/src/features/ordering/row-ordering-feature.ts`      | UPDATE | `RowOrderingApi` gains `canDropRow` / `dropRow`; `initTableInstanceData` implements them beside the step pair.                                                                                                                                                      |
| `packages/data-grid/core/src/features/ordering/row-ordering-feature.test.ts` | UPDATE | The API-level cases: controlled emits one `RowMove`, uncontrolled writes `rowOrder`, uncontrolled refuses a child row, axis off refuses.                                                                                                                            |
| `packages/data-grid/core/src/index.ts`                                       | UPDATE | Add the four names to the existing ordering export block (lines 196–207).                                                                                                                                                                                           |

## NOT Building

- **No changeset.** The PRD puts every changeset in Phase 11, on `@ez-kit/data-grid-core` among
  others. Writing one here would sit in `.changeset/` across ten phases and drift.
- **No React code.** Nothing in `packages/data-grid/react/**` changes. The existing call sites
  (`header-cell.tsx:275`, `column-menu-sections.ts:115`, `visibility-trigger.tsx:75`, `row.tsx:231`,
  `build-row-order-items.ts:33`) are untouched.
- **No change to `applyRowMove`.** Explicitly removed in PRD r3. It splices to the target's index
  and never reads `direction`, and that is correct for a drop for the same reason `arrayMove` is
  correct in TanStack's example: the drop index comes from the collision model that drew the
  displacement.
- **No change to `moveRow` / `moveColumn` / `canMoveRow` / `canMoveColumn` / `findNeighbour` /
  `applyRowOrder`.** Only visibility (`export`) changes on three private helpers and two types.
- **No `DragAxis`, no `DragSpec`, no `DndAdapter`, no `data-*` attribute.** Phase 2.
- **No composite `group` key / band+parent encoding.** Removed in PRD r3.
- **No mid-drag validity signal.** The "Could"-tier invalid-drop affordance is a later phase; this
  phase is the refusal it would eventually pre-empt.
- **No `dropColumn` counterpart on a feature API.** `columnOrderingFeature` is TanStack's own and
  has no `ordering` namespace; the column commit already goes `table.setColumnOrder(moveColumn(…))`
  from React. `dropColumn` stays a pure helper, matching the axis's existing shape.
- **No cross-band, cross-parent, cross-page or multi-item drop support.** These are the refusals,
  not gaps.
- **No documentation page.** Phase 11 owns docs, the `DocPage` map and `PAGE_ENTRIES`.

---

## Design decisions to implement as written

Three decisions the PRD left open or flagged; resolve them exactly this way.

**1. Return conventions mirror the _axis_, not each other.** The PRD notes `dropColumn →
ColumnOrderState | undefined` "is a new convention rather than a mirror: align it or justify it".
**Aligned.** Each axis's drop pair copies that axis's step pair, and the inter-axis asymmetry
already exists for a documented reason (`RowOrderingConfig.onChange` takes one `RowMove` because a
server-paginated grid cannot name the order of rows it does not hold; `ColumnOrderingConfig.onChange`
takes the full order because a partial `columnOrder` silently reorders untouched columns):

|        | Predicate                                                         | Producer                                                                | On refusal                   |
| ------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------- |
| Row    | `canDropRow(table, rowId, targetRowId): boolean`                  | `dropRow(table, rowId, targetRowId): RowMove \| undefined`              | `undefined`                  |
| Column | `canDropColumn(table, columnId, targetColumnId, scope?): boolean` | `dropColumn(table, columnId, targetColumnId, scope?): ColumnOrderState` | the current order, unchanged |

A caller therefore writes the shape that already exists in `header-cell.tsx:275`:
`if (!canDropColumn(...)) return; table.setColumnOrder(dropColumn(...))`. This is what keeps the
PRD's "exactly 1 `onChange` per drag" metric reachable — a refused drop fires **zero**.

**2. `direction` is derived and informational.** `dropRow` computes it from the resolved positions
in the projected rendered list (`targetIndex < sourceIndex ? Up : Down`) and says so in its
docblock: _the two ids are the source of truth; `direction` describes which way the row travelled
and nothing consumes it to compute a position._ `applyRowMove` is the proof — it splices by index
and never reads the field.

**3. The tree-row rule, written down in three places.** A child row drag is the first thing anyone
will try, so the behaviour is stated rather than discovered:

- `dropRow` (the pure helper) **allows** a child→sibling drop and refuses a cross-parent one, on
  `row.parentId !== target.parentId`. It knows nothing about controlled vs uncontrolled.
- `table.ordering.dropRow` **refuses a non-top-level row on the uncontrolled path only**, via
  `isTopLevelRow`, exactly as `moveRow` does — the uncontrolled order is a list of ids over the
  top-level `data` array, and a child's position lives inside its parent's row object, which
  reordering `data` never touches.
- `table.ordering.canDropRow` answers `false` in that case, so a Phase 4 caller can disable the
  handle rather than refuse on release.

---

## Step-by-Step Tasks

### Task 1: Widen the step modules' visibility — no behaviour change

- **ACTION**: In `ordering.ts`, change `type OrderableColumn`, `type ColumnOrderingTable`,
  `const pinnedBand`, `const isVisible` and `function isMovable` to `export`ed. In
  `row-ordering.ts`, change `type OrderableRow` and `const pinnedBand` to `export`ed.
- **IMPLEMENT**: Prefix each with `export`. Nothing else moves. Add one sentence to `isMovable`'s
  docblock: _Exported for `./drop`, which applies the same two locks to both ends of a drop._
- **MIRROR**: `RowOrderingTable` (`row-ordering.ts:76`) is already exported while `OrderableRow`
  beside it is not — so exporting a structural helper type from these modules is established.
- **IMPORTS**: none added.
- **GOTCHA**: Both files declare a `pinnedBand` — one over `OrderableColumn`, one over
  `OrderableRow`. They are **not** interchangeable and must not be merged. `drop.ts` imports them
  under distinct local names (`import { pinnedBand as pinnedColumnBand } from './ordering'`,
  `import { pinnedBand as pinnedRowBand } from './row-ordering'`) or, cleaner, imports each module
  namespaced. Do **not** rename the originals — `ordering.test.ts` and `row-ordering.test.ts` are
  untouched, but a rename is churn in two files this phase otherwise only widens.
- **GOTCHA**: `export`ing from `ordering.ts` / `row-ordering.ts` means these names reach
  `src/features/ordering/index.ts`'s `export *` and therefore the package's public surface **only
  if** `src/index.ts` names them. It does not (`src/index.ts` lists ordering exports explicitly,
  lines 196–207), so they stay internal. Do not add them there.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-core typecheck` and `pnpm --filter
@ez-kit/data-grid-core test` both pass with no test file edited.

### Task 2: `canDropColumn` / `dropColumn` in a new `drop.ts`

- **ACTION**: Create `packages/data-grid/core/src/features/ordering/drop.ts` with the column half.
- **IMPLEMENT**:
  - A module docblock stating what a drop is and why it is not a step: _A step's target is
    computed by walking the order from the source (`findNeighbour`); a drop's target is named by the
    user and may be any distance away, so there is nothing to walk. What survives is the rule set —
    same pin band, same parent, both ends movable, the target within `scope` — applied to the two
    ends directly. The refusals are identical to the step's by construction, which is the point:
    a drag must not be able to produce an arrangement a menu entry would have refused._
  - A private `canDrop(source, target, scope)` over two `OrderableColumn`s returning `boolean`:
    `source.id !== target.id` **and** `isMovable(source)` **and** `isMovable(target)` **and**
    `pinnedColumnBand(source) === pinnedColumnBand(target)` **and**
    `source.parent?.id === target.parent?.id` **and**
    (`scope === ColumnMoveScope.All || isVisible(target)`).
  - `canDropColumn(table: ColumnOrderingTable, columnId: string, targetColumnId: string, scope: ColumnMoveScope = ColumnMoveScope.Visible): boolean`
    — look both ids up in `table.getAllLeafColumns()`, return `false` if either is absent, else
    `canDrop(...)`.
  - `dropColumn(table: ColumnOrderingTable, columnId: string, targetColumnId: string, scope: ColumnMoveScope = ColumnMoveScope.Visible): ColumnOrderState`
    — build `const order = columns.map((column) => column.id)`; if either id is absent or
    `canDrop(...)` is `false`, `return order`; otherwise splice: `const next = [...order];
next.splice(next.indexOf(columnId), 1); next.splice(next.indexOf(targetColumnId), 0, columnId); return next`.
- **MIRROR**: `moveColumn` (`ordering.ts:156-176`) — including its docblock's standing warning that
  the result is always the **complete** list of leaf ids, which `dropColumn` must repeat because the
  reason (TanStack reads a partial `columnOrder` as "these first, then the rest as declared") is
  identical.
- **IMPORTS**:

  ```ts
  import { ColumnMoveScope, isMovable, isVisible, pinnedBand as pinnedColumnBand } from './ordering'

  import type { ColumnOrderingTable, OrderableColumn } from './ordering'
  import type { ColumnOrderState } from '@tanstack/table-core'
  ```

  `import/order` is enforced alphabetically and grouped, with `import type` mandatory for types
  (`verbatimModuleSyntax`) — match the grouping in `row-ordering.ts:1-5` (value imports, blank line,
  type imports last).

- **GOTCHA**: **Compute the two indices after the splice-out, not before.** `next.indexOf(target)`
  must be read from `next` _after_ the source has been removed, or a forward drop lands one place
  short. `moveColumn` gets away with reading `order.indexOf(neighbour.id)` before the splice only
  because a step moves exactly one position; a drop across N positions does not. This is the single
  most likely bug in the phase — write a test for a three-place forward drop **and** a three-place
  backward drop, and check both against the intuition "the source ends up where the target was".
- **GOTCHA**: `noUncheckedIndexedAccess` makes `columns[index]` `OrderableColumn | undefined`. Look
  up with `find` rather than `findIndex` + index, as that yields the undefined check for free:
  `const source = columns.find((column) => column.id === columnId)`.
- **GOTCHA**: Do not walk between the two ends checking intervening columns. Same band + same parent
  is sufficient because leaves under one parent are contiguous in the order — an invariant the move
  rules themselves maintain, since no legal move has ever been allowed to cross a parent. Say that
  in a comment; a future reader will otherwise "fix" it into an O(n) scan.
- **GOTCHA**: `source.id === target.id` must refuse. A drag released over its own origin is the
  commonest gesture there is, and without this it writes an unchanged order and fires `onChange`,
  breaking the "exactly 1 `onChange` per drag" metric in the wrong direction.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-core typecheck`.

### Task 3: `canDropRow` / `dropRow` in the same module

- **ACTION**: Add the row half to `drop.ts`.
- **IMPLEMENT**:
  - `dropRow(table: RowOrderingTable, rowId: string, targetRowId: string): RowMove | undefined`,
    structurally `moveRow` with `findNeighbour` replaced by a direct lookup:
    1. `if ((readForeignSlice(table, 'sorting') ?? []).length > 0) return undefined`
    2. `if ((readForeignSlice(table, 'grouping') ?? []).length > 0) return undefined`
    3. `const rows = applyRowOrder(table.getRowModel().rows, readOwnSlice(table, 'rowOrder'), (row) => row.id)`
    4. `const sourceIndex = rows.findIndex((row) => row.id === rowId)`,
       `const targetIndex = rows.findIndex((row) => row.id === targetRowId)`;
       `if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return undefined`
    5. read both rows out (guarding for `undefined` under `noUncheckedIndexedAccess`);
       `if (pinnedRowBand(source) !== pinnedRowBand(target)) return undefined`;
       `if (source.parentId !== target.parentId) return undefined`
    6. `return { rowId, targetRowId, direction: targetIndex < sourceIndex ? RowMoveDirection.Up : RowMoveDirection.Down }`
  - `canDropRow(table: RowOrderingTable, rowId: string, targetRowId: string): boolean` =
    `dropRow(table, rowId, targetRowId) !== undefined` — verbatim the shape of `canMoveRow`
    (`row-ordering.ts:123-125`).
  - Docblocks: carry over _why_ each refusal exists (copy the reasoning from `moveRow` and
    `findNeighbour`, do not paraphrase it into something weaker), and add the two rules decided
    above — `direction` derived and informational; a child row is a legal drop among its own
    siblings here, with the uncontrolled limit stated on the feature API instead.
- **MIRROR**: `moveRow` (`row-ordering.ts:139-168`) line for line, including the comment explaining
  the `applyRowOrder` projection.
- **IMPORTS**: add to `drop.ts`

  ```ts
  import { readForeignSlice, readOwnSlice } from '../../feature-state'

  import { applyRowOrder } from './apply-row-order'
  import { RowMoveDirection, pinnedBand as pinnedRowBand } from './row-ordering'

  import type { OrderableRow, RowMove, RowOrderingTable } from './row-ordering'
  ```

- **GOTCHA**: The depth-skipping loop in the row `findNeighbour` (`row-ordering.ts:107-112`) has
  **no counterpart here** and must not be ported. It exists to find the _next sibling_ past an
  expanded subtree; a drop already names its target, and the `parentId` check is what keeps the drop
  among siblings. Porting it would be dead code.
- **GOTCHA**: `applyRowOrder` must not be skipped as an optimisation. A grid that has not yet fed
  the projected data back would otherwise compute every drop from the original positions, so a
  second drop would undo the first — the exact failure `moveRow`'s comment describes.
- **GOTCHA**: `readOwnSlice(table, 'rowOrder')` throws by name when the table never registered
  `rowOrderingFeature`. That is intended and matches `moveRow`; test it rather than guarding it.
- **GOTCHA**: `RowMove`'s `direction` is required, so `exactOptionalPropertyTypes` is not in play
  here — but do not be tempted to make it optional "because it is informational". It is part of the
  payload `RowOrderingConfig.onChange` already receives and removing it is a breaking change.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-core typecheck`.

### Task 4: Barrel + public export

- **ACTION**: Add `export * from './drop'` to `src/features/ordering/index.ts`; add the four names
  to the ordering block in `src/index.ts`.
- **IMPLEMENT**: In `src/index.ts` extend the existing alphabetised list at lines 196–206 to
  `applyRowMove, applyRowOrder, canDropColumn, canDropRow, canMoveColumn, canMoveRow,
ColumnMoveDirection, ColumnMoveScope, dropColumn, dropRow, moveColumn, moveRow, RowMoveDirection`.
  Extend that block's docblock with one sentence: _The `drop_` pair is the same rules applied to a
  target the user named rather than one computed by stepping — the drag affordance's only route into
  the ordering state, and the one place its boundaries are enforced.\*
- **MIRROR**: the existing block (`src/index.ts:191-207`), whose docblock already explains why these
  helpers sit in core and not the React layer.
- **IMPORTS**: none.
- **GOTCHA**: `src/features/entry.ts` needs **no** edit. It exports
  `{ rowOrderingFeature, type RowOrderState, type RowOrderingApi } from './ordering'`, and the drop
  helpers are not features — a consumer reaches them from the package root, exactly as they reach
  `moveColumn`. Adding them to the features entry would put pure helpers on the feature-composition
  path.
- **GOTCHA**: `tsup.config.ts` needs **no** new entry. `drop.ts` is reached through
  `src/index.ts`, and adding an entry would create a fourth `size-limit` budget for nothing.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-core build` emits, and
  `grep -c "dropRow" dist/index.d.ts` is non-zero.

### Task 5: `canDropRow` / `dropRow` on `RowOrderingApi`

- **ACTION**: In `row-ordering-feature.ts`, add both members to the `RowOrderingApi` type and
  implement them inside `initTableInstanceData`.
- **IMPLEMENT**:
  ```ts
  export type RowOrderingApi = {
  	/** Whether this step is available — what a menu entry's disabled state reads. */
  	canMoveRow: (rowId: string, direction: RowMoveDirection) => boolean
  	/** Take one step, if it is available. A no-op otherwise. */
  	moveRow: (rowId: string, direction: RowMoveDirection) => void
  	/**
  	 * Whether this row may land on that one — what a drag handle's `disabled` reads.
  	 *
  	 * Answers `false` for a sub-row on the uncontrolled path, for the reason
  	 * {@link isTopLevelRow} records: the order is a list of ids over the top-level `data` array,
  	 * so the move would be recorded and then render identically.
  	 */
  	canDropRow: (rowId: string, targetRowId: string) => boolean
  	/** Move `rowId` onto `targetRowId`, if that drop is available. A no-op otherwise. */
  	dropRow: (rowId: string, targetRowId: string) => void
  }
  ```
  and, beside the step pair, implementations that differ from it **only** in calling
  `dropRow(table, rowId, targetRowId)` where the step calls `moveRow(table, rowId, direction)`:
  read `rowOrderingOption(table)` per call, `config === undefined` ⇒ refuse, `config.onChange` ⇒
  call it with the `RowMove` and return, else `isTopLevelRow` gate, else materialise the full order
  from `getCoreRowModel()` through `applyRowOrder` and `writeOwnSlice(table, 'rowOrder',
applyRowMove(order, move))`.
- **MIRROR**: `row-ordering-feature.ts:134-171`, exactly — this is a copy with one call swapped.
  Resist factoring the two pairs into a shared private helper: the step and the drop take different
  second arguments, and the `moveRow`/`dropRow` name collision between the module-scope import and
  the API member is already the confusing part.
- **IMPORTS**: extend `import { applyRowMove, moveRow } from './row-ordering'` — `dropRow` comes
  from `'./drop'`, so add `import { dropRow } from './drop'` in the right `import/order` position
  (`'./apply-row-order'`, `'./drop'`, `'./row-ordering'` sort alphabetically).
- **GOTCHA**: The API member and the imported helper share the name `dropRow`, as `moveRow` already
  does. Inside the object literal `dropRow: (rowId, targetRowId) => { … dropRow(table, …) }` the
  inner reference resolves to the **module** binding because the member is a property, not a
  binding — the same thing the existing `moveRow` member does and relies on. It compiles and it is
  correct; do not "disambiguate" it with an alias, which would make the new pair read differently
  from the pair above it.
- **GOTCHA**: `assignTableInstanceData('rowOrderingFeature', table, { ordering: api })` type-checks
  `'ordering'` against the `Table_FeatureMap` entry, so the added members need no change there — the
  `RowOrderingApi` type is what that entry names.
- **GOTCHA**: `writeOwnSlice` is already imported (`row-ordering-feature.ts:1`).
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-core typecheck` and `lint`.

### Task 6: `drop.test.ts` — the refusal matrix

- **ACTION**: Create `packages/data-grid/core/src/features/ordering/drop.test.ts` covering both
  pure helpers.
- **IMPLEMENT**: Copy `ordering.test.ts`'s and `row-ordering.test.ts`'s fixtures (`Row`, `DATA`,
  `ORDERING`, `makeTable`, `FLAT`; `ROW_ORDERING`, `ROW_ORDERING_GROUPED`, `ROW_ORDERING_TREE`,
  `TREE`) rather than importing them — the existing test files export nothing, and the two suites
  must be able to drift apart. Four `describe` blocks: `dropColumn`, `dropColumn` scope,
  `dropRow`, `dropRow in a tree`. See **Testing Strategy** for the case list.
- **MIRROR**: `ordering.test.ts:1-48` (fixtures) and `row-ordering.test.ts:1-64` (three feature
  sets, `makeTable`, tree fixture + `toggleAllRowsExpanded(true)`).
- **IMPORTS**: from `'./drop'`; plus `ColumnMoveScope` from `'./ordering'` and `RowMoveDirection`
  from `'./row-ordering'` for the assertions.
- **GOTCHA**: The tree table in `row-ordering.test.ts:155-168` sets
  `ordering: { row: { onChange: () => undefined } }` — the **controlled** mode — and calls
  `table.toggleAllRowsExpanded(true)` before any assertion. Both are required: without the expand,
  the child rows are not in the rendered model and every lookup returns `-1`; the controlled config
  is what makes the pure helper reachable at all for a child row. Copy both.
- **GOTCHA**: The pin-band case needs `table.getRow('a').pin('top', false, false)` after
  construction, with `pinning: { row: { top: true, bottom: true } }` in the config
  (`row-ordering.test.ts:126-127`). Pinning is not expressible as a row fixture.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-core test drop` — every case passes; then
  deliberately break one refusal in `drop.ts` and confirm exactly one test fails.

### Task 7: `row-ordering-feature.test.ts` — the API pair

- **ACTION**: Extend the existing suite with a `describe('ordering.dropRow')` block.
- **IMPLEMENT**: Four cases, mirroring the file's existing `ordering.moveRow` cases:
  controlled emits exactly one `RowMove` and writes no slice; uncontrolled writes `rowOrder`;
  uncontrolled refuses a sub-row while `canDropRow` answers `false`; the axis being off refuses.
- **MIRROR**: whatever `row-ordering-feature.test.ts` already does for `moveRow` — read it first and
  copy its `makeTable`, its assertion style and its slice-reading helper. Do not invent a second
  way to read `rowOrder` in the same file.
- **IMPORTS**: extend the existing import list; add nothing new beyond what the `moveRow` cases use.
- **GOTCHA**: **Do not edit the existing `moveRow` cases.** The PRD's "existing ordering behaviour
  unchanged" metric names this file; the diff must be additive.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-core test row-ordering-feature`.

### Task 8: Full gate

- **ACTION**: Run the package's own checks, then the repo's.
- **IMPLEMENT**: nothing.
- **VALIDATE**: see **Validation Commands**.

---

## Testing Strategy

### Unit tests — `drop.test.ts`

`dropColumn` / `canDropColumn`, over `FLAT` = `['name', 'email', 'age']` unless noted:

| Test                                                               | Input                                                                                           | Expected Output                                                              | Edge Case?                           |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------ |
| moves a column onto its neighbour                                  | `dropColumn(t, 'email', 'name')`                                                                | `['email', 'name', 'age']`                                                   | no                                   |
| carries a column several places forward                            | 5-column table, `dropColumn(t, 'c1', 'c4')`                                                     | `c1` sits where `c4` was; the three between shift one place toward the start | **yes — the index-after-splice bug** |
| carries a column several places backward                           | 5-column table, `dropColumn(t, 'c4', 'c1')`                                                     | `c4` sits where `c1` was                                                     | **yes**                              |
| writes the complete order, never a partial one                     | `dropColumn(t, 'name', 'age')`                                                                  | `toHaveLength(3)`                                                            | no                                   |
| refuses a drop onto itself                                         | `dropColumn(t, 'name', 'name')`                                                                 | order unchanged; `canDropColumn` `false`                                     | **yes**                              |
| refuses an id the table does not have                              | `dropColumn(t, 'nope', 'name')`, and the mirror                                                 | order unchanged; `canDropColumn` `false`                                     | **yes**                              |
| does not move a column the author locked                           | `email` has `ordering: false`; `dropColumn(t, 'email', 'name')`                                 | order unchanged; `false`                                                     | yes                                  |
| does not land on a locked column either                            | `email` has `ordering: false`; `dropColumn(t, 'age', 'email')`                                  | order unchanged; `false`                                                     | yes                                  |
| never moves a system column                                        | `selection: true`; `canDropColumn(t, '__selection__', 'name')`                                  | `false`                                                                      | yes                                  |
| never lands on a system column                                     | `selection: true`; `canDropColumn(t, 'name', '__selection__')`                                  | `false`                                                                      | yes                                  |
| keeps a drop inside its pin band                                   | `email` `pinning: 'start'`, `pinning: true`; `canDropColumn(t, 'name', 'email')` and the mirror | `false` both ways                                                            | yes                                  |
| keeps a drop inside its header group                               | `person` group over `name`/`email`, `other` over `age`; `canDropColumn(t, 'email', 'age')`      | `false`                                                                      | yes                                  |
| drops columns in a grid registering neither pinning nor visibility | `tableFeatures({ columnOrderingFeature })` only                                                 | the drop succeeds — `getIsPinned` / `getIsVisible` fall back                 | **yes — the `?.` fallbacks**         |

`dropColumn` scope:

| Test                                                | Input                                                                           | Expected Output                                               | Edge Case? |
| --------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------- |
| refuses a hidden target in the visible scope        | `email` `initialHidden`, `visibility: true`; `canDropColumn(t, 'age', 'email')` | `false` — the user cannot see that landing spot in the header | **yes**    |
| lands on a hidden target in the All scope           | same, `ColumnMoveScope.All`                                                     | `['name', 'age', 'email']`; `canDropColumn` `true`            | yes        |
| defaults to the visible scope                       | no `scope` argument, hidden target                                              | `false`                                                       | yes        |
| is still bound by bands, groups and locks under All | hidden + pinned + locked fixture                                                | `false` for each                                              | yes        |

`dropRow` / `canDropRow`, over `DATA` = `['a', 'b', 'c']`:

| Test                                                             | Input                                                                                                   | Expected Output                                                                                 | Edge Case?                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| describes the drop and performs none of it                       | `dropRow(t, 'a', 'c')`                                                                                  | `{ rowId: 'a', targetRowId: 'c', direction: Down }`; `getRowModel().rows` still `['a','b','c']` | no                                                |
| derives Up for a backward drop                                   | `dropRow(t, 'c', 'a')`                                                                                  | `direction: Up`                                                                                 | yes                                               |
| refuses a drop onto itself                                       | `dropRow(t, 'b', 'b')`                                                                                  | `undefined`                                                                                     | **yes**                                           |
| refuses a row id the table does not have                         | `dropRow(t, 'nope', 'a')`, and the mirror                                                               | `undefined`                                                                                     | yes                                               |
| refuses every drop while a sort is applied                       | `sorting: true` + `setSorting([{ id: 'name', desc: false }])`                                           | `undefined`                                                                                     | yes                                               |
| refuses every drop while a grouping is applied                   | `ROW_ORDERING_GROUPED` + `grouping: { by: ['name'] }`                                                   | `undefined`                                                                                     | yes                                               |
| drops freely again once the grouping is dropped                  | `ROW_ORDERING_GROUPED` + `grouping: true`                                                               | a `RowMove` — the control proving the refusal is the grouping's, not the feature set's          | yes                                               |
| does not drop a row into a different pinning band                | `pinning: { row: { top: true, bottom: true } }`, `getRow('a').pin('top', …)`; `canDropRow(t, 'b', 'a')` | `false`                                                                                         | yes                                               |
| drops rows in a grid registering neither sorting nor row pinning | `tableFeatures({ rowOrderingFeature })`                                                                 | a `RowMove`                                                                                     | **yes — the `?.` / `readForeignSlice` fallbacks** |
| names the missing feature when row ordering was never registered | `tableFeatures({})`                                                                                     | throws `/state slice "rowOrder" is missing/`                                                    | **yes**                                           |
| projects through `rowOrder` rather than the raw model            | write `rowOrder` (`['c','b','a']`) then drop                                                            | the resolved `direction` follows the **projected** positions                                    | **yes — the `applyRowOrder` projection**          |

`dropRow` in a tree (`ROW_ORDERING_TREE`, `TREE`, `toggleAllRowsExpanded(true)`,
`ordering: { row: { onChange } }`):

| Test                                               | Input                       | Expected Output                                           | Edge Case? |
| -------------------------------------------------- | --------------------------- | --------------------------------------------------------- | ---------- |
| drops a child onto a sibling                       | `dropRow(t, 'c1', 'c2')`    | `{ rowId: 'c1', targetRowId: 'c2', direction: Down }`     | yes        |
| keeps a child inside its own subtree               | `canDropRow(t, 'c2', 'c3')` | `false` — different parent                                | yes        |
| drops a parent past another parent's whole subtree | `dropRow(t, 'p1', 'p2')`    | a `RowMove` — the intervening children are not a boundary | **yes**    |
| refuses a child onto a top-level row               | `canDropRow(t, 'c1', 'p2')` | `false`                                                   | yes        |

### Unit tests — `row-ordering-feature.test.ts` (additive)

| Test                                            | Input                                                                      | Expected Output                                                       | Edge Case?                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| controlled: reports the drop and stores nothing | `ordering: { row: { onChange: spy } }`; `table.ordering.dropRow('a', 'c')` | spy called **once** with the `RowMove`; `rowOrder` slice still `[]`   | **yes — the "exactly 1 `onChange`" metric** |
| uncontrolled: writes the full order             | `ordering: { row: true }`; `dropRow('a', 'c')`                             | `rowOrder` is the complete list of every row the table holds, spliced | yes                                         |
| uncontrolled: refuses a sub-row                 | tree data, no `onChange`; `dropRow('c1', 'c2')`                            | no write; `canDropRow('c1', 'c2')` is `false`                         | **yes**                                     |
| controlled: allows the same sub-row             | tree data, with `onChange`; `dropRow('c1', 'c2')`                          | spy called once                                                       | yes                                         |
| refuses when the row axis is off                | `ordering: true` (columns only)                                            | no call, no write; `canDropRow` `false`                               | yes                                         |

### Edge Cases Checklist

- [x] Empty input — drop onto self, unknown ids both ways
- [x] Maximum-size input — an N-place drop in both directions (the index-after-splice bug)
- [x] Invalid types — N/A, both arguments are `string`; the type system covers it
- [ ] Concurrent access — N/A, pure synchronous functions over a snapshot
- [ ] Network failure — N/A
- [x] Permission denied — the analogue is the lock set: `ordering: false`, `isSystemColumn`, band,
      parent, applied sort, applied grouping, axis off, sub-row uncontrolled
- [x] Missing feature — `readOwnSlice` throws by name; `getIsPinned` / `getIsVisible` /
      `readForeignSlice` fall back

---

## Validation Commands

### Static Analysis

```bash
cd /Users/sergejolcev/Desktop/npm-packages/ez-kit/ez-kit
pnpm --filter @ez-kit/data-grid-core typecheck
pnpm --filter @ez-kit/data-grid-core lint
```

EXPECT: zero type errors; zero lint warnings (`--max-warnings=0` is enforced). Note
`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and `verbatimModuleSyntax` are on, and
`import/order` is alphabetical and grouped with `import type` mandatory.

### Unit Tests — this package

```bash
pnpm --filter @ez-kit/data-grid-core test
```

EXPECT: all pass, including the untouched `ordering.test.ts`, `row-ordering.test.ts`,
`apply-row-order.test.ts`. Faster iteration during the work:
`cd packages/data-grid/core && pnpm exec vitest drop`.

### Build

```bash
pnpm --filter @ez-kit/data-grid-core build
grep -c "canDropColumn" packages/data-grid/core/dist/index.d.ts
```

EXPECT: build succeeds; the grep is ≥ 1 (the public export landed).

### Size

```bash
pnpm --filter @ez-kit/data-grid-core size
```

EXPECT: within budget. `index` is capped at 12.5 KB with `@tanstack/table-core` ignored; the drop
helpers are ~40 lines of logic, so a failure here means something unintended got pulled in. If the
budget is genuinely exceeded, raise it in `package.json` and say so — do not shrink the docblocks.

### Consumers still compile

```bash
pnpm --filter @ez-kit/data-grid-react typecheck
pnpm --filter @ez-kit/data-grid-heroui typecheck
```

EXPECT: clean. `RowOrderingApi` gaining members is additive, but the React package consumes it, so
verify rather than assume.

### Full gate

```bash
pnpm lint && pnpm typecheck && pnpm test
```

EXPECT: no regressions. (`pnpm test` depends on `^build` via turbo, so the data-grid packages build
first — `apps/docs/test/docs-option-names.test.ts` resolves through `./dist`.) The browser suite is
not needed: this phase renders nothing.

### Browser Validation

N/A for this phase.

### Manual Validation

- [ ] `git diff --stat` shows the eight files in **Files to Change** and nothing else.
- [ ] `git diff packages/data-grid/core/src/features/ordering/ordering.ts` is `export` keywords and
      one docblock sentence — no logic line changed.
- [ ] `git diff packages/data-grid/core/src/features/ordering/row-ordering.ts` likewise.
- [ ] `git diff` on `ordering.test.ts`, `row-ordering.test.ts`, `apply-row-order.test.ts`,
      `row-ordering-keyboard.test.tsx`, `tree-row-ordering.test.tsx` is **empty**.
- [ ] `git diff` on `row-ordering-feature.test.ts` is purely additive.
- [ ] `grep -rn "dnd\|@dnd-kit\|DragAxis\|data-drag" packages/data-grid/core/src` returns nothing —
      this phase names no drag machinery.
- [ ] `grep -rn "console\." packages/data-grid/core/src/features/ordering` returns nothing.
- [ ] No `.changeset/*.md` was added.
- [ ] Each new exported function's docblock says _why_ a refusal exists, in the register the
      surrounding file uses — not a restatement of the condition.

---

## Acceptance Criteria

Mapped to the PRD's Phase 1 success criteria: _"a drop across a band, across a parent, onto a locked
or system item, or under an applied sort or grouping is refused — one test each."_

- [ ] A drop across a pin band is refused — one test per axis
- [ ] A drop across a parent / header group is refused — one test per axis
- [ ] A drop onto a locked column (`ordering: false`) is refused, from either end
- [ ] A drop involving a system column is refused, from either end
- [ ] A row drop under an applied sort is refused
- [ ] A row drop under an applied grouping is refused, with a control proving the refusal is the
      grouping's
- [ ] A drop onto itself is refused, on both axes
- [ ] An N-place drop lands where the target was, forward and backward, on both axes
- [ ] `dropColumn` returns the **complete** order, never a partial one
- [ ] `direction` is derived from resolved positions and documented as informational
- [ ] The tree-row rule is stated in `dropRow`'s docblock, on `RowOrderingApi.canDropRow`, and
      covered by a test on each of the pure and the API level
- [ ] Controlled `ordering.dropRow` fires `onChange` exactly once and writes no slice
- [ ] All validation commands pass
- [ ] No type errors, no lint warnings

## Completion Checklist

- [ ] Code follows the discovered patterns (structural table types, refusal-as-return-value,
      per-call config read, `applyRowOrder` projection)
- [ ] Error handling matches the codebase: no throws except the inherited `readOwnSlice` one
- [ ] No logging added
- [ ] Tests follow the house AAA + why-comment style and live beside the source
- [ ] No hardcoded values
- [ ] No mutation — every helper copies before splicing, as `applyRowMove` does
      (`row-ordering.ts:182`)
- [ ] Existing ordering tests untouched
- [ ] No documentation, changeset, React code or drag machinery added
- [ ] Self-contained — no questions needed during implementation

## Risks

| Risk                                                                                                | Likelihood | Impact                                                                       | Mitigation                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The splice reads the target index **before** removing the source, so a forward drop lands one short | **H**      | Silently wrong ordering, invisible in one-place tests                        | Explicit multi-place tests in both directions, both axes; called out as a GOTCHA on Task 2                                                                            |
| `applyRowOrder` projection skipped as redundant                                                     | M          | A second drop undoes the first on a grid not yet feeding projected data back | Test that writes `rowOrder` first and asserts the projected `direction`                                                                                               |
| The two `pinnedBand` helpers get merged or confused                                                 | M          | Compiles, then reads the wrong member                                        | Distinct import aliases; the GOTCHA on Task 1                                                                                                                         |
| The row `findNeighbour` depth-skipping loop is ported into `dropRow`                                | M          | Dead code that later reads as a rule                                         | GOTCHA on Task 3; the parent-id check is the whole rule                                                                                                               |
| `ordering.dropRow` duplicates rather than mirrors the mode switch, drifting from `moveRow`          | M          | Two answers to "is this controlled"                                          | Task 5 is an explicit copy-one-call-swapped; factoring is explicitly rejected                                                                                         |
| Exporting five previously private helpers leaks them into the public API                            | L          | An accidental API commitment                                                 | `src/index.ts` names its ordering exports explicitly; the GOTCHA on Task 1 says not to add them                                                                       |
| Scope creep into Phase 2 (`DragAxis`, adapter types)                                                | M          | A phase boundary that stops meaning anything                                 | **NOT Building** list + the `grep` in Manual Validation                                                                                                               |
| `RowOrderingApi` growing members breaks an external kit                                             | L          | —                                                                            | It is a type the package owns and both kits consume through `table.ordering`; additive members are source-compatible. `pnpm typecheck` across the workspace confirms. |

## Notes

**Why Phase 1 and not Phase 2.** Both are unblocked and the PRD marks them parallel (different
packages, no shared file). Phase 1 first because Phase 4 — the first thing anyone can see — depends
on both, and because Phase 1 is the phase with a falsifiable success criterion that needs no React.
Phase 2 can be planned and executed concurrently by a second worker with no merge conflict:
Phase 1 touches only `packages/data-grid/core/src/features/ordering/**` plus `core/src/index.ts`;
Phase 2 touches only `packages/data-grid/react/react/src/**`.

**One decision this plan makes that the PRD left to the implementer.** The PRD said `dropColumn →
ColumnOrderState | undefined` is "a new convention rather than a mirror: align it or justify it in
the docblock." This plan **aligns** it: each axis's drop pair mirrors that axis's step pair, giving
`canDropColumn` + `dropColumn → ColumnOrderState` and `canDropRow` + `dropRow → RowMove | undefined`.
The inter-axis asymmetry is pre-existing and documented in `types.ts:646-704`; inventing a third
convention to paper over it would be the worse outcome. If a later phase finds the predicate call
wasteful (it traverses the leaf list twice), the answer is a single-call variant, not a change to
this convention.

**One scope addition, deliberate.** The PRD's Phase 1 line lists only the two pure helpers.
`RowOrderingApi.canDropRow` / `.dropRow` are added here as well, because the controlled/uncontrolled
switch and the `isTopLevelRow` refusal live in `row-ordering-feature.ts` and nowhere else — leaving
them out would force Phase 4 to reimplement both in React, which is the architecture this PRD is
built to avoid. The column axis gets no such counterpart, correctly: `columnOrderingFeature` is
TanStack's own and the column commit already goes through `table.setColumnOrder(...)` from React
(`header-cell.tsx:277`, `column-menu-sections.ts:117`, `visibility-trigger.tsx:78`).

**The prose standard in this package is unusually high and is part of the deliverable.** Every
docblock in `ordering.ts` and `row-ordering.ts` explains _why_ a rule exists and, where an
alternative was tried, why it failed — see `RowOrderingTable`'s three-bullet account of the two
rejected type shapes. A drop helper whose docblock only restates its conditions will read as foreign
in this file set. Budget for the writing.
