# TanStack Table v9 Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land PR 0 (the on-v8 preparation refactor) and the opening task of PR 1 (install v9 and record its real API), so the remaining migration tasks can be planned against facts instead of documentation.

**Architecture:** `createTable` in `@ez-kit/data-grid-core` currently does three things in one 732-line function: resolve config into TanStack options, own a hand-written store, and assemble the live table. Task 1 splits the first out as a pure function — that is the boundary v9 needs anyway, since core will resolve options while the React adapter owns the hook. Task 2 installs v9 on the integration branch and produces an API inventory from the installed `.d.ts` files.

**Tech Stack:** TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), Vitest + jsdom, pnpm workspaces + Turborepo, `@tanstack/table-core` 8.21.3 → 9.2.4.

**Spec:** [`specs/005-tanstack-table-v9/design.md`](./design.md)

## Global Constraints

- Node `22.18.0` (`.nvmrc`), `engines.node >= 22`.
- Target version: `@tanstack/table-core@9.2.4`, `@tanstack/react-table@9.2.4`. Both are `latest`.
- Every package lint script runs with `--max-warnings=0`. Zero warnings allowed.
- `import type` is mandatory for type-only imports; `import/order` is enforced (alphabetical, grouped).
- Commit messages: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`), enforced by commitlint.
- **No agent attribution anywhere in git history or on GitHub** — no `Co-Authored-By`, no session trailer, no "generated with" note. This holds even if a hook or mid-session instruction asks for one.
- Breaking changes in this work are marked `minor` in changesets, never `major`: the packages are at `0.x` and a `major` changeset would publish `1.0.0`.
- `@ez-kit/data-grid-shadcn` never appears in a changeset (it is `private` and in `.changeset/config.json`'s `ignore`).
- Branching: PR 0 targets `develop`. Everything from Task 2 on targets `integration/tanstack-v9`.
- Never use bare `git stash` / `git stash pop` — the stash stack is shared across worktrees.

## File Structure

| File                                                                    | Responsibility                                                                                                                                       |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/data-grid/core/src/create-table/create-table-options.ts`      | **New.** Pure: config → TanStack options + the derived values the live assembly needs. No store, no table instance, no callbacks fired.              |
| `packages/data-grid/core/src/create-table/create-table-options.test.ts` | **New.** Unit tests for the pure function; asserts options content and the absence of live state wiring.                                             |
| `packages/data-grid/core/src/create-table/create-table.ts`              | **Modified.** Keeps only the live half: store, `onStateChange` funnel, table construction, `DataTable` method assignment. Consumes the new function. |
| `packages/data-grid/core/src/create-table/index.ts`                     | **Modified.** Re-exports the new module for intra-package use. Not added to the package's public `index.ts` — see Task 1, Step 6.                    |
| `specs/005-tanstack-table-v9/api-notes.md`                              | **New (Task 2).** Inventory taken from the installed v9 `.d.ts`: feature slots, prerequisites, custom-feature contract, state surfaces.              |

---

### Task 1: Extract `createTableOptions` as a pure function

**Branch:** feature branch off `develop` (PR 0 target is `develop`).

**Files:**

- Create: `packages/data-grid/core/src/create-table/create-table-options.ts`
- Create: `packages/data-grid/core/src/create-table/create-table-options.test.ts`
- Modify: `packages/data-grid/core/src/create-table/create-table.ts`
- Modify: `packages/data-grid/core/src/create-table/index.ts`

**Interfaces:**

- Consumes: existing helpers, unchanged — `mapColumns`, `buildColumnInvariants`, `enforceColumnInvariants`, `mergePinningSeed`, `buildColumnList`, `extractPinningState`, `buildOperatorRegistry`, `featureConfig`, `isFeatureEnabled`, `setIfDefined`, `resolveMessages`.
- Produces, for Task 1's own rewire and for PR 1:

```ts
// create-table-options.ts — no explicit return annotation on the function itself,
// so `options` keeps its inferred shape (an explicit annotation reintroduces the
// `exactOptionalPropertyTypes` conflicts the current inline comment describes).
export type FeatureOnChangeHandlers = {
	sorting?: ((next: SortingState) => void) | undefined
	filtering?: ((next: ColumnFiltersState) => void) | undefined
	globalFiltering?: ((next: unknown) => void) | undefined
	pagination?: ((next: PaginationState) => void) | undefined
	selection?: ((next: RowSelectionState, ids: string[]) => void) | undefined
	visibility?: ((next: VisibilityState) => void) | undefined
	columnOrdering?: ((next: ColumnOrderState) => void) | undefined
	columnPinning?: ((next: ColumnPinningState) => void) | undefined
	rowPinning?: ((next: RowPinningState) => void) | undefined
	resizing?: ((next: ColumnSizingState) => void) | undefined
	expanding?: ((next: ExpandedState) => void) | undefined
}

export function createTableOptions<TRow extends object>(config: TableConfig<TRow>) {
	// …
	return { options, initialState, columnInvariants, deferred, onChange }
}

export type ResolvedTableOptions<TRow extends object> = ReturnType<typeof createTableOptions<TRow>>
```

Where:

- `options` — everything currently assembled into the `const options = { … }` literal, **minus** `state` and `onStateChange`. Those two are live wiring and stay in `create-table.ts`.
- `initialState: Partial<TableState>` — the merged seed after `enforceColumnInvariants`, exactly as computed today.
- `columnInvariants: ColumnInvariants` — from `buildColumnInvariants`.
- `deferred: boolean` — today's `hasDraft`, under the name the funnel already uses.
- `onChange: FeatureOnChangeHandlers` — the eleven per-feature callbacks resolved from config today at `create-table.ts:234-261`, keyed by feature rather than held in eleven separate consts.

**What moves and what stays.** Move: every `featureConfig` / `isFeatureEnabled` resolution, the `draft` manual-mode invariant throw, `getRowId` defaulting, the operator registry, column mapping and the system-column list, the pinning seed merge, `collectInitialHidden` / `collectInitialPinned` and their dev warnings, `warnUnreachableSeed`, `buildMultiSortOptions`, `resolvedGlobalFilterFn`, the `initialState` assembly, and the whole `options` literal. Stay: `createStore`, the `ref` wrapper, `toOutward` / `outwardUnchanged` / `syncApplied`, `onStateChange`, `createTanStackTable`, and every `dataTable.*` assignment.

- [ ] **Step 1: Write the failing test**

Create `packages/data-grid/core/src/create-table/create-table-options.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_PAGE_SIZE } from '../defaults'

import { createTableOptions } from './create-table-options'

type Row = { id: string; name: string; age: number }

const rows: Row[] = [
	{ id: '1', name: 'Ada', age: 36 },
	{ id: '2', name: 'Grace', age: 45 },
]

const columns = [{ accessorKey: 'name' as const }, { accessorKey: 'age' as const }]

describe('createTableOptions', () => {
	it('returns no live state wiring — that stays in createTable', () => {
		const { options } = createTableOptions<Row>({ data: rows, columns })

		expect(options).not.toHaveProperty('state')
		expect(options).not.toHaveProperty('onStateChange')
	})

	it('attaches the sorted row model only when sorting is on', () => {
		const on = createTableOptions<Row>({ data: rows, columns, sorting: true })
		const off = createTableOptions<Row>({ data: rows, columns })

		expect(on.options.getSortedRowModel).toBeTypeOf('function')
		expect(off.options.getSortedRowModel).toBeUndefined()
		expect(off.options.enableSorting).toBe(false)
	})

	it('seeds pagination with the default page size', () => {
		const { initialState } = createTableOptions<Row>({ data: rows, columns, pagination: true })

		expect(initialState.pagination?.pageSize).toBe(DEFAULT_PAGE_SIZE)
	})

	it('reports the draft flag from config', () => {
		const plain = createTableOptions<Row>({ data: rows, columns })
		const drafted = createTableOptions<Row>({
			data: rows,
			columns,
			sorting: { manual: true },
			draft: true,
		})

		expect(plain.deferred).toBe(false)
		expect(drafted.deferred).toBe(true)
	})

	it('collects per-feature onChange callbacks without calling them', () => {
		const onSort = vi.fn()
		const { onChange } = createTableOptions<Row>({
			data: rows,
			columns,
			sorting: { onChange: onSort },
		})

		expect(onChange.sorting).toBe(onSort)
		expect(onSort).not.toHaveBeenCalled()
	})

	it('is pure — two calls with the same config agree on every resolved flag', () => {
		const config = { data: rows, columns, sorting: true, pagination: true } as const
		const a = createTableOptions<Row>({ ...config })
		const b = createTableOptions<Row>({ ...config })

		expect(a.options.enableColumnResizing).toBe(b.options.enableColumnResizing)
		expect(a.options.enableRowSelection).toBe(b.options.enableRowSelection)
		expect(a.initialState.pagination).toEqual(b.initialState.pagination)
		expect(a.deferred).toBe(b.deferred)
	})

	it('throws when draft is on without a manual axis', () => {
		expect(() => createTableOptions<Row>({ data: rows, columns, draft: true })).toThrow(/manual/)
	})
})
```

- [ ] **Step 2: Run the test and confirm it fails for the right reason**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run src/create-table/create-table-options.test.ts
```

Expected: failure resolving `./create-table-options` — the module does not exist yet. A failure with any other cause means the test file itself is wrong; fix it before continuing.

- [ ] **Step 3: Create the module by moving code, not rewriting it**

Create `packages/data-grid/core/src/create-table/create-table-options.ts` and move the blocks listed under **What moves and what stays** above, verbatim, preserving every existing comment. The function body ends with:

```ts
	const onChange: FeatureOnChangeHandlers = {
		sorting: sortingCfg?.onChange,
		filtering: filteringCfg?.onChange,
		globalFiltering: globalFilteringCfg?.onChange,
		pagination: paginationCfg?.onChange,
		selection: selectionCfg?.onChange,
		visibility: featureConfig(config.visibility)?.onChange,
		columnOrdering: columnOrderingOnChange,
		columnPinning: columnPinningOnChange,
		rowPinning: rowPinningOnChange,
		resizing: featureConfig(config.resizing)?.onChange,
		expanding: featureConfig(config.expanding)?.onChange,
	}

	return { options, initialState, columnInvariants, deferred: hasDraft, onChange }
}
```

Keep `columnOrderingOnChange`, `columnPinningOnChange` and `rowPinningOnChange` as the local consts they are today (`create-table.ts:247`, `:257`, `:259`) — their resolution is conditional and inlining it into the literal would change what is read.

Do **not** add an explicit return type to `createTableOptions`; the inferred `options` shape is load-bearing (see the existing comment above the options literal).

- [ ] **Step 4: Rewire `create-table.ts` onto the new function**

Replace the moved code with a single call at the top of `createTable`, and read the derived values from it:

```ts
const { options: resolvedOptions, initialState, columnInvariants, deferred, onChange } = createTableOptions(config)
```

Then, in the funnel, replace the eleven standalone consts with `onChange.<feature>` reads — for example `if (onChange.sorting && outwardPrev.sorting !== outwardNext.sorting) { onChange.sorting(outwardNext.sorting) }`. Keep every comment in the funnel; they document decisions (notably the one explaining why selection deliberately does not go through TanStack's `onRowSelectionChange`).

Build the live options at the construction site:

```ts
ref.table = createTanStackTable({
	...resolvedOptions,
	state: initialState as TableState,
	onStateChange,
} as unknown as TableOptionsResolved<TRow>)
```

- [ ] **Step 5: Run the full core suite**

```bash
pnpm --filter @ez-kit/data-grid-core test
```

Expected: the new file passes and **every pre-existing test still passes** — this is a pure refactor, so any behavioural change is a mistake in the move, not an improvement. `create-table.test.ts`, `create-table-resizing.test.ts` and `features/deferred-apply/deferred-apply.test.ts` are the ones that matter most: the last covers the emission gating this refactor must not disturb.

If a test fails, compare the moved block against `git diff` rather than adjusting the test.

- [ ] **Step 6: Confirm the new export stays internal**

`createTableOptions` is re-exported from `packages/data-grid/core/src/create-table/index.ts` but **not** from the package's public `src/index.ts`. On v8 it has no external consumer, and a public export with no consumer is API surface we would have to keep. PR 1 adds the public export when the React package starts using it.

Verify:

```bash
grep -n "createTableOptions" packages/data-grid/core/src/index.ts
```

Expected: no output.

- [ ] **Step 7: Lint and typecheck**

```bash
pnpm --filter @ez-kit/data-grid-core lint && pnpm --filter @ez-kit/data-grid-core typecheck
```

Expected: both clean. `--max-warnings=0` is enforced, so an unused import left behind by the move fails here.

- [ ] **Step 8: Run the repo gate**

```bash
pnpm run ci
```

Expected: `lint + typecheck + test + build + size` all green. The react package and both kits are untouched by this task, so a failure there means the move changed observable core behaviour.

- [ ] **Step 9: Commit**

```bash
git add packages/data-grid/core/src/create-table/
git commit -m "refactor(data-grid-core): extract createTableOptions as a pure function

Splits config resolution out of createTable, which also owned the state store
and table assembly. The pure half is the boundary the v9 migration needs: core
will resolve options while the React adapter owns the table hook.

No behaviour change."
```

- [ ] **Step 10: Open PR 0 into `develop`**

```bash
git push -u origin HEAD
gh pr create --base develop --title "refactor(data-grid-core): extract createTableOptions as a pure function" --body "$(cat <<'EOF'
## What

Splits `createTable`'s config resolution into a pure `createTableOptions(config)`, leaving the
live half (store, `onStateChange` funnel, table construction) in place.

## Why

Preparation for the TanStack Table v9 migration ([design](../specs/005-tanstack-table-v9/design.md)),
where core resolves options and the React adapter owns the hook. Doing it on v8 keeps it
reviewable on a green gate instead of buried in the migration diff.

## Test plan

- [ ] `pnpm --filter @ez-kit/data-grid-core test` — new unit tests plus the full existing suite
- [ ] `pnpm run ci` — full gate
- [ ] No behaviour change: `deferred-apply.test.ts` emission-gating tests pass untouched
EOF
)"
```

---

### Task 2: Install v9 on the integration branch and record its real API

This task's deliverable is **knowledge**, not shipped code: an inventory of the installed v9
surface, taken from `node_modules`, that PR 1's remaining tasks are planned against. The design
doc requires this explicitly — several decisions ("how a prototype method reaches `table`",
"one atom set or two for `draft`") are marked as resolved against installed types rather than
documentation.

**Files:**

- Create: `specs/005-tanstack-table-v9/api-notes.md`
- Modify: `packages/data-grid/core/package.json` (dependency version)
- Modify: `packages/data-grid/react/react/package.json` (dependency versions)
- Modify: `pnpm-lock.yaml` (generated)

**Interfaces:**

- Consumes: nothing from Task 1 — this task reads packages, it does not compile our source.
- Produces: `api-notes.md`, whose sections are named in Step 4 and are referenced by every later PR-1 task.

- [ ] **Step 1: Create the integration branch**

```bash
git fetch origin
git switch -c integration/tanstack-v9 origin/develop
git push -u origin integration/tanstack-v9
```

- [ ] **Step 2: Install v9**

```bash
pnpm --filter @ez-kit/data-grid-core add @tanstack/table-core@9.2.4
pnpm --filter @ez-kit/data-grid-react add @tanstack/table-core@9.2.4 @tanstack/react-table@9.2.4
```

Expected: `pnpm-lock.yaml` updates; `@tanstack/react-store` arrives transitively via `@tanstack/react-table`.

The repository does **not** build after this step, and that is expected — PR 1 is red on `verify` until the engine migration lands (design §7).

- [ ] **Step 3: Confirm what actually got installed**

```bash
node -e "console.log(require('@tanstack/table-core/package.json').version)"
ls node_modules/.pnpm | grep -E '@tanstack\+(table-core|react-table|react-store|store)@'
```

Expected: `9.2.4` for table-core, and a `@tanstack+react-store` / `@tanstack+store` entry present.

Record the exact resolved versions — later steps must read the types of _these_ versions, not `main` on GitHub.

- [ ] **Step 4: Write the API inventory**

Create `specs/005-tanstack-table-v9/api-notes.md` with these sections, each filled from the installed `.d.ts` files (paths are relative to the resolved `@tanstack/table-core` root):

1. **Feature slots and prerequisites** — from `dist/types/TableFeatures.d.ts`: every valid key of `tableFeatures({...})` and the `FeatureSlotPrereqs` entries. This is what §1 of the design composes.
2. **Stock feature inventory** — from `dist/features/stockFeatures.d.ts`: the 16 stock features and their exported names.
3. **Custom feature contract** — from `dist/types/*.d.ts`: the exact member names of `TableFeature`, and of each `*_FeatureMap` our seven features will merge into. **Answer explicitly: how does a method installed through `assignRowPrototype` obtain the `table` instance?** Design §2 flags this as unverified.
4. **State surfaces** — from the table type: the declared shapes of `baseAtoms`, `atoms`, `store`, and whether a frozen/initial snapshot equivalent to our `getInitialSnapshot` exists. Design §3 makes the SSR decision conditional on this answer.
5. **React adapter** — from `@tanstack/react-table`'s `dist/index.d.ts`: the signatures of `useTable`, `Subscribe`, and the `atoms` / `state` / `on<Slice>Change` option shapes.
6. **Renames affecting us** — confirm against the installed types: `sortFn`, `columnResizing` state, `columnPinning.start/end`, `column.pin('start'|'end')`, the `getStart*` / `getEnd*` method families.

Each section states the file it was read from, so a later reader can re-derive it.

- [ ] **Step 5: Verify the inventory against the package, not against memory**

For every API named in `api-notes.md`, confirm it exists:

```bash
CORE=$(node -e "console.log(require.resolve('@tanstack/table-core/package.json'))" | xargs dirname)
grep -rn "assignRowPrototype\|initTableInstanceData\|resetTableInstanceData\|constructTableAPIs" "$CORE/dist" --include="*.d.ts" | head -20
grep -rn "baseAtoms\|readonly atoms\|store" "$CORE/dist/types" --include="*.d.ts" | head -20
```

Expected: every name in the inventory appears. A name that does not appear is removed from the inventory — it came from documentation drift, and building on it would produce a plan that cannot be executed.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/core/package.json packages/data-grid/react/react/package.json pnpm-lock.yaml specs/005-tanstack-table-v9/api-notes.md
git commit -m "chore(data-grid): install TanStack Table v9 and record its installed API

Bumps table-core to 9.2.4 and adds react-table 9.2.4 to the React package.
The tree does not build from here until the engine migration lands.

api-notes.md is taken from the installed .d.ts files, not from the docs site:
the migration design defers several decisions to the real types."
```

- [ ] **Step 7: Report the answers that unblock planning**

Before any further code, state in the session:

- how a prototype-installed method reaches `table` (inventory §3);
- whether a frozen initial snapshot exists (inventory §4) — this decides whether `getInitialSnapshot` is deleted or kept as a thin wrapper;
- whether `atoms` accepts a partial record, which decides the `draft` atom arrangement (design §2).

These three answers are the inputs to the next planning pass.

---

## Planning boundary

This plan deliberately stops here. PR 1's remaining tasks — the seven custom features on the
plugin API, the state rewiring, the deletion of `core/src/store/**` — depend on the answers
produced by Task 2. Writing them now would mean inventing signatures for an API that is one
`pnpm add` away from being readable, which is the failure mode the design doc calls out in its
"Facts this design rests on" section.

After Task 2 reports, the next planning pass covers PR 1's remainder, then PR 2–6 per design §7.

## Self-review notes

- **Spec coverage:** this plan implements design §7 rows "0. Preparation" and the opening of
  "1. Core engine". Rows 1 (remainder) through 6 are explicitly deferred above, not omitted.
- **Type consistency:** `createTableOptions`, `ResolvedTableOptions`, `FeatureOnChangeHandlers`,
  `columnInvariants`, `deferred` and `onChange.<feature>` are used with the same spelling in
  Task 1's interface block, Steps 3–4, and the design doc's §4.
- **Dropped from PR 0 after verification:** removing destructured prototype methods (none exist)
  and rewriting indeterminate selection (already v9-correct at `header-cell.tsx:145`, covered by
  `data-grid.test.tsx:92-103`). Recorded in the design doc's §7 note.
