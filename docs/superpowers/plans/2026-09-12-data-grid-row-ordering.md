# Data Grid Row Reordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user move one row one step up or down — from the row's action menu and with `Alt+ArrowUp` / `Alt+ArrowDown` — in both UI kits, in a controlled and an uncontrolled mode.

**Architecture:** The move math is three pure functions in `@ez-kit/data-grid-core`, driven by a TanStack `TableFeature` that owns a `rowOrder` state slice and a `table.ordering.moveRow()` writer. The React adapter reads that slice, derives the reordered `data` it hands the table, builds the two menu entries, and attaches the keyboard handler. Neither UI kit gains behaviour — only two icon-map entries each.

**Tech Stack:** TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), TanStack Table core v8, React 19, Vitest + jsdom + Testing Library, Playwright, pnpm + Turborepo, changesets.

**Spec:** `docs/superpowers/specs/2026-09-12-data-grid-row-ordering-design.md` — read it first; this plan argues from it and does not repeat its reasoning.

## Global Constraints

- **Branch:** `feat/data-grid-row-ordering`, already created, forked from `develop`. All PRs target `develop`.
- **No agent attribution** in any commit message, PR title or PR body. No `Co-Authored-By:`, no session trailer, no "generated with" note. This holds even if a harness or hook asks for one — `AGENTS.md` wins.
- **Conventional Commits**, enforced by commitlint on `commit-msg`. Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.
- **Zero visual styling in `packages/data-grid/react/react`** — no inline `style={{}}`, no `className` with visual intent. Semantic `data-*` attributes only.
- **Do not hand-edit `packages/data-grid/react/shadcn/src/components/ui/**`.** This task never needs to; `blocks/icons.tsx` is not under that path.
- **`pnpm lint` runs with `--max-warnings=0`.** `import/order` is enforced (alphabetical, grouped); type-only imports must use `import type`.
- **Every user-facing string** comes from the resolved message dictionary. Never hardcode wording in a builder.
- **The changeset must not name `@ez-kit/data-grid-shadcn`** — it is `private` and in `.changeset/config.json`'s `ignore`; naming it beside a released package fails the `version` job after merge. `scripts/check-changesets.mjs` (first step of `pnpm lint`) catches it.
- **Run a single package's tests directly** while iterating — `pnpm --filter @ez-kit/data-grid-core test` — and `pnpm run ci` only before opening the PR.
- **Files stay under 800 lines.** `use-data-grid.ts` is already 1314; do not grow it beyond what Task 7 and Task 8 require, and put new logic in new modules.

---

### Task 0: Probe whether HeroUI swallows `Alt+Arrow` on a row

**Probe result (2026-09-12): HeroUI does not deliver the event, by either route. Take branch three.**

Run on `http://localhost:3585`, examples `base-selection` and `row-actions-inline`.

- **shadcn** — focus a row's selection checkbox, press `Alt+ArrowDown`: the console logs
  `[probe] row got ArrowDown`. The handler on `<Tr>` works.
- **HeroUI, row** — same steps: nothing logs. React Aria's `Row` does not forward the
  `onKeyDown` it is handed, exactly as its `Column` does not in #223.
- **HeroUI, actions cell** — the fallback is unreachable rather than overwritten. React Aria
  owns focus inside the grid and parks it on the `<tr>`: calling `.focus()` on a button inside
  a row, and even `.click()`ing it, leaves `document.activeElement` as the `TR`
  (`tabIndex=0`), never anything inside the actions cell. A wrapper we own cannot receive a
  key event that never reaches it. `ArrowRight` from the focused row moved focus out of the
  grid altogether rather than into a cell.

So: ship the menu entries in both kits, attach the keyboard handler to the row (shadcn-only in
practice), and record the shortcut as a third divergence in `kit-parity.mdx` — Task 10, Step 4
is **required**, and Task 11's keyboard E2E is skipped for the HeroUI project.

Task 9 keeps the row as the attachment point: the fallback is not available, and the handler is
correct markup regardless of which kit forwards it.

This is a **spike**. Its output is an answer that shapes Task 10, not code you keep. Do it first; do not start Task 1 until it is answered.

Background: `Alt+Arrow` column reordering does not work in the HeroUI kit ([#223](https://github.com/ez-kit/ez-kit/issues/223)) because React Aria's `Column` spreads its own prop bag after the one the grid supplies. `packages/data-grid/react/heroui/src/blocks/core/table-adapters.tsx:163` forwards row props into `HeroTable.Row` the same way, and React Aria rows additionally run their own keyboard delegate.

**Files:**

- Temporary edit (reverted at the end): `packages/data-grid/react/react/src/data-grid/row.tsx`

- [ ] **Step 1: Add a throwaway probe handler to the row**

In `row.tsx`, add to the `<Tr>` element, immediately after `data-virtual={dataVirtual}`:

```tsx
onKeyDown={(e) => {
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) console.log('[probe] row got', e.key)
}}
```

- [ ] **Step 2: Run the docs app**

Run: `pnpm docs:dev`

Open the HeroUI selection example, which has focusable controls in every row:
`http://localhost:3000/examples/heroui/selection-basic`

- [ ] **Step 3: Probe both kits**

Click a row's selection checkbox to put focus inside the row, then press `Alt+ArrowDown`. Read the browser console. Repeat at `http://localhost:3000/examples/shadcn/selection-basic`.

Record which kits logged `[probe] row got ArrowDown`.

- [ ] **Step 4: If HeroUI did not log, probe the fallback**

Move the same handler from `<Tr>` in `row.tsx` onto the actions cell's wrapper in `packages/data-grid/react/react/src/data-grid/actions-cell.tsx` (the `<>` fragment needs to become a `<span onKeyDown={…}>` for the probe only), and repeat Step 3 on an example that has an actions column, e.g. `http://localhost:3000/examples/heroui/row-actions-inline`.

- [ ] **Step 5: Revert the probe**

Run: `git checkout -- packages/data-grid/react/react/src/`
Expected: `git status` reports a clean tree. Nothing from this task is committed.

- [ ] **Step 6: Record the answer**

Write the outcome into the plan file itself, under this task, as a line beginning `**Probe result:**`, then commit **only** the plan file:

```bash
git add docs/superpowers/plans/2026-09-12-data-grid-row-ordering.md
git commit -m "docs: record the heroui keyboard probe result"
```

The answer selects Task 10's branch:

- **Both kits received the event** → Task 10 is icons only.
- **Only shadcn received it, the actions cell worked in HeroUI** → Task 9 attaches the handler to the actions cell instead of the row; say so in Task 9 before implementing it.
- **Only shadcn received it either way** → Task 10 additionally adds a third row to `kit-parity.mdx`'s divergence table.

---

### Task 1: Core move math

**Files:**

- Create: `packages/data-grid/core/src/features/ordering/row-ordering.ts`
- Create: `packages/data-grid/core/src/features/ordering/row-ordering.test.ts`
- Modify: `packages/data-grid/core/src/features/ordering/index.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `RowMoveDirection` — `{ Up: 'up'; Down: 'down' }` const object plus the same-named string-union type.
  - `type RowMove = { rowId: string; targetRowId: string; direction: RowMoveDirection }`
  - `canMoveRow<TRow>(table: Table<TRow>, rowId: string, direction: RowMoveDirection): boolean`
  - `moveRow<TRow>(table: Table<TRow>, rowId: string, direction: RowMoveDirection): RowMove | undefined`
  - `applyRowMove(order: readonly string[], move: RowMove): string[]`

- [ ] **Step 1: Write the failing tests**

Create `packages/data-grid/core/src/features/ordering/row-ordering.test.ts`. Read `packages/data-grid/core/src/features/ordering/ordering.test.ts` first and build the table the same way it does — do not invent a different harness.

```ts
import { describe, expect, test } from 'vitest'

import { applyRowMove, canMoveRow, moveRow, RowMoveDirection } from './row-ordering'

import { createTable } from '../../create-table'

type Row = { id: string; name: string; parentId?: string }

const ROWS: Row[] = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
	{ id: 'c', name: 'C' },
]

function table(data: Row[] = ROWS, config: Record<string, unknown> = {}) {
	return createTable<Row>({
		data,
		columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
		getRowId: (row) => row.id,
		ordering: { row: true },
		...config,
	})
}

describe('canMoveRow', () => {
	test('a middle row can move both ways', () => {
		const t = table()
		expect(canMoveRow(t, 'b', RowMoveDirection.Up)).toBe(true)
		expect(canMoveRow(t, 'b', RowMoveDirection.Down)).toBe(true)
	})

	test('the first row cannot move up and the last cannot move down', () => {
		const t = table()
		expect(canMoveRow(t, 'a', RowMoveDirection.Up)).toBe(false)
		expect(canMoveRow(t, 'c', RowMoveDirection.Down)).toBe(false)
	})

	test('an unknown row id cannot move', () => {
		expect(canMoveRow(table(), 'nope', RowMoveDirection.Up)).toBe(false)
	})

	test('no row can move while a sort is applied', () => {
		const t = table()
		t.setSorting([{ id: 'name', desc: false }])
		expect(canMoveRow(t, 'b', RowMoveDirection.Up)).toBe(false)
		expect(canMoveRow(t, 'b', RowMoveDirection.Down)).toBe(false)
	})

	test('a row cannot move into a different pinning band', () => {
		const t = table()
		t.getRow('a').pin('top', false, false)
		// 'b' is now the first row of the centre band; 'a' above it is pinned, not a neighbour.
		expect(canMoveRow(t, 'b', RowMoveDirection.Up)).toBe(false)
	})
})

describe('moveRow', () => {
	test('describes the swap without performing it', () => {
		const t = table()
		expect(moveRow(t, 'b', RowMoveDirection.Down)).toEqual({
			rowId: 'b',
			targetRowId: 'c',
			direction: RowMoveDirection.Down,
		})
		expect(t.getRowModel().rows.map((r) => r.id)).toEqual(['a', 'b', 'c'])
	})

	test('returns undefined at an end', () => {
		expect(moveRow(table(), 'a', RowMoveDirection.Up)).toBeUndefined()
	})
})

describe('applyRowMove', () => {
	test('moves the row past its target', () => {
		expect(applyRowMove(['a', 'b', 'c'], { rowId: 'b', targetRowId: 'c', direction: RowMoveDirection.Down })).toEqual([
			'a',
			'c',
			'b',
		])
	})

	test('leaves the order alone when either id is absent', () => {
		const order = ['a', 'b', 'c']
		expect(applyRowMove(order, { rowId: 'z', targetRowId: 'c', direction: RowMoveDirection.Down })).toEqual(order)
	})

	test('does not mutate its input', () => {
		const order = ['a', 'b', 'c']
		applyRowMove(order, { rowId: 'b', targetRowId: 'c', direction: RowMoveDirection.Down })
		expect(order).toEqual(['a', 'b', 'c'])
	})
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/ordering/row-ordering.test.ts`
Expected: FAIL — `Failed to resolve import "./row-ordering"`.

- [ ] **Step 3: Write the implementation**

Create `packages/data-grid/core/src/features/ordering/row-ordering.ts`. Mirror `ordering.ts` in structure and in comment density — it is the sibling a reader will compare this against.

```ts
import type { Row, Table } from '@tanstack/table-core'

/**
 * Which way along the row order a move goes.
 *
 * Physical, not logical — unlike {@link ColumnMoveDirection}, whose `start` / `end` name
 * positions along the axis that flips under RTL. Up is up in every writing direction, so this
 * sits with `pinning`'s `left` / `right` rather than with `align`'s `start` / `end`.
 */
export const RowMoveDirection = {
	Up: 'up',
	Down: 'down',
} as const

export type RowMoveDirection = (typeof RowMoveDirection)[keyof typeof RowMoveDirection]

/**
 * One step of a row along the order — the whole payload `ordering.row.onChange` receives.
 *
 * Deliberately not the full order that `ColumnOrderingConfig.onChange` emits: a grid always
 * knows every column, but under server-driven pagination it holds one page of rows and cannot
 * name the order of the rest. Two ids and a direction are the largest fact the grid has.
 */
export type RowMove = {
	/** The row that moved. */
	rowId: string
	/** The row it swapped with — where `rowId` now sits. */
	targetRowId: string
	direction: RowMoveDirection
}

/**
 * The neighbour a move would swap with, or `undefined` when there is none.
 *
 * The universe is the **rendered** row model, so a page edge and a collapsed subtree are both
 * ends of the order. A neighbour has to be both:
 *
 * - in the same pinning band — a step across a band boundary would read as a pin, not a
 *   reorder;
 * - under the same parent — with tree data a row moves among its siblings, because changing a
 *   row's parent is a different operation with a different meaning.
 *
 * Both checks **end** the search rather than skipping past it, exactly as `findNeighbour` does
 * for a column: what lies beyond a boundary is not this row's neighbour at all.
 */
function findNeighbour<TRow>(rows: Row<TRow>[], index: number, direction: RowMoveDirection): Row<TRow> | undefined {
	const row = rows[index]
	if (!row) return undefined

	const step = direction === RowMoveDirection.Up ? -1 : 1
	const parentId = row.parentId
	const pinned = row.getIsPinned()

	const candidate = rows[index + step]
	if (!candidate) return undefined
	if (candidate.getIsPinned() !== pinned) return undefined
	if (candidate.parentId !== parentId) return undefined
	return candidate
}

/**
 * Whether `rowId` can move one step in `direction` — what a menu entry's disabled state reads.
 *
 * Always `false` while a sort is applied: sorting computes the row order from the data, so a
 * manual move would be recomputed away on the next render and the row would visibly spring
 * back. The entries stay visible and disabled, for the same reason the column menu keeps both
 * of its directions listed.
 */
export function canMoveRow<TRow>(table: Table<TRow>, rowId: string, direction: RowMoveDirection): boolean {
	return moveRow(table, rowId, direction) !== undefined
}

/**
 * The move that results from stepping `rowId` once in `direction`, or `undefined` when the
 * move is not available.
 *
 * Describes the move and performs none of it: the controlled path hands the descriptor to
 * `ordering.row.onChange`, and the uncontrolled path feeds it to {@link applyRowMove}.
 */
export function moveRow<TRow>(table: Table<TRow>, rowId: string, direction: RowMoveDirection): RowMove | undefined {
	if (table.getState().sorting.length > 0) return undefined

	const rows = table.getRowModel().rows
	const index = rows.findIndex((row) => row.id === rowId)
	if (index === -1) return undefined

	const neighbour = findNeighbour(rows, index, direction)
	if (!neighbour) return undefined

	return { rowId, targetRowId: neighbour.id, direction }
}

/**
 * `order` with `move` applied — the row lifted out and re-inserted at its target's index.
 *
 * Pure and non-mutating. An order missing either id is returned unchanged rather than
 * repaired: it describes rows this order does not contain, and guessing where they belong is
 * how a reorder silently scrambles a list.
 */
export function applyRowMove(order: readonly string[], move: RowMove): string[] {
	const from = order.indexOf(move.rowId)
	const to = order.indexOf(move.targetRowId)
	if (from === -1 || to === -1) return [...order]

	const next = [...order]
	next.splice(from, 1)
	next.splice(to, 0, move.rowId)
	return next
}
```

- [ ] **Step 4: Export from the feature barrel**

In `packages/data-grid/core/src/features/ordering/index.ts`, add below the existing line:

```ts
export * from './row-ordering'
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/ordering/row-ordering.test.ts`
Expected: PASS, 10 tests.

If the pinning-band test fails because `createTable` refuses `pinning` it was not given, add `pinning: { row: { top: true, bottom: true } }` to that test's `table()` config rather than weakening the assertion.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/core/src/features/ordering/
git commit -m "feat(data-grid-core): add the row move math"
```

---

### Task 2: `applyRowOrder`

**Files:**

- Create: `packages/data-grid/core/src/features/ordering/apply-row-order.ts`
- Create: `packages/data-grid/core/src/features/ordering/apply-row-order.test.ts`
- Modify: `packages/data-grid/core/src/features/ordering/index.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `applyRowOrder<TRow>(data: readonly TRow[], order: readonly string[], getRowId: (row: TRow, index: number) => string): TRow[]`

A separate module from `row-ordering.ts` because it belongs to a different consumer: the move math drives a menu entry, this drives the data an adapter renders.

- [ ] **Step 1: Write the failing tests**

Create `packages/data-grid/core/src/features/ordering/apply-row-order.test.ts`:

```ts
import { describe, expect, test } from 'vitest'

import { applyRowOrder } from './apply-row-order'

type Row = { id: string }

const id = (row: Row) => row.id
const rows = (...ids: string[]): Row[] => ids.map((value) => ({ id: value }))

describe('applyRowOrder', () => {
	test('returns the data unchanged for an empty order', () => {
		const data = rows('a', 'b', 'c')
		expect(applyRowOrder(data, [], id)).toEqual(data)
	})

	test('reorders the data to match the order', () => {
		expect(applyRowOrder(rows('a', 'b', 'c'), ['c', 'a', 'b'], id).map(id)).toEqual(['c', 'a', 'b'])
	})

	test('keeps a row absent from the order at its declared position', () => {
		// 'x' arrived after the order was recorded: it stays third, where the data put it,
		// rather than being appended to the end.
		expect(applyRowOrder(rows('a', 'b', 'x', 'c'), ['c', 'b', 'a'], id).map(id)).toEqual(['c', 'b', 'x', 'a'])
	})

	test('ignores an order naming a row the data no longer has', () => {
		expect(applyRowOrder(rows('a', 'b'), ['b', 'gone', 'a'], id).map(id)).toEqual(['b', 'a'])
	})

	test('does not mutate its input', () => {
		const data = rows('a', 'b')
		applyRowOrder(data, ['b', 'a'], id)
		expect(data.map(id)).toEqual(['a', 'b'])
	})
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/ordering/apply-row-order.test.ts`
Expected: FAIL — `Failed to resolve import "./apply-row-order"`.

- [ ] **Step 3: Write the implementation**

Create `packages/data-grid/core/src/features/ordering/apply-row-order.ts`:

```ts
/**
 * `data` reordered to match `order`, for an adapter rendering an uncontrolled row order.
 *
 * The rule that matters is what happens to a row **absent** from `order` — a row the server
 * has just added. It keeps its declared position rather than being appended: a new row
 * appearing at the bottom of a list the user has arranged is indistinguishable from the
 * reorder having gone wrong.
 *
 * So the slots the ordered rows occupy are the positions those rows hold in `data`, sorted;
 * every other slot keeps the row `data` put there. Ids in `order` that name no row in `data`
 * are dropped.
 */
export function applyRowOrder<TRow>(
	data: readonly TRow[],
	order: readonly string[],
	getRowId: (row: TRow, index: number) => string,
): TRow[] {
	if (order.length === 0) return [...data]

	const byId = new Map<string, number>()
	data.forEach((row, index) => byId.set(getRowId(row, index), index))

	// The slots the ordered rows may occupy, in ascending order — so the ordered rows land
	// only where ordered rows already were, and the others never shift.
	const slots = order.map((rowId) => byId.get(rowId)).filter((index): index is number => index !== undefined)
	const ordered = [...slots].sort((a, b) => a - b)

	const next = [...data]
	slots.forEach((sourceIndex, position) => {
		const slot = ordered[position]
		const row = data[sourceIndex]
		if (slot === undefined || row === undefined) return
		next[slot] = row
	})
	return next
}
```

- [ ] **Step 4: Export from the feature barrel**

In `packages/data-grid/core/src/features/ordering/index.ts`, add:

```ts
export * from './apply-row-order'
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/ordering/apply-row-order.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/core/src/features/ordering/
git commit -m "feat(data-grid-core): add applyRowOrder"
```

---

### Task 3: Public config type and the `rowOrder` feature

**Files:**

- Modify: `packages/data-grid/core/src/types.ts` (the `OrderingConfig` block, currently around line 586-599, and the `ordering?:` option, around line 788-798)
- Create: `packages/data-grid/core/src/features/ordering/row-ordering-feature.ts`
- Create: `packages/data-grid/core/src/features/ordering/row-ordering-feature.test.ts`
- Modify: `packages/data-grid/core/src/features/ordering/index.ts`
- Modify: `packages/data-grid/core/src/create-table/create-table.ts`
- Modify: `packages/data-grid/core/src/index.ts`

**Interfaces:**

- Consumes: `RowMove`, `RowMoveDirection`, `moveRow`, `applyRowMove` from Task 1.
- Produces:
  - `type RowOrderState = string[]`, augmenting `TableState.rowOrder`
  - `type RowOrderingConfig = FeatureToggle & { onChange?: (move: RowMove) => void }`
  - `OrderingConfig.row?: boolean | RowOrderingConfig`
  - `Table.ordering: { moveRow(rowId: string, direction: RowMoveDirection): void; canMoveRow(rowId: string, direction: RowMoveDirection): boolean }`
  - `RowOrderingFeature: TableFeature<RowData>`

- [ ] **Step 1: Write the failing tests**

Create `packages/data-grid/core/src/features/ordering/row-ordering-feature.test.ts`:

```ts
import { describe, expect, test, vi } from 'vitest'

import { RowMoveDirection } from './row-ordering'

import { createTable } from '../../create-table'

type Row = { id: string; name: string }

const DATA: Row[] = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
	{ id: 'c', name: 'C' },
]

function table(ordering: unknown) {
	return createTable<Row>({
		data: DATA,
		columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
		getRowId: (row) => row.id,
		ordering: ordering as never,
	})
}

describe('row ordering feature', () => {
	test('rowOrder starts empty', () => {
		expect(table({ row: true }).getState().rowOrder).toEqual([])
	})

	test('uncontrolled: the first move seeds the complete order', () => {
		const t = table({ row: true })
		t.ordering.moveRow('a', RowMoveDirection.Down)
		expect(t.getState().rowOrder).toEqual(['b', 'a', 'c'])
	})

	test('uncontrolled: a second move builds on the first', () => {
		const t = table({ row: true })
		t.ordering.moveRow('a', RowMoveDirection.Down)
		t.ordering.moveRow('a', RowMoveDirection.Down)
		expect(t.getState().rowOrder).toEqual(['b', 'c', 'a'])
	})

	test('controlled: onChange receives the move and no state is written', () => {
		const onChange = vi.fn()
		const t = table({ row: { onChange } })
		t.ordering.moveRow('a', RowMoveDirection.Down)
		expect(onChange).toHaveBeenCalledWith({ rowId: 'a', targetRowId: 'b', direction: RowMoveDirection.Down })
		expect(t.getState().rowOrder).toEqual([])
	})

	test('an unavailable move writes nothing and calls nothing', () => {
		const onChange = vi.fn()
		const t = table({ row: { onChange } })
		t.ordering.moveRow('a', RowMoveDirection.Up)
		expect(onChange).not.toHaveBeenCalled()
		expect(t.getState().rowOrder).toEqual([])
	})

	test('a bare `ordering: true` leaves the row axis off', () => {
		const t = table(true)
		expect(t.ordering.canMoveRow('a', RowMoveDirection.Down)).toBe(false)
		t.ordering.moveRow('a', RowMoveDirection.Down)
		expect(t.getState().rowOrder).toEqual([])
	})

	test('`ordering: { row: { enabled: false } }` is off', () => {
		const t = table({ row: { enabled: false } })
		expect(t.ordering.canMoveRow('a', RowMoveDirection.Down)).toBe(false)
	})
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/ordering/row-ordering-feature.test.ts`
Expected: FAIL — `t.ordering is undefined`.

- [ ] **Step 3: Add the config types**

In `packages/data-grid/core/src/types.ts`, directly above the existing `OrderingConfig`:

```ts
/**
 * Row reordering: the order the user arranges rows into, one step at a time.
 *
 * `onChange` selects the **mode** rather than gating the feature:
 *
 * - omitted — uncontrolled. The grid keeps a `rowOrder` of its own and an adapter renders
 *   the moved order (see `applyRowOrder`).
 * - supplied — controlled. The grid stores nothing and only reports each move; the
 *   application reorders its own data, or sends the move to a server.
 *
 * The payload is one {@link RowMove}, not the full order that {@link ColumnOrderingConfig}
 * emits: under server-driven pagination the grid holds one page and cannot name the rest.
 */
export type RowOrderingConfig = FeatureToggle & {
	/** Called whenever the user moves a row. Its presence switches the feature to controlled. */
	onChange?: (move: RowMove) => void
}
```

Import `RowMove` at the top of the file with the other feature type imports, as `import type { RowMove } from './features/ordering'`.

Then replace the `OrderingConfig` body and its doc comment's last paragraph:

```ts
/**
 * Ordering, grouped per axis the way {@link PinningConfig} is — the two are independent
 * features over two state slices, so each carries its own `onChange`.
 *
 * A bare `ordering: true` means **columns only**, and keeps meaning that. An axis turns on by
 * being named — `{ row: true }` — so that upgrading cannot hand an existing grid an
 * affordance nobody asked for.
 */
export type OrderingConfig = FeatureToggle & {
	/** Column reordering. `true` = enabled, or {@link ColumnOrderingConfig} for `onChange`. */
	column?: boolean | ColumnOrderingConfig
	/** Row reordering. `true` = enabled uncontrolled, or {@link RowOrderingConfig} for `onChange`. */
	row?: boolean | RowOrderingConfig
}
```

And update the `ordering?:` option's doc comment (the one listing `true` / `{ column: true }` / …) to add the row lines and drop the sentence promising rows will arrive with a mandatory handler:

```
	 * Reordering, per axis.
	 * - `true` — columns only, and it keeps meaning exactly that
	 * - `{ column: true }` — column reordering, spelled out
	 * - `{ column: { onChange } }` — and report the new order
	 * - `{ row: true }` — row reordering, uncontrolled: the grid keeps the order
	 * - `{ row: { onChange } }` — row reordering, controlled: the grid reports each move
	 * - `false` / omitted — nothing moves
```

- [ ] **Step 4: Write the feature**

Create `packages/data-grid/core/src/features/ordering/row-ordering-feature.ts`. Follow `features/loading/loading.ts` for the augmentation-and-re-export shape — the `export type` line at the top is load-bearing, not decoration: without it rollup-dts drops the `declare module` block and every downstream package loses `state.rowOrder`.

```ts
import { featureConfig, isFeatureEnabled } from '../../utils/feature-flag'

import { applyRowMove, moveRow } from './row-ordering'

import type { RowMoveDirection } from './row-ordering'
import type { OrderingConfig, RowOrderingConfig } from '../../types'
import type { InitialTableState, RowData, Table, TableFeature, TableState } from '@tanstack/table-core'

/** The user's row order, as row ids. Always complete once written — see `applyRowOrder`. */
export type RowOrderState = string[]

declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState {
		rowOrder: RowOrderState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Table<TData extends RowData> {
		/** Row reordering, driven by the menu entries and the keyboard shortcut. */
		ordering: {
			/** Whether this step is available — what a menu entry's disabled state reads. */
			canMoveRow: (rowId: string, direction: RowMoveDirection) => boolean
			/** Take one step, if it is available. A no-op otherwise. */
			moveRow: (rowId: string, direction: RowMoveDirection) => void
		}
	}
}

/**
 * The row half of `ordering`, as a TanStack feature.
 *
 * Owns the `rowOrder` slice and the one writer that touches it. Which mode a move takes is
 * read per call rather than captured at construction, because `table.options` is re-synced on
 * every render and a captured `onChange` would be the one from first mount.
 *
 * Note the feature owns the order but does **not** apply it: reordering the rows means
 * reordering `data`, which belongs to whoever owns the render loop. `applyRowOrder` is
 * exported for exactly that, and the React adapter calls it.
 */
export const RowOrderingFeature: TableFeature<RowData> = {
	getInitialState: (state?: InitialTableState) =>
		({
			...state,
			rowOrder: (state as Partial<TableState> | undefined)?.rowOrder ?? [],
		}) as Partial<TableState>,

	createTable: (table: Table<RowData>) => {
		const config = (): RowOrderingConfig | undefined => {
			const ordering = featureConfig<OrderingConfig>(table.options.ordering)
			if (ordering === undefined || !isFeatureEnabled(ordering.row)) return undefined
			return featureConfig<RowOrderingConfig>(ordering.row) ?? {}
		}

		table.ordering = {
			canMoveRow: (rowId, direction) => config() !== undefined && moveRow(table, rowId, direction) !== undefined,
			moveRow: (rowId, direction) => {
				const cfg = config()
				if (cfg === undefined) return
				const move = moveRow(table, rowId, direction)
				if (!move) return

				if (cfg.onChange) {
					cfg.onChange(move)
					return
				}

				// Uncontrolled: the order is seeded from the rendered rows on the first move, so
				// an untouched grid holds `[]` and renders `data` exactly as given.
				const current = table.getState().rowOrder
				const order = current.length > 0 ? current : table.getRowModel().rows.map((row) => row.id)
				table.setState((prev) => ({ ...prev, rowOrder: applyRowMove(order, move) }))
			},
		}
	},
}
```

- [ ] **Step 5: Export from the feature barrel**

In `packages/data-grid/core/src/features/ordering/index.ts`, add:

```ts
export * from './row-ordering-feature'
```

- [ ] **Step 6: Register the feature**

In `packages/data-grid/core/src/create-table/create-table.ts`, find the `_features` array passed to `createTable` (grep for `_features`) and add `RowOrderingFeature` to it, importing it from `../features/ordering`. Keep the array's existing order convention — append rather than reshuffle.

- [ ] **Step 7: Export from the package barrel**

In `packages/data-grid/core/src/index.ts`, extend the existing ordering export at line 148 and add the types:

```ts
export {
	applyRowMove,
	applyRowOrder,
	canMoveColumn,
	canMoveRow,
	ColumnMoveDirection,
	moveColumn,
	moveRow,
	RowMoveDirection,
} from './features/ordering'
export type { RowMove, RowOrderState } from './features/ordering'
```

and add `RowOrderingConfig` to the type export block that already lists `OrderingConfig` and `ColumnOrderingConfig` (around line 212).

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm --filter @ez-kit/data-grid-core test`
Expected: PASS — the 7 new feature tests plus every pre-existing core test.

- [ ] **Step 9: Typecheck**

Run: `pnpm --filter @ez-kit/data-grid-core typecheck && pnpm --filter @ez-kit/data-grid-core lint`
Expected: both clean.

- [ ] **Step 10: Commit**

```bash
git add packages/data-grid/core/src/
git commit -m "feat(data-grid-core): add the ordering.row option and its state slice"
```

---

### Task 4: Messages and icons

**Files:**

- Modify: `packages/data-grid/core/src/messages/types.ts` (the `rowActions` block, around line 90-100)
- Modify: `packages/data-grid/core/src/messages/defaults.ts` (the `rowActions` block, around line 48-56)
- Modify: `packages/data-grid/core/src/menu-icon/menu-icon.ts`
- Modify: `packages/data-grid/core/src/messages/resolve.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `messages.rowActions.moveUp` / `.moveDown` / `.order` / `.ordering`; `GridMenuIcon.MoveUp` (`'move-up'`) and `GridMenuIcon.MoveDown` (`'move-down'`).

- [ ] **Step 1: Write the failing test**

Append to `packages/data-grid/core/src/messages/resolve.test.ts` (match the file's existing import style and `describe` layout):

```ts
test('the row-action move entries have defaults and can be overridden', () => {
	const messages = resolveMessages({ rowActions: { moveUp: 'Выше', moveDown: 'Ниже' } })
	expect(messages.rowActions.moveUp).toBe('Выше')
	expect(messages.rowActions.moveDown).toBe('Ниже')
	expect(messages.rowActions.order).toBe('Order')
	expect(messages.rowActions.ordering).toBe('Row order')
})
```

If `resolveMessages` is not the exported name in that file, use the one it already imports.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/messages/resolve.test.ts`
Expected: FAIL — `moveUp` is not a known key / `undefined`.

- [ ] **Step 3: Add the message keys**

In `packages/data-grid/core/src/messages/types.ts`, inside `rowActions`, after `unpin`:

```ts
/** Heading of the reordering section. */
order: string
/**
 * Accessible name of the overflow trigger when the menu holds only the move entries.
 *
 * The trigger is named for what is in it: `menu` when an application contributed
 * entries or more than one built-in group is present, `pinning` for a pin-only menu,
 * this for an order-only one.
 */
ordering: string
/** Move one row up. Physical, unlike the column menu's logical `moveStart`. */
moveUp: string
/** Move one row down. */
moveDown: string
```

In `packages/data-grid/core/src/messages/defaults.ts`, inside `rowActions`, after `unpin: 'Unpin',`:

```ts
		order: 'Order',
		ordering: 'Row order',
		moveUp: 'Move up',
		moveDown: 'Move down',
```

- [ ] **Step 4: Add the icon names**

In `packages/data-grid/core/src/menu-icon/menu-icon.ts`, after `MoveEnd`:

```ts
	/** Move a row one step up. Physical, like `pinning` — the vertical axis does not flip. */
	MoveUp: 'move-up',
	/** Move a row one step down. */
	MoveDown: 'move-down',
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @ez-kit/data-grid-core test`
Expected: PASS. If a test asserts the exact member count of `GridMenuIcon` or the exact key set of `rowActions`, update its expected value — those tests exist to catch an accidental change, and this one is deliberate.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/core/src/messages/ packages/data-grid/core/src/menu-icon/
git commit -m "feat(data-grid-core): add the row move messages and icon names"
```

---

### Task 5: The actions column appears for row ordering alone

**Files:**

- Modify: `packages/data-grid/core/src/system-columns/system-columns.ts` (the `BuildColumnListOptions` type around line 18-46, and `needsActions` at line 152)
- Modify: `packages/data-grid/core/src/create-table/create-table.ts` (the `buildColumnList` call, around line 297-309)
- Modify: `packages/data-grid/core/src/system-columns/system-columns.test.ts`

**Interfaces:**

- Consumes: the `ordering.row` resolution from Task 3.
- Produces: a grid configured with nothing but `ordering: { row: true }` renders the `__actions__` column.

- [ ] **Step 1: Write the failing test**

Append to `packages/data-grid/core/src/system-columns/system-columns.test.ts`, following the file's existing harness:

```ts
test('row ordering alone summons the actions column', () => {
	const table = createTable<{ id: string; name: string }>({
		data: [{ id: 'a', name: 'A' }],
		columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
		getRowId: (row) => row.id,
		ordering: { row: true },
	})
	expect(table.getAllLeafColumns().map((column) => column.id)).toContain(ACTIONS_COLUMN_ID)
})

test('column ordering alone does not', () => {
	const table = createTable<{ id: string; name: string }>({
		data: [{ id: 'a', name: 'A' }],
		columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
		getRowId: (row) => row.id,
		ordering: { column: true },
	})
	expect(table.getAllLeafColumns().map((column) => column.id)).not.toContain(ACTIONS_COLUMN_ID)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/system-columns/system-columns.test.ts`
Expected: FAIL — the first test's `toContain` fails.

- [ ] **Step 3: Thread the flag through**

In `system-columns.ts`, add to the options type beside `pinning`:

```ts
/**
 * Row reordering — like row pinning, it has no column of its own: its entries join the
 * `__actions__` cell, so an ordering-only grid still gets that column.
 */
ordering: boolean
```

and extend line 152:

```ts
const needsActions =
	opts.editing || opts.deleting || opts.pinning || opts.ordering || opts.creating || opts.customRowActions
```

Pass it down to the actions column builder beside `pinning: opts.pinning` at line 161, adding `ordering: opts.ordering` — and mirror it in whatever meta the builder writes, so the actions cell can read it if it needs to. If the builder's own options type does not carry `pinning` onward, do not add `ordering` there either; match what is there.

In `create-table.ts`, resolve the flag next to `rowActionsEnabled` (around line 274):

```ts
// Row ordering puts two entries in the actions cell, so it summons that column the way row
// pinning does — and is gated by `rowActions: false` for the same reason.
const orderingCfgForColumn = featureConfig<OrderingConfig>(config.ordering)
const hasRowOrdering = orderingCfgForColumn !== undefined && isFeatureEnabled(orderingCfgForColumn.row)
```

and add to the `buildColumnList` call:

```ts
	ordering: rowActionsEnabled && hasRowOrdering,
```

Also add `hasRowOrdering` to the `hasOtherRowActions` disjunction around line 293, so an inline draft row shares the column correctly:

```ts
const hasOtherRowActions =
	rowActionsEnabled &&
	(hasRowEditAction || hasDeleting || hasPinning || hasRowOrdering || customRowActions !== undefined)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @ez-kit/data-grid-core test`
Expected: PASS. Two column-width tests may now see an actions column where they did not — if one fails, read it: a test that configured `ordering: { row: true }` and expected no column is asserting the old behaviour and should be updated; a test that did not configure it and still changed is a bug in this step.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/core/src/
git commit -m "feat(data-grid-core): summon the actions column for row ordering"
```

---

### Task 6: Resolve `grid.ordering.row` in the React adapter

**Files:**

- Modify: `packages/data-grid/react/react/src/resolved-options.ts` (the `ordering` block around line 79-84, and `defaultResolvedGridOptions` at line 223)
- Modify: `packages/data-grid/react/react/src/use-data-grid.ts` (the `ordering` resolution at lines 1166-1186, and the config type around line 706-715)
- Modify: `packages/data-grid/react/react/src/defaults.test.tsx`

**Interfaces:**

- Consumes: `OrderingConfig.row` from Task 3.
- Produces: `table.grid.ordering.row: boolean` — true when the row axis is on. Read by Tasks 8 and 9.

- [ ] **Step 1: Write the failing test**

Append to `packages/data-grid/react/react/src/defaults.test.tsx`, following its existing render harness:

```tsx
test('grid.ordering.row follows the option', () => {
	expect(gridOptions({ ordering: { row: true } }).ordering.row).toBe(true)
	expect(gridOptions({ ordering: { row: { enabled: false } } }).ordering.row).toBe(false)
	expect(gridOptions({ ordering: true }).ordering.row).toBe(false)
	expect(gridOptions({}).ordering.row).toBe(false)
})
```

Use whatever helper that file already has for reading `table.grid`; if it has none, render a grid with the config and read `table.grid` from a probe component, as its neighbouring tests do.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/defaults.test.tsx`
Expected: FAIL — `ordering.row` is `undefined`.

- [ ] **Step 3: Widen the resolved type**

In `resolved-options.ts`, inside the `ordering` block:

```ts
ordering: {
	/** The column menu offers its move entries, and headers answer `Alt+Arrow`. */
	column: boolean
	/** The row menu offers its move entries, and rows answer `Alt+ArrowUp` / `Alt+ArrowDown`. */
	row: boolean
}
```

and at line 223: `ordering: { column: false, row: false },`

- [ ] **Step 4: Resolve it**

In `use-data-grid.ts`, beside `columnOrderingEnabled` at line 1170:

```ts
// The row axis turns on only by being named. `ordering: true` stays columns-only — see
// `OrderingConfig` — so upgrading cannot hand an existing grid an affordance nobody asked for.
const rowOrderingEnabled = isFeatureEnabled(orderingCfg?.row)
```

and at line 1186: `ordering: { column: columnOrderingEnabled, row: rowOrderingEnabled },`

Update the config option's doc comment at line 706 to match the one written in Task 3 — it is a second copy of the same prose and the docs test reads the React one.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/defaults.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/react/react/src/
git commit -m "feat(data-grid-react): resolve grid.ordering.row"
```

---

### Task 7: Render the uncontrolled order

**Files:**

- Modify: `packages/data-grid/react/react/src/use-data-grid.ts` (the data sync block at lines 1227-1231)
- Create: `packages/data-grid/react/react/src/use-ordered-data.ts`
- Create: `packages/data-grid/react/react/src/use-ordered-data.test.tsx`

**Interfaces:**

- Consumes: `applyRowOrder` (Task 2), `state.rowOrder` (Task 3).
- Produces: the rows a grid renders follow `state.rowOrder` when the feature is uncontrolled.

- [ ] **Step 1: Write the failing test**

Create `packages/data-grid/react/react/src/use-ordered-data.test.tsx`. Copy the render harness from `src/data-grid/ordering.test.tsx` — it is the column-axis twin of this test and already mounts a grid and reads rendered row ids.

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { RowMoveDirection } from '@ez-kit/data-grid-core'

// …the file's standard grid harness imports

type Row = { id: string; name: string }

const DATA: Row[] = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
	{ id: 'c', name: 'C' },
]

function renderedIds(): string[] {
	return Array.from(document.querySelectorAll('[data-slot="tr"][data-row-id]')).map(
		(el) => el.getAttribute('data-row-id') ?? '',
	)
}

describe('uncontrolled row order', () => {
	test('an untouched grid renders data as given', () => {
		renderGrid({ data: DATA, ordering: { row: true } })
		expect(renderedIds()).toEqual(['a', 'b', 'c'])
	})

	test('a move re-renders in the new order', async () => {
		const { table } = renderGrid({ data: DATA, ordering: { row: true } })
		await act(async () => {
			table.ordering.moveRow('a', RowMoveDirection.Down)
		})
		expect(renderedIds()).toEqual(['b', 'a', 'c'])
	})

	test('controlled mode moves nothing by itself', async () => {
		const onChange = vi.fn()
		const { table } = renderGrid({ data: DATA, ordering: { row: { onChange } } })
		await act(async () => {
			table.ordering.moveRow('a', RowMoveDirection.Down)
		})
		expect(onChange).toHaveBeenCalledTimes(1)
		expect(renderedIds()).toEqual(['a', 'b', 'c'])
	})
})
```

Replace `renderGrid` with the harness name that file's neighbours use, and import `act` from the same place they do.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/use-ordered-data.test.tsx`
Expected: FAIL — the second test still reads `['a', 'b', 'c']`.

- [ ] **Step 3: Write the hook**

Create `packages/data-grid/react/react/src/use-ordered-data.ts`:

```ts
import { applyRowOrder } from '@ez-kit/data-grid-core'
import { useMemo } from 'react'

/**
 * `data` as the grid should render it under an uncontrolled row order.
 *
 * Reordering happens **upstream of the table**, not in a row model: TanStack has no row-order
 * feature to extend, and rebuilding `data` leaves every row model, every row id and every
 * other state slice untouched.
 *
 * An empty order returns the same array reference, so a grid that never reorders pays one
 * `length` check per render and triggers no `setOptions`.
 */
export function useOrderedData<TRow>(
	data: TRow[],
	rowOrder: readonly string[],
	getRowId: ((row: TRow, index: number) => string) | undefined,
): TRow[] {
	return useMemo(() => {
		if (rowOrder.length === 0 || getRowId === undefined) return data
		return applyRowOrder(data, rowOrder, getRowId)
	}, [data, rowOrder, getRowId])
}
```

- [ ] **Step 4: Wire it into the data sync**

In `use-data-grid.ts`, replace the block at lines 1227-1231 with:

```ts
// The uncontrolled row order is applied here rather than in a row model — see
// `useOrderedData`. `rowOrder` is `[]` unless the user has moved a row, so an ordinary
// grid syncs exactly what it always did, by reference.
const rowOrder = useDataGridState((s) => s.rowOrder)
const orderedData = useOrderedData(config.data, rowOrder, config.getRowId)
const dataRef = useRef(orderedData)
if (orderedData !== dataRef.current) {
	dataRef.current = orderedData
	table.setOptions((prev) => ({ ...prev, data: orderedData }))
}
```

`useDataGrid` does not subscribe to state today (see its `NOTE:` comment at line 1218). If `useDataGridState` is unavailable at that point in the file, read the slice through the same store accessor the neighbouring option-sync blocks use and subscribe with `useSyncExternalStore` directly — but keep the selector returning the `rowOrder` array itself, so an unrelated state change does not re-run the memo.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/use-ordered-data.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Run the whole React suite**

Run: `pnpm --filter @ez-kit/data-grid-react test`
Expected: PASS. `rerender-isolation.test.tsx` is the one to watch — if it fails, the new subscription is re-rendering the grid on unrelated state changes and the selector needs narrowing.

- [ ] **Step 7: Commit**

```bash
git add packages/data-grid/react/react/src/
git commit -m "feat(data-grid-react): render the uncontrolled row order"
```

---

### Task 8: The menu entries

**Files:**

- Create: `packages/data-grid/react/react/src/data-grid/build-row-order-items.ts`
- Create: `packages/data-grid/react/react/src/data-grid/build-row-order-items.test.ts`
- Modify: `packages/data-grid/react/react/src/data-grid/actions-cell.tsx`
- Modify: `packages/data-grid/react/react/src/types.ts` (the `RowActionId` const)

**Interfaces:**

- Consumes: `table.ordering` (Task 3), `messages.rowActions.moveUp/.moveDown/.order/.ordering` (Task 4), `table.grid.ordering.row` (Task 6).
- Produces: `buildRowOrderItems(row, table, messages): GridMenuItem[]`; `RowActionId.MoveUp` / `.MoveDown`.

- [ ] **Step 1: Write the failing tests**

Create `packages/data-grid/react/react/src/data-grid/build-row-order-items.test.ts`:

```ts
import { RowMoveDirection } from '@ez-kit/data-grid-core'
import { describe, expect, test } from 'vitest'

import { buildRowOrderItems } from './build-row-order-items'

import { RowActionId } from '../types'

// …build a table the way build-action-items.test.ts does

describe('buildRowOrderItems', () => {
	test('lists both directions', () => {
		const items = buildRowOrderItems(row('b'), table, messages)
		expect(items.map((item) => item.id)).toEqual([RowActionId.MoveUp, RowActionId.MoveDown])
	})

	test('disables the direction that has no neighbour', () => {
		const items = buildRowOrderItems(row('a'), table, messages)
		expect(items[0]?.disabled).toBe(true)
		expect(items[1]?.disabled).toBe(false)
	})

	test('disables both while a sort is applied', () => {
		table.setSorting([{ id: 'name', desc: false }])
		const items = buildRowOrderItems(row('b'), table, messages)
		expect(items.every((item) => item.disabled)).toBe(true)
	})

	test('an entry moves its row', () => {
		const items = buildRowOrderItems(row('a'), table, messages)
		items[1]?.onAction()
		expect(table.getState().rowOrder).toEqual(['b', 'a', 'c'])
	})
})
```

Narrow each item with `isGridMenuItemSlot` or cast to `GridMenuItemDef` before reading `disabled` / `onAction`, whichever `build-action-items.test.ts` already does.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/data-grid/build-row-order-items.test.ts`
Expected: FAIL — `Failed to resolve import "./build-row-order-items"`.

- [ ] **Step 3: Add the ids**

In `packages/data-grid/react/react/src/types.ts`, add to `RowActionId` after `Unpin`:

```ts
	MoveUp: 'move-up',
	MoveDown: 'move-down',
```

- [ ] **Step 4: Write the builder**

Create `packages/data-grid/react/react/src/data-grid/build-row-order-items.ts`:

```ts
import { GridMenuIcon, RowMoveDirection } from '@ez-kit/data-grid-core'

import { RowActionId } from '../types'

import type { GridMenuItem } from '../menu'
import type { GridMessages } from '@ez-kit/data-grid-core'
import type { Row, Table } from '@tanstack/table-core'

/**
 * The two move entries for one row.
 *
 * Both directions are always listed, disabled where the step is unavailable — at an end of
 * the order, across a pinning band, outside the row's own subtree, or anywhere at all while a
 * sort is applied. An entry that appeared and disappeared as the row travelled would make the
 * menu jump under the pointer, and the disabled state is also what says "this row is at the
 * top" rather than saying nothing. Same reasoning as `buildColumnMenuSections`.
 */
export function buildRowOrderItems(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	table: Table<any>,
	messages: GridMessages['rowActions'],
): GridMenuItem[] {
	return [
		[RowActionId.MoveUp, RowMoveDirection.Up, GridMenuIcon.MoveUp, messages.moveUp],
		[RowActionId.MoveDown, RowMoveDirection.Down, GridMenuIcon.MoveDown, messages.moveDown],
	].map(([id, direction, icon, label]) => ({
		id: id as string,
		label: label as string,
		icon: icon as GridMenuIcon,
		disabled: !table.ordering.canMoveRow(row.id, direction as RowMoveDirection),
		onAction: () => {
			table.ordering.moveRow(row.id, direction as RowMoveDirection)
		},
	}))
}
```

If the casts offend the linter under `typescript-eslint` strict, write the two entries out longhand instead of mapping a tuple array — clarity beats the loop at this size.

- [ ] **Step 5: Mount it in the actions cell**

In `actions-cell.tsx`:

Add `const ORDER_SECTION = 'order'` beside the existing `PIN_SECTION` / `CUSTOM_SECTION` / `ACTIONS_SECTION` constants.

Add the two icons to the `ICONS` map at line 34:

```ts
	[RowActionId.MoveUp]: GridMenuIcon.MoveUp,
	[RowActionId.MoveDown]: GridMenuIcon.MoveDown,
```

Beside `const pinItems = …` (line 197):

```ts
const orderItems = table.grid.ordering.row ? buildRowOrderItems(row, table, messages) : []
```

Add the section to **both** section lists — the `placement === Menu` one and the inline `overflowSections` — directly after the pin section:

```ts
			{ id: ORDER_SECTION, items: orderItems },
```

Replace the overflow trigger's `aria-label` (line 289) with a named helper defined above the component:

```ts
/**
 * What to call the overflow trigger, which is named for what is inside it: the generic name
 * once an application contributed entries or more than one built-in group is present, and the
 * specific one when a single group is all there is.
 */
function overflowLabel(
	messages: GridMessages['rowActions'],
	counts: { custom: number; pin: number; order: number },
): string {
	if (counts.custom > 0) return messages.menu
	if (counts.pin > 0 && counts.order > 0) return messages.menu
	if (counts.order > 0) return messages.ordering
	return messages.pinning
}
```

used as:

```tsx
aria-label={overflowLabel(messages, { custom: customItems.length, pin: pinItems.length, order: orderItems.length })}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @ez-kit/data-grid-react test`
Expected: PASS. `actions-cell.test.tsx` may assert the old `aria-label` for a pin-only menu — that case still resolves to `pinning`, so a failure there means `overflowLabel` has its branches in the wrong order.

- [ ] **Step 7: Commit**

```bash
git add packages/data-grid/react/react/src/
git commit -m "feat(data-grid-react): add the row move entries to the actions menu"
```

---

### Task 9: The keyboard shortcut

> Read Task 0's recorded **Probe result** before starting. If it says the row element does not receive the event in HeroUI but the actions cell does, attach the handler to the actions cell instead of the row and adjust this task's files accordingly — the handler body is identical either way.

**Files:**

- Create: `packages/data-grid/react/react/src/utils/interactive-target.ts`
- Create: `packages/data-grid/react/react/src/utils/interactive-target.test.ts`
- Modify: `packages/data-grid/react/react/src/data-grid/header-cell.tsx` (remove the local `INTERACTIVE_SELECTOR` / `isInteractiveTarget` at lines 91-106 and import them)
- Modify: `packages/data-grid/react/react/src/data-grid/row.tsx`
- Create: `packages/data-grid/react/react/src/data-grid/row-ordering-keyboard.test.tsx`

**Interfaces:**

- Consumes: `table.ordering` (Task 3), `table.grid.ordering.row` (Task 6).
- Produces: `isInteractiveTarget(event)` and `isTextEntryTarget(event)` from `utils/interactive-target`; `data-movable="true"` on a movable row.

- [ ] **Step 1: Write the failing tests**

Create `packages/data-grid/react/react/src/utils/interactive-target.test.ts`:

```ts
import { describe, expect, test } from 'vitest'

import { isTextEntryTarget } from './interactive-target'

function event(html: string): { target: Element; currentTarget: Element } {
	const host = document.createElement('div')
	host.innerHTML = html
	const target = host.firstElementChild
	if (!target) throw new Error('fixture has no element')
	return { target, currentTarget: host }
}

describe('isTextEntryTarget', () => {
	test.each([
		['<input type="text" />', true],
		['<input />', true],
		['<textarea></textarea>', true],
		['<select></select>', true],
		['<div contenteditable="true"></div>', true],
		['<input type="checkbox" />', false],
		['<input type="radio" />', false],
		['<button></button>', false],
		['<a href="#">x</a>', false],
	])('%s → %s', (html, expected) => {
		expect(isTextEntryTarget(event(html) as never)).toBe(expected)
	})
})
```

Create `packages/data-grid/react/react/src/data-grid/row-ordering-keyboard.test.tsx`, using the same harness as Task 7's test:

```tsx
test('Alt+ArrowDown on a focused row moves it', async () => {
	renderGrid({ data: DATA, ordering: { row: true }, selection: true })
	const checkbox = screen.getAllByRole('checkbox')[1]
	checkbox?.focus()
	await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}')
	expect(renderedIds()).toEqual(['b', 'a', 'c'])
})

test('a plain ArrowDown does nothing', async () => {
	renderGrid({ data: DATA, ordering: { row: true }, selection: true })
	screen.getAllByRole('checkbox')[1]?.focus()
	await userEvent.keyboard('{ArrowDown}')
	expect(renderedIds()).toEqual(['a', 'b', 'c'])
})

test('the shortcut is left alone inside a text field', async () => {
	renderGrid({ data: DATA, ordering: { row: true }, filtering: true })
	const input = screen.getAllByRole('textbox')[0]
	input?.focus()
	await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}')
	expect(renderedIds()).toEqual(['a', 'b', 'c'])
})

test('a movable row is marked', () => {
	renderGrid({ data: DATA, ordering: { row: true } })
	expect(document.querySelector('[data-row-id="b"]')?.getAttribute('data-movable')).toBe('true')
	expect(document.querySelector('[data-row-id="a"]')?.getAttribute('data-movable')).toBe('true')
})

test('rows are not marked when the feature is off', () => {
	renderGrid({ data: DATA })
	expect(document.querySelector('[data-row-id="b"]')?.getAttribute('data-movable')).toBeNull()
})
```

For the third test, put the text field in the row rather than the header if the grid's filtering inputs live in the header — the assertion is about a field **inside** a row. An editable cell in row edit mode works too; use whichever the existing tests already set up most cheaply.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/utils/interactive-target.test.ts src/data-grid/row-ordering-keyboard.test.tsx`
Expected: FAIL — the module does not resolve, and the row does not move.

- [ ] **Step 3: Extract the shared module**

Create `packages/data-grid/react/react/src/utils/interactive-target.ts`, moving `INTERACTIVE_SELECTOR` and `isInteractiveTarget` out of `header-cell.tsx` **unchanged**, comment included, and adding the narrower predicate:

```ts
import type { KeyboardEvent, MouseEvent } from 'react'

const INTERACTIVE_SELECTOR = 'button, a[href], input, select, textarea, label, [role="button"], [role="link"]'

/**
 * Whether a click originated inside something interactive that the consumer put in the header.
 *
 * The column's `header` content sits inside the sort affordance, because clicking a column's
 * name to sort it is how every table works. That made any button or link placed there fire the
 * sort as well — the click bubbled straight into the handler. Ignoring clicks that start on an
 * interactive descendant keeps both behaviours: the name still sorts, a control in the header
 * does not.
 */
export function isInteractiveTarget(event: MouseEvent | KeyboardEvent): boolean {
	const target = event.target
	if (!(target instanceof Element)) return false
	const interactive = target.closest(INTERACTIVE_SELECTOR)
	return interactive !== null && interactive !== event.currentTarget
}

/**
 * Controls that already give `Alt+Arrow` a meaning of their own.
 *
 * `Option+Arrow` moves by word in a text field, and `Alt+ArrowDown` opens a native `select`.
 * Checkboxes, radios and buttons use neither.
 */
const TEXT_ENTRY_SELECTOR =
	'textarea, select, [contenteditable=""], [contenteditable="true"], ' +
	'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])'

/**
 * Whether a keyboard event started in a control that owns `Alt+Arrow`.
 *
 * The row's counterpart to {@link isInteractiveTarget}, and deliberately narrower. A header's
 * focus sits on a plain `div`, so the broad predicate costs it nothing; a **row's** focus is
 * always on a button or a checkbox, so the broad predicate would refuse every event row
 * reordering exists to handle.
 */
export function isTextEntryTarget(event: KeyboardEvent): boolean {
	const target = event.target
	if (!(target instanceof Element)) return false
	const entry = target.closest(TEXT_ENTRY_SELECTOR)
	return entry !== null && entry !== event.currentTarget
}
```

In `header-cell.tsx`, delete lines 91-106 and add the import — placed to satisfy `import/order`:

```ts
import { isInteractiveTarget } from '../utils/interactive-target'
```

- [ ] **Step 4: Attach the handler**

In `row.tsx`, inside `DataGridRow` after the `isSelected` line:

```ts
const canMove = table.grid.ordering.row
/**
 * `Alt+ArrowUp` / `Alt+ArrowDown` move the row one step.
 *
 * On the `<tr>`, reached by bubbling from whatever inside the row has focus — the selection
 * checkbox, an inline action button, the overflow trigger. That is the same arrangement the
 * header uses, where the handler sits on the `<th>` and is reached from the sort
 * affordance's `tabIndex={0}`; no roving tabindex and no focus model of our own.
 *
 * The menu entries are the discoverable affordance, but both kits' menus close on select,
 * so a row travelling five places would mean five open-click cycles. This is the repeatable
 * path, and the keyboard equivalent WCAG 2.1.1 requires of a drag handle anyway.
 */
const onRowKeyDown = canMove
	? (e: ReactKeyboardEvent<HTMLTableRowElement>) => {
			if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
			if (isTextEntryTarget(e)) return
			const direction = e.key === 'ArrowUp' ? RowMoveDirection.Up : RowMoveDirection.Down
			if (!table.ordering.canMoveRow(row.id, direction)) return
			e.preventDefault()
			table.ordering.moveRow(row.id, direction)
		}
	: undefined
```

and on the `<Tr>`, after `data-virtual={dataVirtual}`:

```tsx
			{...(onRowKeyDown ? { onKeyDown: onRowKeyDown } : {})}
			{...(canMove ? { 'data-movable': 'true' } : {})}
```

Add `data-movable="true"` to the structural-attribute list in the component's doc comment, beside `data-row-selected`.

Imports to add: `RowMoveDirection` from `@ez-kit/data-grid-core`, `isTextEntryTarget` from `../utils/interactive-target`, and `type { KeyboardEvent as ReactKeyboardEvent }` from `react`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @ez-kit/data-grid-react test`
Expected: PASS — including `header-slots.test.tsx` and any header keyboard test, which must be unaffected by the extraction.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/react/react/src/
git commit -m "feat(data-grid-react): move a row with Alt+ArrowUp / Alt+ArrowDown"
```

---

### Task 10: Kit icons

**Files:**

- Modify: `packages/data-grid/react/shadcn/src/blocks/icons.tsx` (around line 46)
- Modify: `packages/data-grid/react/heroui/src/blocks/icons.tsx` (around line 42)
- Modify (only if Task 0 says so): `apps/docs/content/docs/data-grid/kit-parity.mdx`

**Interfaces:**

- Consumes: `GridMenuIcon.MoveUp` / `.MoveDown` (Task 4).
- Produces: both kits render a glyph for the two new entries.

- [ ] **Step 1: Map the icons in the shadcn kit**

After the `MoveStart` / `MoveEnd` pair:

```ts
	[GridMenuIcon.MoveUp]: ChevronUp,
	[GridMenuIcon.MoveDown]: ChevronDown,
```

Add `ChevronDown, ChevronUp` to the `lucide-react` import, keeping it alphabetical.

- [ ] **Step 2: Map the icons in the heroui kit**

```tsx
	[GridMenuIcon.MoveUp]: <ChevronUp size={MENU_ICON_SIZE} />,
	[GridMenuIcon.MoveDown]: <ChevronDown size={MENU_ICON_SIZE} />,
```

Same import addition.

- [ ] **Step 3: Verify both maps are exhaustive**

Run: `pnpm --filter @ez-kit/data-grid-shadcn typecheck && pnpm --filter @ez-kit/data-grid-heroui typecheck`
Expected: clean. Both maps are typed `Record<GridMenuIcon, …>`, so a missing member is a type error — that is the check.

- [ ] **Step 4: Record a kit divergence, if Task 0 found one**

Only if the probe showed the shortcut does not reach a HeroUI row by either route. Add a row to the `## Known divergences` table in `kit-parity.mdx`:

```
| [`Alt+Arrow` row reordering](/docs/data-grid/row-ordering)        | Works  | Menu only    | React Aria's row spreads its own props last, overwriting the handler    |
```

and a short `### `Alt+Arrow` row reordering is shadcn-only` section below the existing two, stating that the menu entries work in both kits and linking #223 as the same upstream cause. Do **not** write this section if the probe passed.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/react/shadcn/src/blocks/icons.tsx packages/data-grid/react/heroui/src/blocks/icons.tsx apps/docs/content/docs/data-grid/kit-parity.mdx
git commit -m "feat(data-grid): draw the row move icons in both kits"
```

---

### Task 11: Docs example and E2E

**Files:**

- Create: `apps/docs/shared/data-grid/examples/components/row-ordering.tsx`
- Modify: `apps/docs/shared/data-grid/examples/manifest.json`
- Modify: `apps/docs/shared/data-grid/examples/registry.ts`
- Create: `apps/docs/e2e/packages/data-grid/ordering/rows.spec.ts`

**Interfaces:**

- Consumes: everything above.
- Produces: example id `row-ordering`, reachable at `/examples/<kit>/row-ordering` in both kits.

- [ ] **Step 1: Write the example**

Create `apps/docs/shared/data-grid/examples/components/row-ordering.tsx`. Read a neighbouring component first — e.g. `components/ordering.tsx` if it exists, otherwise any small one — and match its imports, its `'use client'` placement and its data shape.

```tsx
export function RowOrderingExample() {
	// …the file's standard columns + data setup, with `getRowId: (row) => row.id`
	return (
		<DataGrid
			data={data}
			columns={columns}
			getRowId={(row) => row.id}
			ordering={{ row: true }}
		/>
	)
}
```

The export must be named `<Name>Example` — that convention is load-bearing for both the registry lookup and the source panel.

- [ ] **Step 2: Register it**

In `manifest.json`, add an entry mapping id `row-ordering` to `sourceFile: "row-ordering.tsx"` and `exportName: "RowOrderingExample"`, matching the shape of the entries already there.

In `registry.ts`, add the `sourceFile` → dynamic import entry:

```ts
	'row-ordering.tsx': () => import('./components/row-ordering'),
```

This registry is hand-maintained on purpose and nothing catches a missing entry: lint, typecheck and build all pass, and the example throws `has no registry entry for "row-ordering.tsx"` only when the page renders.

- [ ] **Step 3: Verify the example renders in both kits**

Run: `pnpm docs:dev`
Open `http://localhost:3000/examples/shadcn/row-ordering` and `http://localhost:3000/examples/heroui/row-ordering`.
Expected: a grid with an actions column whose overflow menu offers Move up / Move down, disabled at the ends.

- [ ] **Step 4: Write the E2E spec**

Create `apps/docs/e2e/packages/data-grid/ordering/rows.spec.ts`. Read `apps/docs/e2e/packages/data-grid/columns/ordering.spec.ts` first and reuse its fixtures and its both-kits loop verbatim — the harness is the point, not the assertions.

Cover:

1. the menu's Move down reorders two rows (assert on `[data-row-id]` order);
2. Move up on the first row is disabled;
3. `Alt+ArrowDown` with focus inside a row reorders — **skipped for HeroUI if Task 0 found the divergence**, using the same `test.skip` pattern the column spec uses for #223;
4. with a sort applied, both entries are disabled.

- [ ] **Step 5: Run the E2E suite**

Run: `pnpm --filter @ez-kit/docs exec playwright test e2e/packages/data-grid/ordering/rows.spec.ts`
Expected: PASS in every configured kit project.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/shared/data-grid/examples/ apps/docs/e2e/packages/data-grid/ordering/
git commit -m "test(docs): cover row reordering in both kits"
```

---

### Task 12: Documentation and release

**Files:**

- Create: `apps/docs/content/docs/data-grid/row-ordering.mdx`
- Modify: `apps/docs/content/docs/data-grid/meta.json`
- Modify: `apps/docs/content/docs/data-grid/columns/ordering.mdx`
- Modify: `apps/docs/components/feature-matrix.data.ts`
- Modify: `apps/docs/test/docs-options/page-type-map.ts`
- Create: `.changeset/<generated-name>.md`

**Interfaces:**

- Consumes: everything above.
- Produces: a documented, released feature.

- [ ] **Step 1: Write the page**

Create `apps/docs/content/docs/data-grid/row-ordering.mdx`. Read `columns/ordering.mdx` first and follow its structure. It must cover, because each is a decision a reader will otherwise hit as a surprise:

- the two modes and how `onChange` selects between them, with a controlled example that splices the consumer's own array;
- an options table for `RowOrderingConfig`;
- that a bare `ordering: true` is columns-only;
- that the arrows are disabled while a sort is applied, and why;
- that a move stops at a page edge;
- that `getRowId` must be set to something stable — index-derived ids change the moment rows move;
- the `Alt+ArrowUp` / `Alt+ArrowDown` shortcut;
- a `<DataGridDocsExample id="row-ordering" />` live preview.

- [ ] **Step 2: Add it to the nav**

In `meta.json`, add `"row-ordering"` to `pages`, directly after `"row-actions"`.

- [ ] **Step 3: Cross-link**

In `columns/ordering.mdx`, add a line pointing at the new page — rows are the question a reader of that page will ask next.

- [ ] **Step 4: Update the feature matrix**

In `feature-matrix.data.ts`, add to the `Rows & Selection` category:

```ts
	{
		category: 'Rows & Selection',
		feature: 'Row reordering (menu + keyboard)',
		description: 'Move a row one step up or down from its action menu or with Alt+Arrow.',
		status: FeatureStatus.Done,
		doc: 'row-ordering',
	},
```

Leave `Row drag reorder` at `Planned` — this ships keyboard and menu reordering, not drag.

Separately, flip `i18n / messages` from `Planned` to `Done` with `doc: 'localization'`. Localisation shipped long ago (`core/src/messages/**`, `localization.mdx`, `e2e/…/localization/messages.spec.ts`) and the Features page currently tells every reader otherwise.

- [ ] **Step 5: Map the page for the option-name test**

In `apps/docs/test/docs-options/page-type-map.ts`, add `'data-grid/row-ordering.mdx'` to `DocPage` and a `PAGE_ENTRIES` entry classifying **every** table on the page — the `RowOrderingConfig` table as an `optionTables` entry with its governing type and its exact checked-name count, any other table as a `nonOptionTables` entry with a reason. An unclassified table fails the test, as does a drifted count.

- [ ] **Step 6: Run the docs tests**

Run: `pnpm build && pnpm --filter @ez-kit/docs test`
Expected: PASS. The build is required first — the option-name test resolves package exports through `./dist`.

- [ ] **Step 7: Write the changeset**

Run: `pnpm changeset`

Select `@ez-kit/data-grid-core`, `@ez-kit/data-grid-react` and `@ez-kit/data-grid-heroui`. **Minor** for each. Do **not** select `@ez-kit/data-grid-shadcn`.

Summary:

```
Add row reordering: `ordering: { row: true }` puts Move up / Move down in a row's action menu and answers `Alt+ArrowUp` / `Alt+ArrowDown`. Supply `ordering: { row: { onChange } }` to own the order yourself.
```

- [ ] **Step 8: Run the full check**

Run: `pnpm run ci`
Expected: lint, typecheck, test, build and size all pass. If `size` fails on `@ez-kit/data-grid-core` or `@ez-kit/data-grid-react`, raise that entry's `limit` in its `package.json` to the new size plus roughly 15% headroom, and say so in the PR body — the budgets are tuned deliberately, so a silent bump is not acceptable.

- [ ] **Step 9: Commit and open the PR**

```bash
git add -A
git commit -m "docs(data-grid): document row reordering"
git push -u origin feat/data-grid-row-ordering
gh pr create --base develop --title "feat(data-grid): row reordering" --body "…"
```

The PR body must include `Closes #<issue>` only if an issue exists for this. It must contain no agent attribution — no model name, no session link, no `Co-Authored-By:`.

---

## Self-Review

**Spec coverage:**

| Spec section                     | Task                |
| -------------------------------- | ------------------- |
| Public API / `RowOrderingConfig` | 3                   |
| Move payload / `RowMove`         | 1                   |
| Core move math                   | 1                   |
| Neighbour rules                  | 1                   |
| Sorting lock                     | 1                   |
| Menu entries                     | 8                   |
| Message keys + trigger label     | 4, 8                |
| Actions column appears           | 5                   |
| `Alt+Arrow`                      | 9                   |
| `isTextEntryTarget`              | 9                   |
| HeroUI risk                      | 0, 10               |
| Uncontrolled mode                | 3, 7                |
| `applyRowOrder`                  | 2                   |
| State persistence (excluded)     | — none needed       |
| `getRowId` dev warning           | **gap — see below** |
| Testing                          | 1, 2, 3, 5–9, 11    |
| Documentation                    | 12                  |
| Release                          | 12                  |

**Gap found:** the spec's _Error handling_ section requires a development warning when row ordering is on and `getRowId` is left at the index default. No task implements it. Added below as Task 3a, to run between Tasks 3 and 4.

**Type consistency:** checked — `RowMove` / `RowMoveDirection` / `canMoveRow` / `moveRow` / `applyRowMove` / `applyRowOrder` / `table.ordering` / `grid.ordering.row` / `RowActionId.MoveUp` / `GridMenuIcon.MoveUp` are spelled identically in every task that names them.

---

### Task 3a: Warn when `getRowId` is left at the default

**Files:**

- Modify: `packages/data-grid/core/src/create-table/create-table.ts` (the `if (IS_DEV)` block around line 318)
- Modify: `packages/data-grid/core/src/create-table/create-table.test.ts`

**Interfaces:**

- Consumes: `hasRowOrdering` from Task 5. If Task 5 has not run yet, resolve the flag the same way it does; when Task 5 lands it will already be there.
- Produces: one development warning.

- [ ] **Step 1: Write the failing test**

Append to `packages/data-grid/core/src/create-table/create-table.test.ts`, matching how its neighbours spy on `console.warn`:

```ts
test('warns when row ordering runs on index-derived row ids', () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
	createTable<{ name: string }>({
		data: [{ name: 'A' }],
		columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
		ordering: { row: true },
	})
	expect(warn).toHaveBeenCalledWith(expect.stringContaining('getRowId'))
	warn.mockRestore()
})

test('does not warn when getRowId is supplied', () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
	createTable<{ id: string; name: string }>({
		data: [{ id: 'a', name: 'A' }],
		columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
		getRowId: (row) => row.id,
		ordering: { row: true },
	})
	expect(warn).not.toHaveBeenCalled()
	warn.mockRestore()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/create-table/create-table.test.ts`
Expected: FAIL — nothing warns.

- [ ] **Step 3: Add the warning**

Inside the existing `if (IS_DEV)` block in `create-table.ts`:

```ts
// Row ordering records an order as row ids, and TanStack's default id is the row's
// index — which changes the moment a row moves, so the recorded order would refer to
// whichever rows now sit in those positions. This is the feature's one real
// misconfiguration, and it is silent without this.
if (hasRowOrdering && config.getRowId === undefined) {
	console.warn(
		'[data-grid] `ordering: { row: … }` needs a stable `getRowId`. Without one a row id is ' +
			'its index, which changes as soon as a row moves, so the order refers to the wrong rows.',
	)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @ez-kit/data-grid-core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/core/src/create-table/
git commit -m "feat(data-grid-core): warn when row ordering runs on index row ids"
```
