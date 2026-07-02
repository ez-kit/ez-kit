# Data-Grid State Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship pure `extractState` / `parseState` utilities plus a reactive `useExtractedState` hook in `@ez-kit/data-grid-react`, so consumers can read grid state out for persistence and seed it back on mount — without the library ever touching storage.

**Architecture:** Two layers. Layer 1 = pure, synchronous, storage-agnostic functions over a flat `Partial<TableState>` subset. Layer 2 = a memoized `useSyncExternalStore` hook that returns the always-current extracted subset with a referentially stable identity. The actual storage read/write (Layer 3) stays consumer-owned.

**Tech Stack:** TypeScript (strict, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), React 19 `useSyncExternalStore`, Vitest + `@testing-library/react` (jsdom), TanStack Table core types.

## Global Constraints

- Package: `@ez-kit/data-grid-react` at `packages/data-grid/react/react`. All new files live under `src/state/`.
- Public API is exported **only** from `src/index.ts`.
- Type imports MUST use `import type`; value imports (constants) use `import`. `verbatimModuleSyntax` is on.
- `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are on — guard indexed reads; never assign `undefined` to an optional property (omit or `delete` instead).
- Lint runs with `--max-warnings=0`. `import/order` is enforced (alphabetical, grouped, type imports separated).
- No `console.log` in shipped code.
- Naming: constants `UPPER_SNAKE_CASE`; the closed key set is a `const` tuple + derived union (project rule: closed sets modeled as tuple/union or enum, never bare repeated literals).
- Per-package commands (run from repo root):
  - Single test file: `pnpm --filter @ez-kit/data-grid-react exec vitest run <path>`
  - Typecheck: `pnpm --filter @ez-kit/data-grid-react typecheck`
  - Lint: `pnpm --filter @ez-kit/data-grid-react lint`
  - Format: `pnpm --filter @ez-kit/data-grid-react format`
- Every commit message ends WITHOUT AI attribution (repo disables it globally).

## File Structure

- `src/state/state-keys.ts` — key tuples (`PERSISTABLE_STATE_KEYS`, `DEFAULT_STATE_KEYS`), derived types (`PersistableStateKey`, `DataGridState`, `DataGridStateOptions`). Shared by every other file.
- `src/state/extract-state.ts` — `pickState` (internal, pure pick from a `TableState`) + `extractState` (public, over a `Table`).
- `src/state/parse-state.ts` — `parseState` (public; validate + prune untrusted input).
- `src/state/use-extracted-state.ts` — `useExtractedState` (public reactive hook, memoized).
- `src/state/*.test.ts(x)` — co-located tests, one per source file.
- `src/index.ts` — add public exports.
- `.changeset/*.md` — release note.
- `apps/docs/content/docs/data-grid/state-persistence.mdx` + example + `feature-matrix.data.ts` flip — docs (Task 6).

---

### Task 1: Key sets and types

**Files:**
- Create: `packages/data-grid/react/react/src/state/state-keys.ts`
- Test: `packages/data-grid/react/react/src/state/state-keys.test.ts`

**Interfaces:**
- Consumes: `TableState` from `@ez-kit/data-grid-core`.
- Produces:
  - `PERSISTABLE_STATE_KEYS: readonly ['sorting','columnFilters','globalFilter','pagination','rowSelection','columnVisibility','columnPinning','rowPinning','expanded','columnSizing']`
  - `type PersistableStateKey = (typeof PERSISTABLE_STATE_KEYS)[number]`
  - `DEFAULT_STATE_KEYS: readonly PersistableStateKey[]` (excludes `rowSelection`, `expanded`)
  - `type DataGridState = Partial<Pick<TableState, PersistableStateKey>>`
  - `type DataGridStateOptions = { keys?: readonly PersistableStateKey[] }`

- [ ] **Step 1: Write the failing test**

Create `packages/data-grid/react/react/src/state/state-keys.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { DEFAULT_STATE_KEYS, PERSISTABLE_STATE_KEYS } from './state-keys'

describe('state-keys', () => {
	it('PERSISTABLE_STATE_KEYS lists all ten persistable slices', () => {
		expect([...PERSISTABLE_STATE_KEYS]).toEqual([
			'sorting',
			'columnFilters',
			'globalFilter',
			'pagination',
			'rowSelection',
			'columnVisibility',
			'columnPinning',
			'rowPinning',
			'expanded',
			'columnSizing',
		])
	})

	it('DEFAULT_STATE_KEYS is the view subset — excludes rowSelection and expanded', () => {
		expect(DEFAULT_STATE_KEYS).not.toContain('rowSelection')
		expect(DEFAULT_STATE_KEYS).not.toContain('expanded')
		expect([...DEFAULT_STATE_KEYS]).toEqual([
			'sorting',
			'columnFilters',
			'globalFilter',
			'pagination',
			'columnVisibility',
			'columnPinning',
			'rowPinning',
			'columnSizing',
		])
	})

	it('every DEFAULT key is a member of PERSISTABLE', () => {
		for (const key of DEFAULT_STATE_KEYS) {
			expect(PERSISTABLE_STATE_KEYS).toContain(key)
		}
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/state/state-keys.test.ts`
Expected: FAIL — cannot resolve `./state-keys`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/data-grid/react/react/src/state/state-keys.ts`:

```ts
import type { TableState } from '@ez-kit/data-grid-core'

/**
 * Top-level TableState keys this feature can persist. Closed set — modeled as a
 * const tuple + derived union so the same keys are referenced everywhere, never
 * re-spelled as bare string literals.
 */
export const PERSISTABLE_STATE_KEYS = [
	'sorting',
	'columnFilters',
	'globalFilter',
	'pagination',
	'rowSelection',
	'columnVisibility',
	'columnPinning',
	'rowPinning',
	'expanded',
	'columnSizing',
] as const satisfies readonly (keyof TableState)[]

export type PersistableStateKey = (typeof PERSISTABLE_STATE_KEYS)[number]

/**
 * Opinionated default: shareable "view" state only. Excludes `rowSelection` and
 * `expanded` — both key off row ids that may not survive a data reload and are
 * usually session-ephemeral rather than shareable. Opt into them via `keys`.
 */
export const DEFAULT_STATE_KEYS = [
	'sorting',
	'columnFilters',
	'globalFilter',
	'pagination',
	'columnVisibility',
	'columnPinning',
	'rowPinning',
	'columnSizing',
] as const satisfies readonly PersistableStateKey[]

/** JSON-safe subset of TableState produced by {@link extractState} and {@link parseState}. */
export type DataGridState = Partial<Pick<TableState, PersistableStateKey>>

export type DataGridStateOptions = {
	/** Allowlist of slices to include. Default: {@link DEFAULT_STATE_KEYS}. */
	keys?: readonly PersistableStateKey[]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/state/state-keys.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @ez-kit/data-grid-react typecheck`
Expected: no errors. (The `satisfies readonly (keyof TableState)[]` proves every key is a real TableState key; if any key were mistyped, this fails here.)

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/react/react/src/state/state-keys.ts packages/data-grid/react/react/src/state/state-keys.test.ts
git commit -m "feat(data-grid): add persistable state key sets and types"
```

---

### Task 2: `extractState` (Layer 1 read)

**Files:**
- Create: `packages/data-grid/react/react/src/state/extract-state.ts`
- Test: `packages/data-grid/react/react/src/state/extract-state.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_STATE_KEYS`, `DataGridState`, `DataGridStateOptions`, `PersistableStateKey` from `./state-keys`; `Table`, `TableState` from `@ez-kit/data-grid-core`; `createTable`, `defineColumns` from `@ez-kit/data-grid-core` (tests only).
- Produces:
  - `pickState(state: TableState, keys: readonly PersistableStateKey[]): DataGridState` — internal, pure. Copies each included key whose value is not `undefined`.
  - `extractState<TRow extends object>(table: Table<TRow>, options?: DataGridStateOptions): DataGridState` — public. Equals `pickState(table.getState(), options?.keys ?? DEFAULT_STATE_KEYS)`.

- [ ] **Step 1: Write the failing test**

Create `packages/data-grid/react/react/src/state/extract-state.test.ts`:

```ts
import { createTable, defineColumns } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { extractState } from './extract-state'

type Row = { id: number; name: string }
const columns = defineColumns<Row>([{ accessorKey: 'name' }])
const data: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

function makeTable() {
	return createTable<Row>({
		data,
		columns,
		sorting: true,
		filtering: true,
		initialState: {
			sorting: [{ id: 'name', desc: true }],
			pagination: { pageIndex: 2, pageSize: 25 },
			rowSelection: { '0': true },
		},
	})
}

describe('extractState', () => {
	it('picks only the default view keys from table state', () => {
		const result = extractState(makeTable())
		expect(result.sorting).toEqual([{ id: 'name', desc: true }])
		expect(result.pagination).toEqual({ pageIndex: 2, pageSize: 25 })
	})

	it('excludes rowSelection by default (not in DEFAULT_STATE_KEYS)', () => {
		const result = extractState(makeTable())
		expect('rowSelection' in result).toBe(false)
	})

	it('includes rowSelection when explicitly requested via keys', () => {
		const result = extractState(makeTable(), { keys: ['rowSelection'] })
		expect(result.rowSelection).toEqual({ '0': true })
		expect('sorting' in result).toBe(false)
	})

	it('is JSON-serializable', () => {
		const result = extractState(makeTable())
		expect(() => JSON.stringify(result)).not.toThrow()
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/state/extract-state.test.ts`
Expected: FAIL — cannot resolve `./extract-state`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/data-grid/react/react/src/state/extract-state.ts`:

```ts
import { DEFAULT_STATE_KEYS } from './state-keys'

import type { DataGridState, DataGridStateOptions, PersistableStateKey } from './state-keys'
import type { Table, TableState } from '@ez-kit/data-grid-core'

/**
 * Copy one slice into the accumulator. Generic over a single key `K`: reading `state[key]`
 * with a union key widens to `any` (TanStack `TableState` indexing), so `K` keeps the value
 * typed. Skips `undefined` (exactOptionalPropertyTypes: never write `undefined`).
 * (Note: `parseState`'s `assignSlice` needs no generic — its `value` is already `unknown`.)
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function copySlice<K extends PersistableStateKey>(out: DataGridState, state: TableState, key: K): void {
	const value = state[key]
	if (value !== undefined) {
		out[key] = value
	}
}

/**
 * Pure pick of the included slices from a full TableState. Internal — the shared
 * core of {@link extractState} and the reactive hook.
 */
export function pickState(state: TableState, keys: readonly PersistableStateKey[]): DataGridState {
	const out: DataGridState = {}
	for (const key of keys) {
		copySlice(out, state, key)
	}
	return out
}

/**
 * Read the persistable slices out of a grid. Pure, synchronous, framework-agnostic
 * (takes the core `Table`, so it works outside React and against a bare `createTable`).
 * Does not touch storage. Default slice set: {@link DEFAULT_STATE_KEYS}.
 */
export function extractState<TRow extends object>(
	table: Table<TRow>,
	options?: DataGridStateOptions,
): DataGridState {
	return pickState(table.getState(), options?.keys ?? DEFAULT_STATE_KEYS)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/state/extract-state.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/react/react/src/state/extract-state.ts packages/data-grid/react/react/src/state/extract-state.test.ts
git commit -m "feat(data-grid): add extractState utility"
```

---

### Task 3: `parseState` (Layer 1 write-back)

**Files:**
- Create: `packages/data-grid/react/react/src/state/parse-state.ts`
- Test: `packages/data-grid/react/react/src/state/parse-state.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_STATE_KEYS`, `DataGridState`, `DataGridStateOptions`, `PersistableStateKey` from `./state-keys`.
- Produces: `parseState(stored: unknown, options?: DataGridStateOptions): DataGridState` — validates + prunes untrusted, already-decoded input into a typed partial. Never throws. Does NOT call `JSON.parse`. Drops keys outside the allowlist and slices whose top-level JS type is wrong (per the `SLICE_KIND` guard below). `globalFilter` is `unknown` — passed through when present.

- [ ] **Step 1: Write the failing test**

Create `packages/data-grid/react/react/src/state/parse-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { parseState } from './parse-state'

describe('parseState', () => {
	it('returns {} for non-object garbage without throwing', () => {
		expect(parseState(null)).toEqual({})
		expect(parseState(42)).toEqual({})
		expect(parseState('nope')).toEqual({})
		expect(parseState(undefined)).toEqual({})
	})

	it('keeps well-formed default-view slices', () => {
		const stored = {
			sorting: [{ id: 'name', desc: true }],
			pagination: { pageIndex: 1, pageSize: 10 },
			globalFilter: 'alice',
		}
		expect(parseState(stored)).toEqual(stored)
	})

	it('drops keys outside the allowlist', () => {
		const result = parseState({ sorting: [], rowSelection: { '0': true } })
		expect('rowSelection' in result).toBe(false)
		expect(result.sorting).toEqual([])
	})

	it('keeps rowSelection only when keys opts in', () => {
		const result = parseState({ rowSelection: { '0': true } }, { keys: ['rowSelection'] })
		expect(result.rowSelection).toEqual({ '0': true })
	})

	it('drops slices with the wrong top-level type', () => {
		const result = parseState({ sorting: 'nope', pagination: { pageIndex: 0, pageSize: 10 } })
		expect('sorting' in result).toBe(false)
		expect(result.pagination).toEqual({ pageIndex: 0, pageSize: 10 })
	})

	it('ignores unknown foreign keys entirely', () => {
		const result = parseState({ sorting: [], somethingElse: 123 })
		expect(result).toEqual({ sorting: [] })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/state/parse-state.test.ts`
Expected: FAIL — cannot resolve `./parse-state`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/data-grid/react/react/src/state/parse-state.ts`:

```ts
import { DEFAULT_STATE_KEYS } from './state-keys'

import type { DataGridState, DataGridStateOptions, PersistableStateKey } from './state-keys'

/** Expected top-level JS shape of each persistable slice, for lightweight validation. */
const SLICE_KIND: Record<PersistableStateKey, 'array' | 'object' | 'expanded' | 'any'> = {
	sorting: 'array',
	columnFilters: 'array',
	globalFilter: 'any',
	pagination: 'object',
	rowSelection: 'object',
	columnVisibility: 'object',
	columnPinning: 'object',
	rowPinning: 'object',
	expanded: 'expanded',
	columnSizing: 'object',
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Structural guard — checks only the top-level kind, not deep contents. */
function isValidSlice(key: PersistableStateKey, value: unknown): boolean {
	switch (SLICE_KIND[key]) {
		case 'array':
			return Array.isArray(value)
		case 'object':
			return isPlainObject(value)
		case 'expanded':
			return value === true || isPlainObject(value)
		case 'any':
			return true
	}
}

/**
 * Assign a validated slice into the accumulator. `value` was structurally validated by
 * {@link isValidSlice}. Writing an untrusted value through a union-typed key onto a Partial
 * is accepted by TypeScript, so no generic or cast is needed here.
 */
function assignSlice(out: DataGridState, key: PersistableStateKey, value: unknown): void {
	out[key] = value
}

/**
 * Validate + prune an UNTRUSTED, already-decoded value into a typed {@link DataGridState}.
 * The consumer owns JSON.parse / URL-decode; this does NOT parse strings. Never throws —
 * non-object input yields `{}`, keys outside the allowlist are dropped, and slices with the
 * wrong top-level type are dropped. URL and localStorage are user-editable, so this is the
 * single validation choke point.
 */
export function parseState(stored: unknown, options?: DataGridStateOptions): DataGridState {
	if (!isPlainObject(stored)) return {}
	const keys = options?.keys ?? DEFAULT_STATE_KEYS
	const out: DataGridState = {}
	for (const key of keys) {
		const value = stored[key]
		if (value !== undefined && isValidSlice(key, value)) {
			assignSlice(out, key, value)
		}
	}
	return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/state/parse-state.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 4b: Lint + typecheck the new file**

Run: `pnpm --filter @ez-kit/data-grid-react exec eslint src/state/parse-state.ts`
Expected: no errors, no warnings (the `--max-warnings=0` gate).
Run: `pnpm --filter @ez-kit/data-grid-react typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/react/react/src/state/parse-state.ts packages/data-grid/react/react/src/state/parse-state.test.ts
git commit -m "feat(data-grid): add parseState utility"
```

---

### Task 4: `useExtractedState` (Layer 2 reactive hook)

**Files:**
- Create: `packages/data-grid/react/react/src/state/use-extracted-state.ts`
- Test: `packages/data-grid/react/react/src/state/use-extracted-state.test.tsx`

**Interfaces:**
- Consumes: `pickState` from `./extract-state`; `DEFAULT_STATE_KEYS`, `DataGridState`, `DataGridStateOptions`, `PersistableStateKey` from `./state-keys`; `DataGridInstance` from `../data-grid-instance`; `TableState` from `@ez-kit/data-grid-core`; `useSyncExternalStore` from `react`; `useDataGrid` from `../use-data-grid` (tests only); `act`, `renderHook` from `@testing-library/react` (tests only).
- Produces: `useExtractedState<TRow extends object>(instance: DataGridInstance<TRow>, options?: DataGridStateOptions): DataGridState`. Returns a referentially stable object; identity changes only when an included slice's reference changes or the `keys` list changes.

- [ ] **Step 1: Write the failing test**

Create `packages/data-grid/react/react/src/state/use-extracted-state.test.tsx`:

```tsx
import { defineColumns } from '@ez-kit/data-grid-core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useDataGrid } from '../use-data-grid'
import { useExtractedState } from './use-extracted-state'

type Row = { id: number; name: string }
const columns = defineColumns<Row>([{ accessorKey: 'name' }])
const data: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

describe('useExtractedState', () => {
	it('returns a referentially stable object across unrelated re-renders', () => {
		const { result, rerender } = renderHook(() => {
			const grid = useDataGrid({ data, columns, sorting: true })
			return useExtractedState(grid, { keys: ['sorting'] })
		})
		const first = result.current
		rerender()
		expect(result.current).toBe(first)
	})

	it('produces a new identity when an included slice changes', () => {
		const { result } = renderHook(() => {
			const grid = useDataGrid({ data, columns, sorting: true })
			const state = useExtractedState(grid, { keys: ['sorting'] })
			return { grid, state }
		})
		const before = result.current.state
		act(() => {
			result.current.grid.table.setSorting([{ id: 'name', desc: true }])
		})
		expect(result.current.state).not.toBe(before)
		expect(result.current.state.sorting).toEqual([{ id: 'name', desc: true }])
	})

	it('does not change identity when an excluded slice changes', () => {
		const { result } = renderHook(() => {
			const grid = useDataGrid({ data, columns, sorting: true })
			const state = useExtractedState(grid, { keys: ['sorting'] })
			return { grid, state }
		})
		const before = result.current.state
		act(() => {
			result.current.grid.table.setPageIndex(3)
		})
		expect(result.current.state).toBe(before)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/state/use-extracted-state.test.tsx`
Expected: FAIL — cannot resolve `./use-extracted-state`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/data-grid/react/react/src/state/use-extracted-state.ts`:

```ts
'use client'

import { useRef, useSyncExternalStore } from 'react'

import { pickState } from './extract-state'
import { DEFAULT_STATE_KEYS } from './state-keys'

import type { DataGridState, DataGridStateOptions, PersistableStateKey } from './state-keys'
import type { DataGridInstance } from '../data-grid-instance'
import type { TableState } from '@ez-kit/data-grid-core'

type Cache = {
	keys: readonly PersistableStateKey[]
	inputs: readonly unknown[]
	output: DataGridState
}

function sameList(a: readonly unknown[], b: readonly unknown[]): boolean {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (!Object.is(a[i], b[i])) return false
	}
	return true
}

/**
 * Reactive projection of the persistable state. Subscribes to the grid store and
 * returns a referentially stable {@link DataGridState} whose identity changes only
 * when one of the included slices changes (or the `keys` list changes).
 *
 * Memoization is mandatory: `pickState` allocates a fresh object each call, so
 * returning it raw from `getSnapshot` would violate `useSyncExternalStore`'s
 * cached-snapshot contract (React would loop). We cache the last output plus the
 * per-slice input references — TanStack keeps stable references per TableState
 * field until mutated — and rebuild only when an included reference changes.
 */
export function useExtractedState<TRow extends object>(
	instance: DataGridInstance<TRow>,
	options?: DataGridStateOptions,
): DataGridState {
	const keys = options?.keys ?? DEFAULT_STATE_KEYS
	const cacheRef = useRef<Cache | null>(null)

	const select = (state: TableState): DataGridState => {
		// `state[key]` with a union key widens to `any` (TanStack TableState indexing); the
		// value is only compared by reference in `sameList`, so widen `any` → `unknown`.
		const inputs = keys.map((key) => state[key] as unknown)
		const cache = cacheRef.current
		if (cache && sameList(cache.keys, keys) && sameList(cache.inputs, inputs)) {
			return cache.output
		}
		const output = pickState(state, keys)
		cacheRef.current = { keys, inputs, output }
		return output
	}

	return useSyncExternalStore(
		instance.store.subscribe,
		() => select(instance.store.getSnapshot()),
		() => select(instance.store.getServerSnapshot()),
	)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/state/use-extracted-state.test.tsx`
Expected: PASS (3 tests). No "getSnapshot should be cached" warning.

- [ ] **Step 4b: Lint + typecheck the new file**

Run: `pnpm --filter @ez-kit/data-grid-react exec eslint src/state/use-extracted-state.ts`
Expected: no errors, no warnings (the `--max-warnings=0` gate).
Run: `pnpm --filter @ez-kit/data-grid-react typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/react/react/src/state/use-extracted-state.ts packages/data-grid/react/react/src/state/use-extracted-state.test.tsx
git commit -m "feat(data-grid): add useExtractedState reactive hook"
```

---

### Task 5: Public exports, round-trip integration test, changeset

**Files:**
- Modify: `packages/data-grid/react/react/src/index.ts` (add a new export block after the "Selector hook + store primitives" block, around line 56)
- Create: `packages/data-grid/react/react/src/state/round-trip.test.tsx`
- Create: `.changeset/data-grid-state-persistence.md`

**Interfaces:**
- Consumes: everything from Tasks 1–4, now via the package entrypoint.
- Produces: public exports `extractState`, `parseState`, `useExtractedState`, `PERSISTABLE_STATE_KEYS`, `DEFAULT_STATE_KEYS` (values) and `DataGridState`, `DataGridStateOptions`, `PersistableStateKey` (types).

- [ ] **Step 1: Write the failing round-trip test**

Create `packages/data-grid/react/react/src/state/round-trip.test.tsx`:

```tsx
import { defineColumns } from '@ez-kit/data-grid-core'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { extractState, parseState, useDataGrid } from '../index'

type Row = { id: number; name: string }
const columns = defineColumns<Row>([{ accessorKey: 'name' }])
const data: Row[] = [{ id: 1, name: 'Alice' }]

describe('state persistence round-trip', () => {
	it('extractState output survives JSON + parseState and re-seeds a grid via initialState', () => {
		const { result: source } = renderHook(() =>
			useDataGrid({
				data,
				columns,
				sorting: true,
				initialState: {
					sorting: [{ id: 'name', desc: true }],
					pagination: { pageIndex: 3, pageSize: 50 },
				},
			}),
		)
		const wire = JSON.parse(JSON.stringify(extractState(source.current.table)))
		const restored = parseState(wire)

		const { result: seeded } = renderHook(() =>
			useDataGrid({ data, columns, sorting: true, initialState: restored }),
		)
		expect(seeded.current.table.getState().sorting).toEqual([{ id: 'name', desc: true }])
		expect(seeded.current.table.getState().pagination).toEqual({ pageIndex: 3, pageSize: 50 })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/state/round-trip.test.tsx`
Expected: FAIL — `extractState`/`parseState` are not exported from `../index`.

- [ ] **Step 3: Add the public exports**

In `packages/data-grid/react/react/src/index.ts`, immediately after the line `export { shallow } from './utils/shallow-equal'` (end of the "Selector hook + store primitives" block), insert:

```ts
// State persistence (Layer 1 utilities + Layer 2 reactive hook)
export { extractState } from './state/extract-state'
export { parseState } from './state/parse-state'
export { useExtractedState } from './state/use-extracted-state'
export { PERSISTABLE_STATE_KEYS, DEFAULT_STATE_KEYS } from './state/state-keys'
export type { DataGridState, DataGridStateOptions, PersistableStateKey } from './state/state-keys'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/state/round-trip.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Full package gate — tests, typecheck, lint**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run`
Expected: all suites pass (existing 221 + the new state tests).

Run: `pnpm --filter @ez-kit/data-grid-react typecheck`
Expected: no errors.

Run: `pnpm --filter @ez-kit/data-grid-react lint`
Expected: no errors, no warnings.

Run: `pnpm --filter @ez-kit/data-grid-react format`
Expected: files formatted (no diff on the new files if already Prettier-clean).

- [ ] **Step 6: Add changeset**

Create `.changeset/data-grid-state-persistence.md`:

```md
---
'@ez-kit/data-grid-react': minor
---

Add state-persistence utilities: `extractState(table)` reads the persistable grid slices into a JSON-safe `DataGridState`, `parseState(stored)` validates and prunes an untrusted stored value back into that shape (feed it to `useDataGrid`'s `initialState`), and the reactive `useExtractedState(grid)` hook returns the always-current extracted state for save-on-change. Storage read/write stays consumer-owned; slice selection is controlled via `keys` (default excludes `rowSelection` and `expanded`). Exposes `PERSISTABLE_STATE_KEYS` / `DEFAULT_STATE_KEYS` and the `DataGridState` / `DataGridStateOptions` / `PersistableStateKey` types.
```

- [ ] **Step 7: Commit**

```bash
git add packages/data-grid/react/react/src/index.ts packages/data-grid/react/react/src/state/round-trip.test.tsx .changeset/data-grid-state-persistence.md
git commit -m "feat(data-grid): export state persistence API + round-trip test"
```

---

### Task 6: Docs — guide page, live example, flip roadmap status

**Files:**
- Create: `apps/docs/shared/data-grid/examples/components/state-persistence.tsx`
- Modify: `apps/docs/shared/data-grid/examples/manifest.json` (register the slug)
- Create: `apps/docs/content/docs/data-grid/state-persistence.mdx`
- Modify: `apps/docs/content/docs/data-grid/meta.json` (add the page to the nav)
- Modify: `apps/docs/components/feature-matrix.data.ts:261-266` (flip status to `Done`, add `doc` slug)

**Interfaces:**
- Consumes: `extractState`, `parseState`, `useExtractedState` from `@ez-kit/data-grid-react`; the docs' shared `DataGrid` switcher and `useDataGrid` as used by sibling examples.

- [ ] **Step 1: Inspect a sibling example to copy its exact shape**

Run: `cat apps/docs/shared/data-grid/examples/components/server-data.tsx`
Run: `cat apps/docs/shared/data-grid/examples/manifest.json`
Run: `sed -n '1,20p' apps/docs/content/docs/data-grid/meta.json`

Read how imports, the `useDataGrid` call, and the exported component are structured. Match that structure exactly in Step 2 (import the shared `DataGrid`, not a UI-kit package directly).

- [ ] **Step 2: Write the live example**

Create `apps/docs/shared/data-grid/examples/components/state-persistence.tsx` following the sibling's structure. It must:
- build columns with `defineColumns`,
- read an initial value from a local `useState(() => parseState(seed))` where `seed` is a small in-file object (no real `localStorage` in the example — keep it deterministic),
- render the shared `DataGrid`,
- use `useExtractedState(grid, { keys: ['sorting', 'columnFilters', 'pagination'] })` and show the live JSON in a `<pre>` so the reader sees state update as they sort/filter/page.

Exact body:

```tsx
'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from '../../../DataGrid'
import { useDataGrid } from '../../../DataGrid'
import { extractState, parseState, useExtractedState } from '@ez-kit/data-grid-react'

type Person = { id: number; name: string; role: string }

const PEOPLE: Person[] = [
	{ id: 1, name: 'Alice', role: 'Engineer' },
	{ id: 2, name: 'Bob', role: 'Designer' },
	{ id: 3, name: 'Carol', role: 'PM' },
]

const columns = defineColumns<Person>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'role', header: 'Role' },
])

// A previously-saved value (in a real app this comes from localStorage/URL).
const SAVED = { sorting: [{ id: 'name', desc: false }] }

export function StatePersistenceExample() {
	const [initialState] = useState(() => parseState(SAVED))
	const grid = useDataGrid({ data: PEOPLE, columns, sorting: true, filtering: true, initialState })
	const persisted = useExtractedState(grid, { keys: ['sorting', 'columnFilters', 'pagination'] })

	return (
		<div>
			<DataGrid table={grid} />
			<pre>{JSON.stringify(persisted, null, 2)}</pre>
			<p>Snapshot for storage: {JSON.stringify(extractState(grid.table))}</p>
		</div>
	)
}
```

> Note: confirm the shared `DataGrid` and `useDataGrid` import paths against the sibling file from Step 1 and adjust the two import lines if the sibling differs (e.g. a single combined import). Do not import a UI-kit package directly.

- [ ] **Step 3: Register the example slug**

In `apps/docs/shared/data-grid/examples/manifest.json`, add `"state-persistence"` to the slug list (match existing ordering/formatting), mapping to the exported `StatePersistenceExample` per the manifest's convention observed in Step 1.

- [ ] **Step 4: Write the guide page**

Create `apps/docs/content/docs/data-grid/state-persistence.mdx`:

```mdx
---
title: State Persistence
description: Read grid state out for the URL or localStorage, and seed it back on load — you own the storage; we own the extract and parse.
---

# State Persistence

Persist sort, filters, pagination, and column layout to the URL or `localStorage` so a reload
preserves the view and links are shareable. The library gives you two pure utilities and one
reactive hook; **you own the actual read/write** — that keeps your URL and routing logic yours.

## Live example

<DataGridDocsExample exampleId='state-persistence' />

## The two directions

- `extractState(table, { keys? })` — reads the persistable slices into a plain, JSON-safe object.
- `parseState(stored, { keys? })` — validates an untrusted, already-decoded value back into that
  shape. It never throws and drops anything malformed. It does **not** call `JSON.parse` and does
  **not** write anywhere — you spread its result into `useDataGrid`.

## Restore on mount

```tsx
const decoded = JSON.parse(localStorage.getItem('grid') ?? 'null')
const grid = useDataGrid({ data, columns, initialState: parseState(decoded) })
```

## Save on change

```tsx
const grid = useDataGrid({ data, columns, sorting: true, filtering: true })
const state = useExtractedState(grid, { keys: ['sorting', 'columnFilters', 'pagination'] })

useEffect(() => {
	localStorage.setItem('grid', JSON.stringify(state))
}, [state])
```

The URL variant is the same shape — swap the effect body for your router's `setSearchParams`.

## Which slices persist

`keys` is an allowlist. The default (`DEFAULT_STATE_KEYS`) is the shareable **view**: `sorting`,
`columnFilters`, `globalFilter`, `pagination`, `columnVisibility`, `columnPinning`, `rowPinning`,
`columnSizing`. It intentionally **excludes** `rowSelection` and `expanded` (they key off row ids
that may not survive a data reload). Opt into anything from `PERSISTABLE_STATE_KEYS` explicitly.

## What you own

Reading and writing storage, compact URL key names, and versioning/migration of stored payloads
are deliberately left to you — real apps have their own URL and routing conventions.
```

- [ ] **Step 5: Add the page to the nav**

In `apps/docs/content/docs/data-grid/meta.json`, add `"state-persistence"` to the `pages` array in a sensible position (near `controlled-state`), matching the file's existing formatting.

- [ ] **Step 6: Flip the roadmap status**

In `apps/docs/components/feature-matrix.data.ts`, update the persistence entry (currently lines 261-266) to:

```ts
	{
		category: 'State & Tooling',
		feature: 'URL / localStorage state persistence',
		description: 'Extract grid state (sort, filters, page, column layout) for the URL or localStorage, and seed it back on load.',
		status: FeatureStatus.Done,
		doc: 'state-persistence',
	},
```

- [ ] **Step 7: Verify the docs app builds**

Run: `pnpm --filter @ez-kit/docs typecheck`
Expected: no errors. (This triggers the `sandpack:build` prebuild and the fumadocs `.source` codegen; if it flags a stale `.source`, run `pnpm --filter @ez-kit/docs sandpack:build` and retry.)

- [ ] **Step 8: Commit**

```bash
git add apps/docs/shared/data-grid/examples/components/state-persistence.tsx apps/docs/shared/data-grid/examples/manifest.json apps/docs/content/docs/data-grid/state-persistence.mdx apps/docs/content/docs/data-grid/meta.json apps/docs/components/feature-matrix.data.ts
git commit -m "docs(data-grid): document state persistence and mark feature done"
```

---

## Self-Review

**Spec coverage:**
- §3.1 key sets + types → Task 1 ✓
- §3.2 `extractState` / `parseState` → Tasks 2, 3 ✓
- §3.3 `useExtractedState` → Task 4 ✓
- §4 flat `Partial<TableState>` shape + JSON-safety → Task 2 (serializable test) + Task 5 (round-trip) ✓
- §5 slice selection / default excludes selection+expanded → Tasks 1, 2, 3 ✓
- §6 consumption (initialState restore, save-on-change, controlled) → Task 5 round-trip + Task 6 docs ✓
- §7 impl notes (core `Table`, memoized hook, store surface, `parse` choke point, root export) → Tasks 2, 4, 5 ✓
- §8 deferred Layer 3 → not implemented by design; documented in Task 6 ✓
- §9 risks → memoization test (Task 4), default allowlist (Task 1), docs framing (Task 6) ✓
- §10 testing strategy → Tasks 2–5 mirror each listed case ✓

**Placeholder scan:** No TBD/TODO. Every code step ships complete code. The only "inspect first" step (Task 6 Step 1) is a real read step whose findings feed exact edits, with the full example body still provided in Step 2 and a fallback note for the import lines.

**Type consistency:** `DataGridState`, `DataGridStateOptions`, `PersistableStateKey`, `PERSISTABLE_STATE_KEYS`, `DEFAULT_STATE_KEYS` spelled identically across Tasks 1–6. `pickState(state, keys)` defined in Task 2, imported in Task 4. `extractState(table, options?)` / `parseState(stored, options?)` / `useExtractedState(instance, options?)` signatures match the spec and the round-trip usage.

**Note on Task 6:** Docs (example + MDX + roadmap flip) depend on the docs app's sibling conventions, which is why Step 1 inspects a real sibling before writing. If those conventions differ materially from what's shown, adapt the example/manifest/meta edits to match — the library (Tasks 1–5) is the working, testable core and stands on its own.
