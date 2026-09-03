# Data Grid Deferred Apply — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a server-driven grid accumulate sorting, column-filter and global-search changes as a draft and send them to the consumer exactly once, when the user applies them.

**Architecture:** A new core `TableFeature` adds a `state.applied` snapshot of the last query the consumer saw. The live `sorting` / `columnFilters` / `globalFilter` slices keep holding what the user is composing, so TanStack and every existing control write to them unchanged. The single `onStateChange` funnel in `create-table.ts` substitutes the applied snapshot back over those three slices before emitting, and skips emitting entirely when the substituted snapshot is unchanged. React adds a bar controller and `data-draft-*` attributes; the kits style them.

**Tech Stack:** TypeScript (strict, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), `@tanstack/table-core`, Vitest + jsdom, React 19, Tailwind (shadcn / HeroUI kits), Fumadocs.

**Spec:** `docs/superpowers/specs/2026-08-24-data-grid-deferred-apply-design.md`

## Global Constraints

- `packages/data-grid/react/react` must contain **zero** visual styling — no `style={{}}`, no `className` styling. It may only add `data-*` attributes. All colour/spacing lives in `shadcn` and `heroui`.
- `packages/data-grid/react/shadcn/src/components/ui/**` is vendored and **immutable**. Overrides go in `packages/data-grid/react/shadcn/src/blocks/`. The heroui kit's `src/components/ui/action-bar.tsx` is hand-written and editable.
- Public API is exported exclusively from each package's `src/index.ts`.
- Type imports must use `import type`. `import/order` is enforced (alphabetical, grouped). Lint runs with `--max-warnings=0`.
- Conventional Commits are enforced by commitlint. Pre-push runs `pnpm ci:fast`.
- Pre-1.0 packages ship breaking changes as **minor**, never major. Every user-visible change needs a `.changeset/*.md`.
- Run a single package's tests directly: `pnpm --filter @ez-kit/data-grid-core test`. Do not chain shell commands.
- A core feature's `declare module` augmentation only reaches `dist/index.d.ts` if `src/index.ts` re-exports a **type** from that feature module. Follow the pattern in `features/loading/loading.ts`.

## Storage arrangement (deviation from the spec's wording — read this first)

The spec describes `state.draft` holding the draft and the ordinary slices holding the applied values. The implementation **inverts** that:

- `state.sorting` / `state.columnFilters` / `state.globalFilter` hold the **live draft** values.
- `state.applied` holds the **snapshot of what the consumer last saw**.

Rationale: TanStack writes header clicks and filter input straight into the ordinary slices through its own updaters. Storing the draft anywhere else would mean intercepting each of those writes, reverting the ordinary slice and re-routing the value — in the hottest path in the file. Storing the _applied snapshot_ instead leaves every existing write untouched and confines the whole feature to two places: what gets emitted, and what controlled input may overwrite.

The public contract in the spec is unchanged: the consumer still never sees a draft through `onStateChange`, and `table.draft.*` is still the only way to read or write it. Only the internal slice name differs, plus the two consequences below:

- `initialState.draft` seeds the live slices; `initialState.sorting` (and friends) seed `state.applied`. A grid given only `initialState.sorting` is therefore not dirty, which is what the spec requires.
- `table.draft.get()` reads the live slices, not a dedicated one.

## File Structure

**Create**

- `packages/data-grid/core/src/features/deferred-apply/deferred-apply.ts` — the feature: `AppliedState` type, module augmentation, `getInitialState`, `createTable` installing `table.draft`.
- `packages/data-grid/core/src/features/deferred-apply/deferred-apply.test.ts`
- `packages/data-grid/core/src/features/deferred-apply/index.ts`
- `packages/data-grid/react/react/src/data-grid/draft-bar.tsx` — headless controller deciding what the shared bar shows.
- `packages/data-grid/react/react/src/data-grid/draft-bar.test.tsx`
- `apps/docs/shared/data-grid/examples/components/deferred-apply.tsx`

**Modify**

- `packages/data-grid/core/src/types.ts` — `deferredApply?: boolean` on `TableConfig`.
- `packages/data-grid/core/src/create-table/create-table.ts` — register the feature; substitute-and-skip in `onStateChange` (~line 204); guard `syncControlledState` (~line 371); dev-error on misconfiguration.
- `packages/data-grid/core/src/index.ts` — re-export the feature's types.
- `packages/data-grid/react/react/src/data-grid/selection-bar.tsx` — become a section of the shared bar.
- `packages/data-grid/react/react/src/data-grid/header-cell.tsx`, filter chip renderer — add `data-draft-sorting` / `data-draft-filter`.
- `packages/data-grid/react/shadcn/src/blocks/**`, `packages/data-grid/react/heroui/src/blocks/**` — style the pending treatment, render the bar's two shapes.
- `apps/docs/shared/data-grid/examples/manifest.json`, `registry.ts`, `apps/docs/content/docs/data-grid/production.mdx`.

---

### Task 1: Core — applied snapshot and dirty detection

**Files:**

- Create: `packages/data-grid/core/src/features/deferred-apply/deferred-apply.ts`
- Create: `packages/data-grid/core/src/features/deferred-apply/index.ts`
- Test: `packages/data-grid/core/src/features/deferred-apply/deferred-apply.test.ts`
- Modify: `packages/data-grid/core/src/types.ts`, `packages/data-grid/core/src/index.ts`, `packages/data-grid/core/src/create-table/create-table.ts`

**Interfaces:**

- Consumes: `createTable` from `packages/data-grid/core/src/create-table`.
- Produces: `AppliedState`, `DraftAxis`, `DeferredApplyFeature`; `table.draft.get()`, `table.draft.isDirty()`, `table.draft.getPendingCount()`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/data-grid/core/src/features/deferred-apply/deferred-apply.test.ts
import { describe, expect, it } from 'vitest'

import { createTable } from '../../create-table'

import type { ColumnDef } from '../../column/types'

type Row = { id: string; name: string; age: number }

const DATA: Row[] = [
	{ id: '1', name: 'Ann', age: 30 },
	{ id: '2', name: 'Bob', age: 40 },
]
const COLUMNS: ColumnDef<Row>[] = [{ accessorKey: 'name' }, { accessorKey: 'age' }]

function makeTable(overrides: Record<string, unknown> = {}) {
	return createTable({
		data: DATA,
		columns: COLUMNS,
		sorting: { manual: true },
		filtering: { manual: true },
		globalFiltering: { manual: true },
		deferredApply: true,
		...overrides,
	})
}

describe('deferredApply — applied snapshot', () => {
	it('is not dirty on a fresh table', () => {
		expect(makeTable().draft.isDirty()).toBe(false)
	})

	it('seeds the applied snapshot from initialState so an initial sort is not dirty', () => {
		const table = makeTable({ initialState: { sorting: [{ id: 'name', desc: false }] } })

		expect(table.draft.isDirty()).toBe(false)
		expect(table.getState().applied.sorting).toEqual([{ id: 'name', desc: false }])
	})

	it('becomes dirty once a sort is added, without moving the applied snapshot', () => {
		const table = makeTable()

		table.setSorting([{ id: 'age', desc: true }])

		expect(table.draft.isDirty()).toBe(true)
		expect(table.draft.get().sorting).toEqual([{ id: 'age', desc: true }])
		expect(table.getState().applied.sorting).toEqual([])
	})

	it('counts pending changes per axis', () => {
		const table = makeTable()

		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		expect(table.draft.getPendingCount()).toEqual({ sorting: 1, filters: 1, search: false })
	})

	it('reports search as pending when the global filter differs from applied', () => {
		const table = makeTable()

		table.setGlobalFilter('bob')

		expect(table.draft.getPendingCount()).toEqual({ sorting: 0, filters: 0, search: true })
	})

	it('seeds a restored draft from initialState.draft, leaving applied at its own seed', () => {
		const table = makeTable({
			initialState: {
				sorting: [{ id: 'name', desc: false }],
				draft: { sorting: [{ id: 'age', desc: true }] },
			},
		})

		expect(table.getState().sorting).toEqual([{ id: 'age', desc: true }])
		expect(table.getState().applied.sorting).toEqual([{ id: 'name', desc: false }])
		expect(table.draft.isDirty()).toBe(true)
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-core test`
Expected: FAIL — `table.draft` is undefined, `deferredApply` is not a known config key.

- [ ] **Step 3: Write the feature**

```ts
// packages/data-grid/core/src/features/deferred-apply/deferred-apply.ts
import type {
	ColumnFiltersState,
	InitialTableState,
	RowData,
	SortingState,
	Table,
	TableFeature,
	TableState,
} from '@tanstack/table-core'

/** The three query axes whose application can be deferred. */
export type DraftAxis = 'sorting' | 'columnFilters' | 'globalFilter'

/**
 * Snapshot of the query the consumer last saw. The live `sorting` /
 * `columnFilters` / `globalFilter` slices hold what the user is composing;
 * this holds what was actually emitted. The difference between the two is the
 * draft.
 */
export type AppliedState = {
	sorting: SortingState
	columnFilters: ColumnFiltersState
	globalFilter: unknown
}

/** What `table.draft.get()` returns — the live values of the three axes. */
export type QueryDraft = AppliedState

export type PendingCount = {
	sorting: number
	filters: number
	search: boolean
}

export type DraftApi = {
	get: () => QueryDraft
	isDirty: () => boolean
	getPendingCount: () => PendingCount
}

declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState {
		applied: AppliedState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface InitialTableState {
		/** Restored draft — seeds the live axes on top of the applied seed. */
		draft?: Partial<AppliedState>
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table<TData extends RowData> {
		draft: DraftApi
	}
}

/** Reference-and-value comparison good enough for the three axes we track. */
function sameAxis(a: unknown, b: unknown): boolean {
	if (a === b) return true
	return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

export const DEFAULT_APPLIED_STATE: AppliedState = {
	sorting: [],
	columnFilters: [],
	globalFilter: undefined,
}

export const DeferredApplyFeature: TableFeature<RowData> = {
	// `initialState.sorting` (and friends) seed the APPLIED snapshot — a grid given
	// an initial sort must not be born dirty. `initialState.draft` seeds the live
	// slices on top, which is how a draft restored from storage comes back pending.
	getInitialState: (state?: InitialTableState) => {
		const seed = state as (Partial<TableState> & { draft?: Partial<AppliedState> }) | undefined
		const applied: AppliedState = {
			sorting: seed?.sorting ?? DEFAULT_APPLIED_STATE.sorting,
			columnFilters: seed?.columnFilters ?? DEFAULT_APPLIED_STATE.columnFilters,
			globalFilter: seed?.globalFilter,
		}
		const { draft, ...rest } = seed ?? {}
		return {
			...rest,
			applied,
			sorting: draft?.sorting ?? applied.sorting,
			columnFilters: draft?.columnFilters ?? applied.columnFilters,
			globalFilter: draft !== undefined && 'globalFilter' in draft ? draft.globalFilter : applied.globalFilter,
		} as Partial<TableState>
	},

	createTable: (table: Table<RowData>) => {
		const get = (): QueryDraft => {
			const s = table.getState()
			return { sorting: s.sorting, columnFilters: s.columnFilters, globalFilter: s.globalFilter }
		}

		table.draft = {
			get,
			isDirty: () => {
				const { applied } = table.getState()
				const live = get()
				return (
					!sameAxis(live.sorting, applied.sorting) ||
					!sameAxis(live.columnFilters, applied.columnFilters) ||
					!sameAxis(live.globalFilter, applied.globalFilter)
				)
			},
			getPendingCount: () => {
				const { applied } = table.getState()
				const live = get()
				const changedFilters = live.columnFilters.filter(
					(f) =>
						!sameAxis(
							f,
							applied.columnFilters.find((a) => a.id === f.id),
						),
				).length
				const removedFilters = applied.columnFilters.filter(
					(a) => !live.columnFilters.some((f) => f.id === a.id),
				).length
				const changedSorts = live.sorting.filter((s, i) => !sameAxis(s, applied.sorting[i])).length
				const removedSorts = Math.max(applied.sorting.length - live.sorting.length, 0)
				return {
					sorting: changedSorts + removedSorts,
					filters: changedFilters + removedFilters,
					search: !sameAxis(live.globalFilter, applied.globalFilter),
				}
			},
		}
	},
}
```

```ts
// packages/data-grid/core/src/features/deferred-apply/index.ts
export * from './deferred-apply'
```

- [ ] **Step 4: Wire the feature and the config key**

In `packages/data-grid/core/src/types.ts`, next to the other capability keys on `TableConfig` (around line 449, after `deleting`):

```ts
	/**
	 * Defer application of sorting, column filters and global search. While on,
	 * those three axes accumulate as a draft and reach `onStateChange` only when
	 * `table.draft.apply()` runs — one state change, one request, instead of one
	 * per keystroke. Requires `manual: true` on at least one of the three.
	 */
	deferredApply?: boolean
```

In `packages/data-grid/core/src/create-table/create-table.ts`, add the import next to the other feature imports (alphabetical, so before `DeletingFeature`):

```ts
import { DeferredApplyFeature } from '../features/deferred-apply'
```

and add it to `_features` in the options object (~line 240):

```ts
		_features: [CreatingFeature, DeferredApplyFeature, EditingFeature, DeletingFeature, LoadingFeature, InfiniteFeature],
```

In `packages/data-grid/core/src/index.ts`, re-export a **type** from the feature module so the `declare module` augmentation survives the `.d.ts` bundle:

```ts
export type { AppliedState, DraftApi, DraftAxis, PendingCount, QueryDraft } from './features/deferred-apply'
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-core test`
Expected: PASS — all five cases in `deferred-apply.test.ts`, and the existing suite still green.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/core/src
git commit -m "feat(data-grid): add applied-query snapshot and draft dirty detection"
```

---

### Task 2: Core — apply, reset and resetAxis

**Files:**

- Modify: `packages/data-grid/core/src/features/deferred-apply/deferred-apply.ts`
- Test: `packages/data-grid/core/src/features/deferred-apply/deferred-apply.test.ts`

**Interfaces:**

- Consumes: `DraftApi`, `AppliedState` from Task 1.
- Produces: `table.draft.apply()`, `table.draft.reset()`, `table.draft.resetAxis(axis)`, `table.draft.set(next)`.

- [ ] **Step 1: Write the failing test**

Append to `deferred-apply.test.ts`:

```ts
describe('deferredApply — apply / reset', () => {
	it('apply() moves the draft into the applied snapshot and clears dirtiness', () => {
		const table = makeTable()
		table.setSorting([{ id: 'age', desc: true }])

		table.draft.apply()

		expect(table.draft.isDirty()).toBe(false)
		expect(table.getState().applied.sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('apply() resets pageIndex to 0 in the same state change', () => {
		const table = makeTable({ pagination: { manual: true, pageSize: 10, rowCount: 100 } })
		table.setPageIndex(3)
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		table.draft.apply()

		expect(table.getState().pagination.pageIndex).toBe(0)
	})

	it('apply() clears the row selection', () => {
		const table = makeTable({ selection: true })
		table.setRowSelection({ '1': true })
		table.setSorting([{ id: 'age', desc: true }])

		table.draft.apply()

		expect(table.getState().rowSelection).toEqual({})
	})

	it('reset() restores the live axes from the applied snapshot', () => {
		const table = makeTable()
		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		table.draft.reset()

		expect(table.draft.isDirty()).toBe(false)
		expect(table.getState().sorting).toEqual([])
		expect(table.getState().columnFilters).toEqual([])
	})

	it('resetAxis() backs out one axis and leaves the others pending', () => {
		const table = makeTable()
		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		table.draft.resetAxis('sorting')

		expect(table.getState().sorting).toEqual([])
		expect(table.getState().columnFilters).toEqual([{ id: 'name', value: 'An' }])
		expect(table.draft.isDirty()).toBe(true)
	})

	it('set() writes draft values without touching the applied snapshot', () => {
		const table = makeTable()

		table.draft.set({ globalFilter: 'bob' })

		expect(table.getState().globalFilter).toBe('bob')
		expect(table.getState().applied.globalFilter).toBeUndefined()
		expect(table.draft.isDirty()).toBe(true)
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-core test`
Expected: FAIL — `table.draft.apply is not a function`.

- [ ] **Step 3: Extend the API**

Add to `DraftApi` in `deferred-apply.ts`:

```ts
export type DraftApi = {
	get: () => QueryDraft
	set: (next: Partial<QueryDraft>) => void
	isDirty: () => boolean
	getPendingCount: () => PendingCount
	apply: () => void
	reset: () => void
	resetAxis: (axis: DraftAxis) => void
}
```

and inside `createTable`, hoist every method into a named `const` **above** the assignment — the object literal cannot reference `table.draft` while it is still being built — then assign once:

```ts
// `get`, `isDirty` and `getPendingCount` keep the bodies written in Task 1;
// move them from the object literal into `const`s of the same names.

const set = (next: Partial<QueryDraft>): void => {
	table.setState((state) => ({
		...state,
		...(next.sorting !== undefined ? { sorting: next.sorting } : {}),
		...(next.columnFilters !== undefined ? { columnFilters: next.columnFilters } : {}),
		...('globalFilter' in next ? { globalFilter: next.globalFilter } : {}),
	}))
}

// One `setState` on purpose: the pageIndex reset, the selection clear and the
// snapshot move must land in a single state change, or the funnel emits twice
// and the consumer fires two requests — the exact thing this feature exists
// to prevent.
const apply = (): void => {
	table.setState((state) => ({
		...state,
		applied: {
			sorting: state.sorting,
			columnFilters: state.columnFilters,
			globalFilter: state.globalFilter,
		},
		pagination: { ...state.pagination, pageIndex: 0 },
		rowSelection: {},
	}))
}

const reset = (): void => {
	table.setState((state) => ({
		...state,
		sorting: state.applied.sorting,
		columnFilters: state.applied.columnFilters,
		globalFilter: state.applied.globalFilter,
	}))
}

const resetAxis = (axis: DraftAxis): void => {
	table.setState((state) => ({ ...state, [axis]: state.applied[axis] }))
}

table.draft = { get, set, isDirty, getPendingCount, apply, reset, resetAxis }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/core/src/features/deferred-apply
git commit -m "feat(data-grid): add draft apply, reset and per-axis reset"
```

---

### Task 3: Core — gate what leaves the grid

This is the task that actually makes the feature do anything. Everything before it was bookkeeping.

**Files:**

- Modify: `packages/data-grid/core/src/create-table/create-table.ts:204-225` (the `onStateChange` funnel)
- Test: `packages/data-grid/core/src/features/deferred-apply/deferred-apply.test.ts`

**Interfaces:**

- Consumes: `state.applied` and `table.draft.*` from Tasks 1–2.
- Produces: nothing new on the public API — it changes _when_ `config.onStateChange`, `sorting.onChange`, `filtering.onChange` and `globalFiltering.onChange` fire.

- [ ] **Step 1: Write the failing test**

Append to `deferred-apply.test.ts`:

```ts
describe('deferredApply — emission gating', () => {
	function makeSpyTable() {
		const calls: { sorting: unknown[]; state: number } = { sorting: [], state: 0 }
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true, onChange: (s) => calls.sorting.push(s) },
			filtering: { manual: true },
			globalFiltering: { manual: true },
			pagination: { manual: true, pageSize: 10, rowCount: 100 },
			deferredApply: true,
			onStateChange: () => {
				calls.state += 1
			},
		})
		return { table, calls }
	}

	it('does not emit while the draft is only accumulating', () => {
		const { table, calls } = makeSpyTable()

		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		expect(calls.state).toBe(0)
		expect(calls.sorting).toEqual([])
	})

	it('emits exactly once on apply()', () => {
		const { table, calls } = makeSpyTable()
		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		table.draft.apply()

		expect(calls.state).toBe(1)
		expect(calls.sorting).toEqual([[{ id: 'age', desc: true }]])
	})

	it('does not emit on reset()', () => {
		const { table, calls } = makeSpyTable()
		table.setSorting([{ id: 'age', desc: true }])

		table.draft.reset()

		expect(calls.state).toBe(0)
	})

	it('emits immediately for pagination, which is never deferred', () => {
		const { table, calls } = makeSpyTable()

		table.setPageIndex(2)

		expect(calls.state).toBe(1)
	})

	it('emits the applied query, not the draft, when the page changes while dirty', () => {
		const seen: unknown[] = []
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true },
			filtering: { manual: true },
			pagination: { manual: true, pageSize: 10, rowCount: 100 },
			deferredApply: true,
			onStateChange: (updater) => {
				seen.push(typeof updater === 'function' ? updater(table.getState()) : updater)
			},
		})
		table.setSorting([{ id: 'age', desc: true }])

		table.setPageIndex(1)

		expect((seen.at(-1) as { sorting: unknown }).sorting).toEqual([])
	})

	it('behaves exactly as today when deferredApply is off', () => {
		const calls: number[] = []
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true },
			onStateChange: () => calls.push(1),
		})

		table.setSorting([{ id: 'age', desc: true }])

		expect(calls).toHaveLength(1)
		expect(table.draft.isDirty()).toBe(false)
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-core test`
Expected: FAIL — the first case reports `calls.state` of 2, because every draft edit still emits.

- [ ] **Step 3: Substitute and skip in the funnel**

In `create-table.ts`, above `const onStateChange`, add:

```ts
const deferred = config.deferredApply === true

/**
 * The snapshot the outside world is allowed to see: the three deferrable axes
 * replaced by the applied snapshot, and `applied` itself dropped. With
 * `deferredApply` off this is the identity function.
 */
const toOutward = (state: TableState): TableState => {
	if (!deferred) return state
	const { applied, ...rest } = state
	return {
		...rest,
		sorting: applied.sorting,
		columnFilters: applied.columnFilters,
		globalFilter: applied.globalFilter,
	} as TableState
}

const outwardUnchanged = (a: TableState, b: TableState): boolean =>
	a.sorting === b.sorting &&
	a.columnFilters === b.columnFilters &&
	a.globalFilter === b.globalFilter &&
	a.pagination === b.pagination &&
	a.rowSelection === b.rowSelection &&
	a.expanded === b.expanded &&
	a.columnVisibility === b.columnVisibility &&
	a.columnOrder === b.columnOrder &&
	a.columnPinning === b.columnPinning &&
	a.columnSizing === b.columnSizing
```

Then rewrite the body of `onStateChange` (currently lines 204–225) as:

```ts
const onStateChange = (updater: Updater<TableState>): void => {
	const currentState = store.getState()
	const requested = typeof updater === 'function' ? updater(currentState) : updater
	const next = enforceColumnInvariants(requested, columnInvariants)
	ref.table?.setOptions((prev) => ({ ...prev, state: next }))
	store.setState(next)

	const outwardPrev = toOutward(currentState)
	const outwardNext = toOutward(next)

	// A draft edit changes nothing the consumer is allowed to see. Emitting an
	// identical snapshot would be noise at best and a duplicate request at
	// worst, so the funnel stays silent and "onStateChange fired" keeps meaning
	// "the query changed".
	if (deferred && outwardUnchanged(outwardPrev, outwardNext)) return

	config.onStateChange?.(outwardNext)

	if (sortingOnChange && outwardPrev.sorting !== outwardNext.sorting) {
		sortingOnChange(outwardNext.sorting)
	}
	if (filteringOnChange && outwardPrev.columnFilters !== outwardNext.columnFilters) {
		filteringOnChange(outwardNext.columnFilters)
	}
	if (globalFilteringOnChange && outwardPrev.globalFilter !== outwardNext.globalFilter) {
		globalFilteringOnChange(outwardNext.globalFilter)
	}
	if (paginationOnChange && outwardPrev.pagination !== outwardNext.pagination) {
		paginationOnChange(outwardNext.pagination)
	}
}
```

Two behaviour changes to be deliberate about, both required by the tests above:

1. `config.onStateChange` now receives a resolved `TableState` rather than the raw `Updater`. Passing the raw updater through would hand the consumer a function that recomputes from _their_ state and reintroduces the draft. Check every call site and the docs examples; this is a breaking change to that callback's argument and needs a **minor** changeset with the break named in the summary.
2. The per-feature `onChange` comparisons now run against the outward snapshots, so with `deferredApply` off they compare exactly the same references as before and behaviour is unchanged.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-core test`
Expected: PASS, including the "behaves exactly as today" case.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/core/src/create-table packages/data-grid/core/src/features/deferred-apply
git commit -m "feat(data-grid)!: emit only the applied query while a draft is pending"
```

---

### Task 4: Core — protect the draft from controlled input, and fail loudly on misconfiguration

**Files:**

- Modify: `packages/data-grid/core/src/create-table/create-table.ts:371` (`syncControlledState`) and the config validation near the top of `createTable`
- Test: `packages/data-grid/core/src/features/deferred-apply/deferred-apply.test.ts`

**Interfaces:**

- Consumes: `toOutward` / `deferred` from Task 3.
- Produces: no new API.

- [ ] **Step 1: Write the failing test**

```ts
describe('deferredApply — controlled input and misconfiguration', () => {
	it('does not let controlled state clobber a pending draft', () => {
		const table = makeTable()
		table.setSorting([{ id: 'age', desc: true }])

		// The consumer mirrors back what it last saw — the APPLIED query.
		table.syncControlledState({ sorting: [] })

		expect(table.getState().sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('accepts controlled updates to non-deferred slices while dirty', () => {
		const table = makeTable({ pagination: { manual: true, pageSize: 10, rowCount: 100 } })
		table.setSorting([{ id: 'age', desc: true }])

		table.syncControlledState({ pagination: { pageIndex: 2, pageSize: 10 } })

		expect(table.getState().pagination.pageIndex).toBe(2)
		expect(table.getState().sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('accepts controlled updates to the deferred axes once clean', () => {
		const table = makeTable()

		table.syncControlledState({ sorting: [{ id: 'name', desc: false }] })

		expect(table.getState().sorting).toEqual([{ id: 'name', desc: false }])
	})

	it('throws when deferredApply is set without a manual axis', () => {
		expect(() => createTable({ data: DATA, columns: COLUMNS, sorting: true, deferredApply: true })).toThrow(
			/deferredApply requires/,
		)
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-core test`
Expected: FAIL — the draft is overwritten, and no error is thrown.

- [ ] **Step 3: Implement both guards**

Config validation, placed right after `config` is destructured near the top of `createTable`:

```ts
if (config.deferredApply === true) {
	const anyManual =
		(typeof config.sorting === 'object' && config.sorting.manual === true) ||
		(typeof config.filtering === 'object' && config.filtering.manual === true) ||
		(typeof config.globalFiltering === 'object' && config.globalFiltering.manual === true)
	if (!anyManual) {
		throw new Error(
			'deferredApply requires `manual: true` on at least one of `sorting`, `filtering` or ' +
				'`globalFiltering`. Client-side deferral is not supported: without manual mode the ' +
				'row models recompute on every draft edit, so nothing is actually deferred.',
		)
	}
}
```

`syncControlledState` (~line 371) drops the deferred axes while a draft is pending:

```ts
const DRAFT_AXES = ['sorting', 'columnFilters', 'globalFilter'] as const

dataTable.syncControlledState = (partial, options) => {
	let incoming = partial
	if (deferred && ref.table?.draft.isDirty() === true) {
		// The consumer only ever saw the applied query, so what it mirrors back
		// for these three axes is stale by construction. Accepting it would
		// silently discard whatever the user is composing.
		const filtered = { ...partial }
		for (const axis of DRAFT_AXES) delete filtered[axis]
		incoming = filtered
	}
	const safe = enforceColumnInvariants(incoming, columnInvariants)
	ref.table?.setOptions((prev) => ({
		...prev,
		state: { ...prev.state, ...safe },
	}))
	store.setState((prev) => ({ ...prev, ...safe }), options)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/core/src
git commit -m "feat(data-grid): shield the pending draft from controlled state and misconfiguration"
```

---

### Task 5: React — shared bar controller

**Files:**

- Create: `packages/data-grid/react/react/src/data-grid/draft-bar.tsx`
- Create: `packages/data-grid/react/react/src/data-grid/draft-bar.test.tsx`
- Modify: `packages/data-grid/react/react/src/data-grid/selection-bar.tsx`, `packages/data-grid/react/react/src/components-context.tsx`, `packages/data-grid/react/react/src/index.ts`

**Interfaces:**

- Consumes: `table.draft.isDirty()`, `getPendingCount()`, `apply()`, `reset()` from Tasks 1–2; `useTable()` from `./table-context`; `useGridComponents()` from `../components-context`.
- Produces: `<DraftBar />`; a `DraftBarProps` slot type added to the kit component contract:

```ts
export type DraftBarProps = {
	open: boolean
	pending: { sorting: number; filters: number; search: boolean }
	/** Rendered as a non-interactive context chip when rows are selected. */
	selectedCount: number
	onApply: () => void
	onReset: () => void
}
```

- [ ] **Step 1: Write the failing test**

```tsx
// packages/data-grid/react/react/src/data-grid/draft-bar.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderGrid } from '../test-utils'

describe('DraftBar', () => {
	it('is closed when nothing is pending', () => {
		renderGrid({ deferredApply: true, sorting: { manual: true } })

		expect(screen.queryByTestId('draft-bar')).toBeNull()
	})

	it('opens with the pending counts once a sort is drafted', async () => {
		const { table } = renderGrid({ deferredApply: true, sorting: { manual: true } })

		table.setSorting([{ id: 'age', desc: true }])

		expect(await screen.findByTestId('draft-bar')).toBeInTheDocument()
		expect(screen.getByTestId('draft-bar')).toHaveAttribute('data-pending-sorting', '1')
	})

	it('takes over the bar from the selection section while pending', async () => {
		const { table } = renderGrid({ deferredApply: true, sorting: { manual: true }, selection: true })
		table.setRowSelection({ '1': true })

		table.setSorting([{ id: 'age', desc: true }])

		const bar = await screen.findByTestId('draft-bar')
		expect(bar).toHaveAttribute('data-selected-count', '1')
		expect(screen.queryByTestId('selection-bar')).toBeNull()
	})

	it('applies the draft when Apply is pressed', async () => {
		const { table } = renderGrid({ deferredApply: true, sorting: { manual: true } })
		table.setSorting([{ id: 'age', desc: true }])

		await userEvent.click(await screen.findByRole('button', { name: /apply/i }))

		expect(table.draft.isDirty()).toBe(false)
	})

	it('restores the applied query when Reset is pressed', async () => {
		const { table } = renderGrid({ deferredApply: true, sorting: { manual: true } })
		table.setSorting([{ id: 'age', desc: true }])

		await userEvent.click(await screen.findByRole('button', { name: /reset/i }))

		expect(table.getState().sorting).toEqual([])
	})
})
```

If `renderGrid` in `packages/data-grid/react/react/src/test-utils.tsx` does not already return the table instance, extend it to do so as part of this task rather than duplicating a harness.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-react test`
Expected: FAIL — `draft-bar` test id never appears.

- [ ] **Step 3: Implement the controller**

```tsx
// packages/data-grid/react/react/src/data-grid/draft-bar.tsx
import { useGridComponents } from '../components-context'
import { useDataGridStore } from '../store'

import { useTable } from './table-context'

/**
 * Pending-draft section of the shared action bar.
 *
 * While a draft is pending it owns the bar outright: the selection section
 * collapses to a non-interactive count chip. That is not a layout preference —
 * applying a query can drop the selected rows from the result set, so bulk
 * actions over that selection would act on a stale set.
 */
export function DraftBar() {
	const table = useTable()
	const { DraftBar: DraftBarComponent } = useGridComponents().draft
	// Subscribe so the bar re-renders as the draft accumulates.
	useDataGridStore()

	if (table.options.deferredApply !== true) return null

	const open = table.draft.isDirty()
	if (!open) return null

	return (
		<DraftBarComponent
			open={open}
			pending={table.draft.getPendingCount()}
			selectedCount={Object.keys(table.getState().rowSelection).length}
			onApply={() => {
				table.draft.apply()
			}}
			onReset={() => {
				table.draft.reset()
			}}
		/>
	)
}
```

In `selection-bar.tsx`, add the stand-down immediately after `const table = useTable()`:

```tsx
// The draft section owns the bar while a query is pending — see DraftBar.
if (table.options.deferredApply === true && table.draft.isDirty()) return null
```

Register `DraftBar` in `components-context.tsx` alongside `selection.SelectionBar`, under a `draft` group, and export `DraftBar` plus `DraftBarProps` from `src/index.ts`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-react test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/react/react/src
git commit -m "feat(data-grid): add the pending-draft bar controller"
```

---

### Task 6: React — mark unapplied sorting and filters in the DOM

**Files:**

- Modify: `packages/data-grid/react/react/src/data-grid/header-cell.tsx` and the filter-chip renderer under `packages/data-grid/react/react/src/data-grid/`
- Test: `packages/data-grid/react/react/src/data-grid/draft-bar.test.tsx`

Locate the exact files first with `grep -rn "data-sorted\|aria-sort" packages/data-grid/react/react/src`.

**Interfaces:**

- Consumes: `table.draft` from Task 1.
- Produces: DOM contract for the kits — `data-draft-sorting="<index>"` on the `<th>` of a column whose sort is unapplied, `data-draft-filter=""` on an unapplied filter chip.

- [ ] **Step 1: Write the failing test**

```tsx
it('marks an unapplied sort on the header cell', async () => {
	const { table } = renderGrid({ deferredApply: true, sorting: { manual: true } })

	table.setSorting([{ id: 'age', desc: true }])

	const header = await screen.findByRole('columnheader', { name: /age/i })
	expect(header).toHaveAttribute('data-draft-sorting', '0')
})

it('drops the mark once the draft is applied', async () => {
	const { table } = renderGrid({ deferredApply: true, sorting: { manual: true } })
	table.setSorting([{ id: 'age', desc: true }])

	table.draft.apply()

	const header = await screen.findByRole('columnheader', { name: /age/i })
	expect(header).not.toHaveAttribute('data-draft-sorting')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-react test`
Expected: FAIL — no such attribute.

- [ ] **Step 3: Add the attributes**

In the header cell, compute the mark and spread it. No styling — this package carries none.

```tsx
const draftSortIndex =
	table.options.deferredApply === true && table.draft.isDirty()
		? table.draft.get().sorting.findIndex((s) => s.id === header.column.id)
		: -1
const draftAttrs = draftSortIndex >= 0 ? { 'data-draft-sorting': String(draftSortIndex) } : {}
```

and add `{...draftAttrs}` to the `<th>`. Apply the mirror-image treatment to the filter chip with `data-draft-filter`, comparing the chip's column id against `table.getState().applied.columnFilters`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-react test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/react/react/src
git commit -m "feat(data-grid): mark unapplied sorting and filters with data attributes"
```

---

### Task 7: Kits — render and style the bar

**Files:**

- Create: `packages/data-grid/react/shadcn/src/blocks/draft/DraftBar.tsx`
- Create: `packages/data-grid/react/heroui/src/blocks/draft/DraftBar.tsx`
- Modify: each kit's component-map registration and `src/index.ts`; each kit's stylesheet for the `data-draft-*` treatment.

**Interfaces:**

- Consumes: `DraftBarProps` from Task 5.
- Produces: the concrete `DraftBar` in each kit's component map.

- [ ] **Step 1: Write the failing test**

Add to each kit's existing block test suite:

```tsx
it('renders the pending counts and both actions', () => {
	render(
		<DraftBar
			open
			pending={{ sorting: 1, filters: 2, search: false }}
			selectedCount={3}
			onApply={() => {}}
			onReset={() => {}}
		/>,
	)

	expect(screen.getByText(/3 selected/i)).toBeInTheDocument()
	expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
	expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
})

it('omits the selection chip when nothing is selected', () => {
	render(
		<DraftBar
			open
			pending={{ sorting: 1, filters: 0, search: false }}
			selectedCount={0}
			onApply={() => {}}
			onReset={() => {}}
		/>,
	)

	expect(screen.queryByText(/selected/i)).toBeNull()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @ez-kit/data-grid-shadcn test`
Expected: FAIL — module not found.

- [ ] **Step 3: Build the kit components**

Both kits wrap their existing `components/ui/action-bar.tsx` primitive. In shadcn that primitive is vendored and **must not be edited** — the wrapper lives in `src/blocks/`. Mirror the structure `SelectionBar.tsx` already uses in the same kit so the two bars are visually identical in height, padding and elevation; the difference is content, not chrome.

Layout inside the bar, left to right: the selection chip (only when `selectedCount > 0`, non-interactive), a vertical separator, the pending summary built from `pending`, then `Reset` (secondary) and `Apply` (primary). `Apply` is the only primary button in the bar.

Add the `data-testid="draft-bar"`, `data-pending-sorting`, `data-pending-filters` and `data-selected-count` attributes the Task 5 tests assert on.

For the styling, add to each kit's stylesheet a muted, clearly-unfinished treatment:

```css
[data-draft-sorting] {
	opacity: 0.6;
}
[data-draft-sorting]::after {
	content: attr(data-draft-sorting);
}
[data-draft-filter] {
	border-style: dashed;
}
```

Tune to each kit's tokens rather than shipping this verbatim — it is the intent, not the final CSS.

- [ ] **Step 4: Run both kits' tests**

Run: `pnpm --filter @ez-kit/data-grid-shadcn test`
Then: `pnpm --filter @ez-kit/data-grid-heroui test`
Expected: PASS in both.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/react/shadcn/src packages/data-grid/react/heroui/src
git commit -m "feat(data-grid): render the pending-draft bar in both kits"
```

---

### Task 8: Apply on Enter

**Files:**

- Modify: the filter input component under `packages/data-grid/react/react/src/data-grid/` (find it with `grep -rn "onKeyDown" packages/data-grid/react/react/src/data-grid`)
- Test: `packages/data-grid/react/react/src/data-grid/draft-bar.test.tsx`

**Interfaces:**

- Consumes: `table.draft.apply()`.
- Produces: no new API.

- [ ] **Step 1: Write the failing test**

```tsx
it('applies the whole draft when Enter is pressed in a filter input', async () => {
	const { table } = renderGrid({
		deferredApply: true,
		sorting: { manual: true },
		filtering: { manual: true },
	})
	table.setSorting([{ id: 'age', desc: true }])

	const input = await screen.findByRole('textbox', { name: /filter name/i })
	await userEvent.type(input, 'An{Enter}')

	expect(table.draft.isDirty()).toBe(false)
	expect(table.getState().applied.sorting).toEqual([{ id: 'age', desc: true }])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-react test`
Expected: FAIL — still dirty after Enter.

- [ ] **Step 3: Handle the key**

```tsx
const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
	if (e.key !== 'Enter') return
	if (table.options.deferredApply !== true) return
	e.preventDefault()
	table.draft.apply()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-react test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/react/react/src
git commit -m "feat(data-grid): apply the pending draft on Enter in a filter input"
```

---

### Task 9: Docs example and changeset

**Files:**

- Create: `apps/docs/shared/data-grid/examples/components/deferred-apply.tsx`
- Modify: `apps/docs/shared/data-grid/examples/manifest.json`, `apps/docs/shared/data-grid/examples/registry.ts`, `apps/docs/content/docs/data-grid/production.mdx`
- Create: `.changeset/deferred-apply.md`

**Interfaces:**

- Consumes: everything above.
- Produces: a live example registered for both kits.

- [ ] **Step 1: Write the example**

```tsx
// apps/docs/shared/data-grid/examples/components/deferred-apply.tsx
'use client'

import { DataGrid } from '@/shared/DataGrid'

import { useOrders } from './use-orders'

/**
 * Two sort levels plus a filter leave the grid as a single request, when the
 * user presses Apply.
 */
export function DeferredApplyExample() {
	const { rows, rowCount, state, onStateChange } = useOrders()

	return (
		<DataGrid
			data={rows}
			columns={COLUMNS}
			sorting={{ manual: true, multi: true }}
			filtering={{ manual: true }}
			pagination={{ manual: true, rowCount, pageSize: 10 }}
			selection
			deferredApply
			state={state}
			onStateChange={onStateChange}
		/>
	)
}
```

Reuse the existing `useOrders`-style hook from the production page's current example rather than writing a second fake server; check `apps/docs/shared/data-grid/examples/components/` for its real name and signature first, and keep the state hook in its own file so the example body shows only the grid.

- [ ] **Step 2: Register it**

Add to `manifest.json`:

```json
{ "id": "deferred-apply", "sourceFile": "deferred-apply.tsx", "exportName": "DeferredApplyExample" }
```

Add to `registry.ts` — **this is the step that has no compile-time safety net.** A missing entry passes lint, typecheck and build, then throws `has no registry entry for "deferred-apply.tsx"` at render:

```ts
	'deferred-apply.tsx': () => import('./components/deferred-apply'),
```

- [ ] **Step 3: Reference it from the docs page**

Add a section to `apps/docs/content/docs/data-grid/production.mdx` covering: what `deferredApply` requires (`manual: true`), that the fetch trigger stays the consumer's existing `onStateChange`, that `onStateChange` now receives a resolved state rather than an updater, and that the draft is grid-owned with `table.draft.*` as the only way to read or seed it.

- [ ] **Step 4: Verify the example renders in both kits**

Run: `pnpm docs:dev`
Open `/docs/data-grid/production?kit=shadcn` and `?kit=heroui`, draft two sorts and a filter, and confirm the network panel shows **one** request on Apply and none before it.

- [ ] **Step 5: Write the changeset**

```markdown
---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Add `deferredApply`: sorting, column filters and global search accumulate as a draft and
reach the consumer as a single state change when the user applies them. Requires
`manual: true` on at least one of those axes.

Breaking: `onStateChange` now receives a resolved `TableState` instead of an `Updater`.
Consumers calling `setState(updater)` should call `setState(nextState)`.
```

- [ ] **Step 6: Full verification and commit**

Run: `pnpm run ci`
Expected: build, lint, typecheck, test and size all green.

```bash
git add apps/docs .changeset
git commit -m "docs(data-grid): add the deferred-apply example and changeset"
```
