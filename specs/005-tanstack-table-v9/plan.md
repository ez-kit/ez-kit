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
- **`integration/tanstack-v9` stays local.** Pushing it and opening any PR against it is the
  human's call, so no task from Task 3 on contains a `git push` or a `gh pr create` step. (Task 1's
  Step 10 and Task 2's Step 1 predate this and are already history.)
- Never use bare `git stash` / `git stash pop` — the stash stack is shared across worktrees.
- From Task 2 until PR 2 the repository does not build: `pnpm run ci`, `pnpm build` and
  `pnpm --filter @ez-kit/data-grid-core typecheck` are red by design (design §7). Each task states
  a criterion that is checkable anyway — see "Working on a tree that does not build" below.

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

## PR 1 remainder — orientation

Tasks 3–10 finish design §7 row "1. Core engine". They all land on `integration/tanstack-v9`,
which **stays local** — pushing it and opening any PR is the human's call, so no task below
contains a `git push` or a `gh pr create` step.

### Working on a tree that does not build

Design §7 accepts that the repository is red from Task 2 until PR 2. `pnpm run ci`,
`pnpm build` and `pnpm --filter @ez-kit/data-grid-core typecheck` therefore cannot be a
task's criterion until Task 10. Two checks work while the tree is broken, and every task
below states which of them it uses:

- **Owned-file typecheck.** `tsc` reports every error with a `src/…(line,col)` prefix, so a
  task can require zero errors **in the files it owns** while the package as a whole is still
  red:

  ```bash
  pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
    | grep -E '^(src/create-table/create-table-options\.ts|src/types\.ts)\(' || echo 'OWNED FILES CLEAN'
  ```

  Substitute the task's own file list. `|| echo` is there because `grep` exits 1 on no match,
  which is the success case.

- **Error-count delta.** Before starting, record the baseline; after finishing, the total must
  not be higher than baseline plus what the task knowingly introduces (each task says what it
  knowingly introduces, and why):

  ```bash
  pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
    | grep -c 'error TS' > /tmp/…/tsc-baseline.txt   # scratchpad, not the repo
  ```

- **Per-file lint.** `eslint` runs on a file list without the package compiling:
  `pnpm --filter @ez-kit/data-grid-core exec eslint <files> --max-warnings=0`.
- **Targeted vitest.** Vitest transpiles per module graph and does **not** typecheck, so a test
  runs as long as the modules it imports are runtime-valid. From Task 5 on, every task has at
  least one test file it must make pass. Before Task 5 nothing in core runs, because every
  feature test goes through `createTable` (verified: all seven feature test files import it).

A task is done when its stated criterion passes. "The monorepo gate is red" is never a reason
to skip a task's own criterion, and never a reason to claim one passed.

### Decisions taken here that the design left open

Recorded where the reader needs them; each is argued in the task that implements it.

1. **`draft` gets one atom set** (api-notes §4) — the three live axes are external atoms, the
   `applied` snapshot is an ordinary internal slice. Task 9.
2. **The draft atoms are created by the caller, not by `createTableOptions`.** `useTable` merges
   `tableOptions` into the table on **every render** (api-notes §5.2) and replaces `atoms`
   wholesale, so atoms built inside the options resolver would be new objects every render and
   the draft would reset on each keystroke. `createTableOptions` stays pure and takes them as an
   argument. Task 4 defines the parameter; Task 9 the factory.
3. **`ColumnMeta` stays a global declaration merge**, widened to v9's **three** type parameters,
   rather than moving to the `columnMeta` feature slot. Task 3.
4. **Non-feature config leaves TanStack options.** `rowActions`, row `pinning`, `virtualization`
   and `direction` are read only by the React layer; they move to a `grid` bag returned beside
   `options`, which deletes `row-actions.ts`'s global `declare module` outright. Task 4.
5. **`getInitialSnapshot` is deleted, not wrapped.** Neither PR-2 branch needs a core API:
   `table.initialState` is public and stable by reference (api-notes §4), so a PR 2 that keeps
   `useSyncExternalStore` writes `() => table.initialState` as its `getServerSnapshot` inline.
   Task 5.
6. **`table.getState()` gets no shim.** Reads become `table.store.state` (whole snapshot) or
   `table.atoms.<slice>.get()` (one slice), per design §3. Task 5 onward.

### Counts, measured against the tree rather than the design

| Thing                                    | Design says     | Counted today                                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getState()` in core source              | 26              | **26** ✓ (`create-table.ts` 4, creating 6, editing 6, deleting 5, draft 3, row-ordering 2)                                                                                                                                                                                                      |
| `getState()` in core tests               | (153 repo-wide) | **113**, in 7 files                                                                                                                                                                                                                                                                             |
| custom features                          | 7               | **7** ✓ — but `row-actions.ts` also carries a global `declare module`, an 8th augmentation with no feature behind it                                                                                                                                                                            |
| stock features to re-export              | 16              | **17** (api-notes §2 — `cellSpanningFeature`)                                                                                                                                                                                                                                                   |
| core generic types to thread `TFeatures` | ~23             | **39** exported declarations are generic over `TRow`/`TData`; only **21** of them name a table-core type and therefore need `TFeatures`. The other 18 (`CreatingSaveContext<TData>`, `ValidateConfig<TData>`, …) are generic over the row alone and stay two-parameter. Task 3 lists both sets. |

### Files (PR 1 remainder)

| File                                             | Responsibility                                                                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/data-grid/core/src/features/entry.ts`  | **New (Task 3).** The `@ez-kit/data-grid-core/features` payload: stock re-exports, row-model factories, `tableFeatures`, and our seven as they are ported. |
| `packages/data-grid/core/tsup.config.ts`         | **New (Task 3).** Two named entries; replaces the inline `tsup src/index.ts` script.                                                                       |
| `packages/data-grid/core/src/store/**`           | **Deleted (Task 5).** The hand-written store, in full.                                                                                                     |
| `packages/data-grid/core/src/features/*/`\*`.ts` | **Modified (Tasks 6–9).** Each feature onto the v9 plugin API, with its own `*_FeatureMap` merges.                                                         |

---

### Task 3: The feature-composition surface — `/features` entry point and `TFeatures` on the public types

**Branch:** `integration/tanstack-v9` (already current).

**Files:**

- Create: `packages/data-grid/core/src/features/entry.ts`
- Create: `packages/data-grid/core/tsup.config.ts`
- Modify: `packages/data-grid/core/package.json` (`exports`, `build`, `size-limit`, `dependencies`)
- Modify: `packages/data-grid/core/src/types.ts`
- Modify: `packages/data-grid/core/src/column/types.ts`
- Modify: `packages/data-grid/core/src/index.ts`

**Interfaces:**

Consumes: nothing from Tasks 1–2 beyond the installed 9.2.4 packages.

Produces, and every later task imports these exact spellings:

```ts
// src/features/entry.ts — the payload of `@ez-kit/data-grid-core/features`
export { tableFeatures, type TableFeatures } from '@tanstack/table-core'
export {
	cellSelectionFeature,
	cellSpanningFeature,
	columnFacetingFeature,
	columnFilteringFeature,
	columnGroupingFeature,
	columnOrderingFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	globalFilteringFeature,
	rowAggregationFeature,
	rowExpandingFeature,
	rowPaginationFeature,
	rowPinningFeature,
	rowSelectionFeature,
	rowSortingFeature,
} from '@tanstack/table-core' // all 17 — api-notes §2
export {
	createCoreRowModel,
	createExpandedRowModel,
	createFacetedMinMaxValues,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createGroupedRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
} from '@tanstack/table-core'
// our seven are appended here by Tasks 6–9, and `allDataGridFeatures` by Task 10.
```

```ts
// src/types.ts — the config, now gated on the registered set
export type TableConfig<TFeatures extends TableFeatures, TRow extends object> = {
	features: TFeatures
	data: TRow[]
	columns: ColumnDef<TRow>[]
	// …every existing field, unchanged in shape
}

export interface DataTable<TFeatures extends TableFeatures, TRow extends RowData> extends TanStackTable<
	TFeatures,
	TRow
> {
	/* …, narrowed in Task 5 */
}

export type Table<TFeatures extends TableFeatures, TRow extends object> = DataTable<TFeatures, TRow>
```

**Why `features` is a required field and not optional with a default.** A default set would be
`allDataGridFeatures`, which is precisely what design §1 says defeats the point: every consumer
who never thought about it would ship the union. Making it required is the whole of D1's
enforcement, and it is the one compile error that turns `sorting: {…}` with no
`rowSortingFeature` from today's silent no-op into a diagnostic.

**Why `ColumnMeta` stays a global augmentation.** v9 offers the `columnMeta` slot
(`tableFeatures({ columnMeta: {} as GridColumnMeta })`) as the per-table alternative to the
global interface. We keep the global one anyway, for three reasons: our meta is a fixed
grid-internal shape rather than something a table varies; a consumer who forgot the slot would
silently lose every meta field's type; and the slot is the consumer's own escape hatch, which
we should not occupy. The "global leak" objection that design §2 raises against `TableState` is
much weaker here — upstream's `ColumnMeta` is empty and every field we merge is optional, so a
foreign plain TanStack table in the same project gains optional fields, not a required one that
lies.

- [ ] **Step 1: Record the typecheck baseline**

```bash
mkdir -p "$SCRATCH" && pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json \
  --noEmit --pretty false 2>&1 | grep -c 'error TS' | tee "$SCRATCH/tsc-baseline.txt"
```

(`$SCRATCH` is the session scratchpad, never the repo.) This number only ever has to come down
by Task 10; it is recorded so a later task can tell a fix from a regression.

- [ ] **Step 2: Create the entry module**

Create `packages/data-grid/core/src/features/entry.ts` with the re-exports in the Interfaces
block above, each on its own `export { … } from '@tanstack/table-core'` line so `import/order`
and the alphabetical rule are satisfiable.

Name the file `entry.ts`, **not** `index.ts`. `src/features/` is a directory of feature folders,
and a barrel at `src/features/index.ts` would make `import … from '../features'` resolve to
everything — one careless intra-package import would pull all seven features into any module,
which is the exact reachability the tree-shaking test added in PR 4 exists to prevent. Nothing
inside the package may import from this file; feature modules keep importing each other by their
own paths (`'../features/creating'`).

- [ ] **Step 3: Give the package a second build entry**

Replace the inline build script with a config, mirroring `packages/zu-store/tsup.config.ts`:

```ts
// packages/data-grid/core/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'features/index': 'src/features/entry.ts',
	},
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	external: ['react', 'react-dom', 'zod'],
})
```

and in `package.json`: `"build": "tsup"`, plus

```json
"exports": {
  ".":         { "types": "./dist/index.d.ts",          "import": "./dist/index.js",          "default": "./dist/index.js" },
  "./features":{ "types": "./dist/features/index.d.ts", "import": "./dist/features/index.js", "default": "./dist/features/index.js" }
}
```

Add a second `size-limit` entry for `dist/features/index.js`. Per AGENTS.md every entry ignores
the package's own runtime dependencies, so both entries carry
`"ignore": ["@tanstack/table-core", "@tanstack/store"]`. Give the new entry a deliberately loose
limit (`"6 KB"`) with a comment that it is re-measured in PR 6 after the first green build —
guessing a number now and calling it a budget would be a budget that measures nothing.

- [ ] **Step 4: Add `@tanstack/store` as a direct dependency**

```bash
pnpm --filter @ez-kit/data-grid-core add @tanstack/store@0.11.1
```

Task 9 imports `createAtom` from it for the draft atoms. Pin the version `react-table@9.2.4`
already resolves (api-notes §0) so the workspace does not gain a third `@tanstack/store` copy —
atoms from two copies are not the same module instance.

- [ ] **Step 5: Thread `TFeatures` through the 21 declarations that need it**

The parameter goes **first**, matching upstream's `Table<TFeatures, TData>` order, and is
constrained `TFeatures extends TableFeatures` with no default — a default would silently
resolve to the wrong set at every call site that forgot it.

In `src/types.ts`: `TableConfig`, `DataTable`, `Table`, `GlobalFilterFn`, `SelectionConfig`
(it names `Row`). Re-exported `TableState` becomes `TableState<TFeatures>`, and `TableSnapshot`
with it.

In `src/column/types.ts`: `TanStackColumnDef`, `CellViewCtx` (it names `HeaderContext`),
`SystemColumnDef`, and the `ColumnMeta` augmentation — which must be written with **three**
parameters:

```ts
declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface ColumnMeta<
		in out TFeatures extends TableFeatures,
		in out TData extends RowData,
		TValue extends CellData = CellData,
	> {
		/* …every existing field, unchanged */
	}
}
```

The variance annotations and the `CellData` default are copied from the upstream declaration at
`dist/types/ColumnDef.d.ts:17`; TypeScript rejects a merge whose parameter list differs, so this
is not stylistic.

**`ColumnDef<TRow, TCellTypes, TNode>` keeps its parameters** — design §1 settles this, and
nothing here reopens it. Our `ColumnDef` is our own type; it is `mapColumns`' _output_
(`TanStackColumnDef`) that becomes feature-generic.

The 18 declarations generic over the row alone — `CreatingSaveContext<TData>`,
`CreatingConfig<TData>`, `CreatingApi<TData>`, `CreateDefaultValueContext<TRow>`,
`CreateDefaultValuesContext<TRow>`, `EditingSaveContext<TData>`, `EditingConfig<TData>`,
`EditingApi<TData>`, `DeletingContext<TData>`, `DeletingConfig<TData>`,
`BulkDeletingContext<TData>`, `BulkDeletingConfig<TData>`, `ConfirmationConfig<TData>`,
`BulkConfirmationConfig<TData>`, `ValidateConfig<TData>`, `ColumnCreatingConfig`,
`RowActionsContext<TRow>`, `RowActionsConfig<TRow, TIcon, TNode>` — **do not** gain one. Adding
a parameter a type does not use is the churn AGENTS.md's settled-decisions section exists to
stop, and each of these would then need it threaded through every kit that names it.

- [ ] **Step 6: Export the new names from the package index**

`src/index.ts` gains `export type { TableFeatures } from '@tanstack/table-core'` and keeps its
existing re-exports. It does **not** re-export the feature values — those are the `/features`
entry's whole reason to exist, and duplicating them on the main index would make every feature
reachable from `@ez-kit/data-grid-core`, undoing the bundle win before it is measured.

Verify:

```bash
grep -nE "rowSortingFeature|stockFeatures|createSortedRowModel" packages/data-grid/core/src/index.ts
```

Expected: no output.

- [ ] **Step 7: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/(features/entry|column/types|types)\.ts\(' || echo 'OWNED FILES CLEAN'
pnpm --filter @ez-kit/data-grid-core exec eslint \
  src/features/entry.ts src/types.ts src/column/types.ts src/index.ts tsup.config.ts --max-warnings=0
```

Expected: `OWNED FILES CLEAN`, and lint silent. The package total goes **up** in this task and
that is expected and knowingly introduced: every call site of `TableConfig`, `DataTable` and
`TanStackColumnDef` now passes one argument too few. Tasks 4–9 consume that debt; Task 10 clears
it.

- [ ] **Step 8: Commit**

```bash
git add packages/data-grid/core/
git commit -m "feat(data-grid-core)!: compose features per table and add the /features entry point

The consumer now builds the feature set with tableFeatures() and passes it as
config.features, so a config field only type-checks when its feature is
registered. Stock features and row-model factories are re-exported from
@ez-kit/data-grid-core/features so table-core stays our dependency.

TFeatures is threaded through the 21 core types that name a table-core type.
ColumnMeta's augmentation takes v9's three parameters."
```

---

### Task 4: `createTableOptions` onto the v9 option shape

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/create-table/create-table-options.ts`
- Modify: `packages/data-grid/core/src/features/row-actions/row-actions.ts` (delete its `declare module` block)

**Interfaces:**

Consumes from Task 3: `TableConfig<TFeatures, TRow>`, the `/features` entry, `@tanstack/store`.

Produces, for Tasks 5, 9 and PR 2:

```ts
import type { Atom } from '@tanstack/store'
import type { ExternalAtoms, TableFeatures, TableOptions } from '@tanstack/table-core'

/** Config the React layer reads that is not a TanStack option and holds no table state. */
export type GridOptions = {
	rowActions: { placement: RowActionsPlacement; actions?: RowActionItem[] }
	rowPinning?: RowPinningConfig
	virtualization?: VirtualizationConfig
	direction: GridDirection
}

export function createTableOptions<TFeatures extends TableFeatures, TRow extends object>(
	config: TableConfig<TFeatures, TRow>,
	externals?: { atoms?: ExternalAtoms<TFeatures> },
) {
	// …
	return { options, initialState, columnInvariants, deferred, onChange, grid }
}
```

- `options` — a `TableOptions<TFeatures, TRow>` in all but the annotation (still inferred; the
  reason in Task 1's Step 3 is unchanged). Carries `features`, `data`, `columns`, `getRowId`,
  `initialState`, the `enableX` gates, the manual-mode flags, and `atoms` when `externals.atoms`
  was given.
- `grid: GridOptions` — new, per decision 4.
- `initialState`, `columnInvariants`, `deferred`, `onChange` — unchanged from Task 1.

**What changes inside the function.**

1. **`_features` is deleted.** The consumer supplies the set; `options.features = config.features`.
   Every `import { CreatingFeature, … }` at the top of the file goes with it — which is also what
   stops `createTableOptions` from being the module that makes all seven features reachable.
2. **Every `getXRowModel()` attachment is deleted.** In v9 a row model is a slot in the feature
   set (`sortedRowModel: createSortedRowModel()`), not an option, and it falls back to the
   previous stage when absent (verified at
   `dist/core/row-models/coreRowModelsFeature.utils.js:16`). `getCoreRowModel` goes too — v9
   defaults it to `createCoreRowModel()`. What survives is the **gates**: `enableSorting: false`,
   `enableColumnFilters: false`, `enableGlobalFilter: false`, `enableHiding: false`,
   `enableColumnPinning: false`, `enableRowSelection`, `enableMultiRowSelection`,
   `enableColumnResizing`, `enableRowPinning`. Those are what design §1 means by "config gates
   behaviour, not presence".
3. **`sortingFns` → `sortFns`, and it moves.** api-notes §6 confirms the rename; api-notes §1
   confirms `sortFns` is a **feature slot**, not a table option. A named comparator registry is
   therefore something the consumer puts in `tableFeatures({ sortFns: … })`. `sorting.fns` stays
   in our config as the ergonomic spelling and is **warned about in development** when
   `config.features.sortFns` is absent — it cannot be forwarded, because options cannot reach
   the feature set.
4. **`columnResizeDirection` becomes conditional.** It is an option of `columnResizingFeature`
   and does not exist without it. `config.direction` still reaches the React layer through
   `grid.direction` unconditionally — it is a fact about the grid, which is why it was set
   unconditionally before.
5. **`rowActions`, `pinning`, `virtualization` leave `options` for `grid`**, and
   `row-actions.ts`'s `declare module '@tanstack/table-core'` block is deleted with them. This is
   the `TableOptionsResolved` half of the leak design §2 names; the other half (per-feature
   `editing` / `creating` / `deleting` / `rowOrdering` / `draft` options) moves to
   `TableOptions_FeatureMap` in Tasks 6–9, so those five keys stay on `options` and are simply
   untyped until their feature's task lands.
6. **`atoms` is passed through**, spread conditionally (`exactOptionalPropertyTypes`):
   `...(externals?.atoms !== undefined ? { atoms: externals.atoms } : {})`.

- [ ] **Step 1: Add the registered-vs-configured development guard**

`sorting: {…}` without `rowSortingFeature` is a compile error under Task 3, but only when the
call site is typed — a config assembled through `as` or read from JSON is not. Add one dev-only
check near the top of the function, beside the existing `warnUnreachableSeed` block:

```ts
const REQUIRED_FEATURE: Partial<Record<keyof TableConfig<TableFeatures, object>, string>> = {
	sorting: 'rowSortingFeature',
	filtering: 'columnFilteringFeature',
	globalFiltering: 'globalFilteringFeature',
	pagination: 'rowPaginationFeature',
	selection: 'rowSelectionFeature',
	visibility: 'columnVisibilityFeature',
	expanding: 'rowExpandingFeature',
	resizing: 'columnResizingFeature',
}

if (IS_DEV) {
	for (const [option, feature] of Object.entries(REQUIRED_FEATURE)) {
		if (isFeatureEnabled(config[option as keyof typeof config] as never) && !(feature in config.features)) {
			console.warn(
				`[data-grid] \`${option}\` is configured, but \`${feature}\` is not in \`features\` — ` +
					`the option has no effect. Add it to your \`tableFeatures({ … })\` call.`,
			)
		}
	}
}
```

Note `resizing` needs **two**: `columnResizingFeature` requires `columnSizingFeature`
(`FeatureSlotPrereqs`, api-notes §1). Upstream turns the missing prerequisite into a string
literal type at the key, so `tableFeatures` already catches it at compile time — do not
duplicate that check here; warn only about `columnResizingFeature` itself.

- [ ] **Step 2: Apply changes 1–6 above**

Move code rather than rewriting it wherever the logic is unchanged — the gates, the invariants,
the seed merging and every comment on them are untouched by v9 and a rewrite would put behaviour
changes where a reviewer is not looking for them.

- [ ] **Step 3: Update the existing unit test**

`create-table-options.test.ts` (Task 1) asserts `options.getSortedRowModel` is a function when
sorting is on. That assertion is now wrong by design. Replace it with the v9 statement of the
same intent:

```ts
it('gates sorting at the table level rather than by attaching a row model', () => {
	const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() })
	const on = createTableOptions({ features, data: rows, columns, sorting: true })
	const off = createTableOptions({ features, data: rows, columns })

	expect(on.options).not.toHaveProperty('getSortedRowModel')
	expect(on.options.enableSorting).toBeUndefined()
	expect(off.options.enableSorting).toBe(false)
	expect(on.options.features).toBe(features)
})
```

Every other case in that file gains a `features` field in its config literal. The purity case
and the draft-throw case keep their assertions unchanged.

- [ ] **Step 4: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run src/create-table/create-table-options.test.ts
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/(create-table/create-table-options|features/row-actions/row-actions)\.ts\(' \
  || echo 'OWNED FILES CLEAN'
```

Expected: the test file green, `OWNED FILES CLEAN`. This is the first test that runs on v9 —
`createTableOptions` imports no feature module after change 1, so nothing broken is in its graph.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/core/src/
git commit -m "feat(data-grid-core)!: resolve v9 table options instead of v8 ones

Row models are feature slots in v9, so the getXRowModel attachments go and the
enableX gates stay — config gates behaviour, not presence. sortingFns becomes
the sortFns feature slot. rowActions, row pinning and virtualization move out
of TanStack options into a grid bag, which removes row-actions' global module
augmentation."
```

---

### Task 5: `createTable` on `constructTable`; delete the store and the outward funnel

This is where the lights come back on: after it, core constructs a real v9 table and three test
files run.

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/create-table/create-table.ts`
- Modify: `packages/data-grid/core/src/create-table/index.ts`
- Modify: `packages/data-grid/core/src/types.ts` (`DataTable`)
- Delete: `packages/data-grid/core/src/store/store.ts`, `packages/data-grid/core/src/store/index.ts`
- Modify: `packages/data-grid/core/src/create-table/create-table.test.ts`
- Modify: `packages/data-grid/core/src/create-table/create-table-resizing.test.ts`

**Interfaces:**

Consumes from Task 4: `createTableOptions(config, externals?)` and its `grid` field.

Produces:

```ts
export function createTable<TFeatures extends TableFeatures, TRow extends object>(
	config: TableConfig<TFeatures, TRow>,
): DataTable<TFeatures, TRow>

export interface DataTable<TFeatures extends TableFeatures, TRow extends RowData> extends TanStackTable<
	TFeatures,
	TRow
> {
	/** Reactively replace the data array. */
	setData: (data: TRow[]) => void
	/** The non-TanStack config the React layer reads. Set once at construction. */
	grid: GridOptions
}
```

Everything else on `DataTable` is **deleted**: `getState`, `setState`, `subscribe`,
`getSnapshot`, `getInitialSnapshot`, `syncControlledState`, `notifyStateSubscribers`, and the
re-declared `options` / `getRowModel` / `getAllColumns` / `getColumn` / `getRow` / `initialState`
/ `setOptions` narrowings, which existed only to pin v8's non-generic types. `appendData` and
`prependData` move to `infiniteFeature` in Task 6 and do not exist between these two tasks.

**What PR 2 gets instead, so it is not blocked.** Whole-state observation is
`table.store.subscribe(fn)`; the current snapshot is `table.store.state`; a slice is
`table.atoms.<slice>.get()`; a server snapshot is `() => table.initialState`. Controlled state is
`options.state.<slice>` + `on<Slice>Change`, which `createTableOptions` already resolves — the
one-way mirror `syncControlledState` performed is upstream's job in v9
(`table_syncExternalStateToBaseAtoms`, called from `constructTable`). No core API is needed for
any of it, under either PR-2 branch.

**The new body, in full.** It is ~25 lines where it was 237:

```ts
import { constructTable } from '@tanstack/table-core'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'

import { createTableOptions } from './create-table-options'

import type { DataTable, TableConfig } from '../types'
import type { TableFeatures, TableOptions } from '@tanstack/table-core'

export function createTable<TFeatures extends TableFeatures, TRow extends object>(
	config: TableConfig<TFeatures, TRow>,
): DataTable<TFeatures, TRow> {
	const { options, grid } = createTableOptions(config)

	// The vanilla reactivity binding, spread *before* the caller's set so a caller that
	// supplied its own wins — the same order `useTable` uses (api-notes §5.1). A React
	// consumer never reaches this function; it calls `useTable` with these options.
	const table = constructTable({
		...options,
		features: { coreReactivityFeature: storeReactivityBindings(), ...options.features },
	} as TableOptions<TFeatures, TRow>) as DataTable<TFeatures, TRow>

	table.grid = grid
	table.setData = (data) => {
		table.setOptions((prev) => ({ ...prev, data }))
	}

	return table
}
```

Gone with it: `createStore`, the `ref` wrapper, `toOutward`, `outwardUnchanged`, `syncApplied`,
`onStateChange` and its eleven-branch dispatch, `DRAFT_AXES`, the second `createStore` from
`table.initialState`, and the `setOptions` call that switched to fully-controlled mode. The
per-feature callbacks the funnel dispatched are now upstream's `on<Slice>Change` options, which
`createTableOptions` wires from `onChange` — **add that wiring here if Task 4 left it unwired**,
one `on<Slice>Change` per entry, with two notes carried over verbatim from the funnel's comments:

- **Selection.** The funnel's comment says `onRowSelectionChange` _replaces_ the built-in writer,
  so supplying it to carry a callback stopped selection from being recorded. That is still true
  in v9 — `makeStateUpdater` is what a default handler does (api-notes §3). So our handler must
  call `makeStateUpdater('rowSelection', table)(updater)` itself and _then_ the consumer
  callback. The same applies to every other slice we forward.
- **Resizing.** Forward `onColumnSizingChange` only. `columnResizing` (v8's `columnSizingInfo`)
  churns on every pointer move mid-drag.

- [ ] **Step 1: Rewrite `create-table.ts` and delete `src/store/`**

```bash
git rm -r packages/data-grid/core/src/store
```

Then remove `SetStateOptions` from `src/types.ts`'s imports and from `syncControlledState`'s
signature, which is itself deleted.

- [ ] **Step 2: Narrow `DataTable`**

Per the Interfaces block. Keep the doc comment on `setData`; drop the rest with the members they
described.

- [ ] **Step 3: Migrate `create-table.test.ts` and `create-table-resizing.test.ts`**

Every config literal gains `features: tableFeatures({ … })` naming exactly the features that
test exercises — which is itself worth doing carefully, because these literals become the
worked examples PR 4's docs are written from. The 18 `getState()` reads become
`table.store.state` (or `table.atoms.<slice>.get()` where the assertion is about one slice).
Anything asserting on `subscribe` / `getSnapshot` / `syncControlledState` is rewritten against
`table.store.subscribe` / `table.store.state` / `options.state`, or deleted with a note in the
commit body if it was testing the deleted plumbing rather than a behaviour.

Do **not** touch the feature test files here; they belong to Tasks 6–9 and will still fail.

- [ ] **Step 4: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run \
  src/create-table/create-table.test.ts \
  src/create-table/create-table-resizing.test.ts \
  src/create-table/create-table-options.test.ts
```

Expected: all three green. A v9 table constructs, sorts, filters, paginates, resizes and pins
under a stock-only feature set. Plus owned-file typecheck over `create-table.ts`, `types.ts`,
`create-table/index.ts`.

- [ ] **Step 5: Commit**

```bash
git add -A packages/data-grid/core/src/
git commit -m "feat(data-grid-core)!: construct the v9 table and delete the hand-written store

createTable is now constructTable(createTableOptions(config)). src/store/** is
gone in full, and with it the onStateChange funnel, toOutward, outwardUnchanged
and syncApplied — v9 owns state in atoms and emits per slice.

DataTable drops subscribe, getSnapshot, getInitialSnapshot, syncControlledState
and notifyStateSubscribers: every one existed only to marry that store to
useSyncExternalStore. Readers use table.store / table.atoms."
```

---

### Task 6: The three state-only features — `loadingFeature`, `infiniteFeature`, `rowOrderingFeature`

Grouped because all three are `getInitialState` plus at most one table method, and the port is
the same three moves in each: rename into upstream's register, replace the global
`declare module` with per-feature `*_FeatureMap` merges, and replace `createTable` with
`constructTableAPIs` + `assignTableAPIs`.

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/features/loading/loading.ts`
- Modify: `packages/data-grid/core/src/features/infinite/infinite.ts`
- Modify: `packages/data-grid/core/src/features/ordering/row-ordering-feature.ts`
- Modify: their three `*.test.ts` siblings
- Modify: `packages/data-grid/core/src/features/entry.ts`

**Interfaces:**

Produces, appended to `src/features/entry.ts`:

```ts
export { loadingFeature, type LoadingState } from './loading'
export { infiniteFeature, type InfiniteState } from './infinite'
export { rowOrderingFeature, type RowOrderState, type RowOrderingApi } from './ordering'
```

and the declaration merges each feature performs:

```ts
declare module '@tanstack/table-core' {
	interface Plugins {
		loadingFeature: TableFeature
	}
	interface TableState_FeatureMap {
		loadingFeature: { loading: LoadingState }
	}
}

declare module '@tanstack/table-core' {
	interface Plugins {
		infiniteFeature: TableFeature
	}
	interface TableState_FeatureMap {
		infiniteFeature: { infinite: InfiniteState }
	}
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		infiniteFeature: {
			setInfiniteStatus: (partial: Partial<InfiniteState>) => void
			appendData: (rows: Array<TData>) => void
			prependData: (rows: Array<TData>) => void
		}
	}
}

declare module '@tanstack/table-core' {
	interface Plugins {
		rowOrderingFeature: TableFeature
	}
	interface TableState_FeatureMap {
		rowOrderingFeature: { rowOrder: RowOrderState }
	}
	interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		rowOrderingFeature: { rowOrdering?: RowOrderingConfig }
	}
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		rowOrderingFeature: { ordering: RowOrderingApi }
	}
}
```

**Three things that are easy to get wrong here.**

1. **The `Plugins` key, the `assignTableAPIs` first argument and the `*_FeatureMap` key must be
   the same string** — it is what makes the key legal in `tableFeatures({…})` and what
   `ExtractFeatureMapTypes` matches on (api-notes §1, §3).
2. **`Cell_FeatureMap` and `Header_FeatureMap` take no type parameters** (api-notes §3). None of
   these three touches them, but the next three tasks are where the mistake would be made by
   symmetry, so it is stated once here.
3. **A slice only gets an atom if it is in `initialState`.** `constructTable` builds
   `baseAtoms` / `atoms` from `Object.keys(table.initialState)` after every feature's
   `getInitialState` has run (`dist/core/table/constructTable.js:84-100`). Each of these features
   already seeds its slice there, so nothing extra is needed — but a feature that assigned state
   lazily would get no atom at all, and would fail at the first `table.atoms.<slice>.get()`.

**The mechanical port, shown once on `infiniteFeature`** (the other two are the same shape, and
`loadingFeature` has no table half at all):

```ts
export const infiniteFeature: TableFeature = {
	getInitialState: (initialState) => ({
		infinite: { ...INITIAL_INFINITE_STATE },
		...initialState, // spread LAST — api-notes §3, hook ordering
	}),

	constructTableAPIs: (table) => {
		assignTableAPIs('infiniteFeature', table, {
			table_setInfiniteStatus: {
				fn: (partial: Partial<InfiniteState>) => {
					table.baseAtoms.infinite.set((prev) => ({ ...prev, ...partial }))
				},
			},
			table_appendData: {
				fn: (rows) => {
					table.setOptions((prev) => ({ ...prev, data: [...prev.data, ...rows] }))
				},
			},
			table_prependData: {
				fn: (rows) => {
					table.setOptions((prev) => ({ ...prev, data: [...rows, ...prev.data] }))
				},
			},
		})
	},
}
```

Note the `table_` prefix — `getFunctionNameInfo` strips it, so the installed name is
`setInfiniteStatus` (api-notes §3). Note also that the write goes to **`baseAtoms`**, not
`atoms`: `atoms.<slice>` is a readonly derived atom. `infinite` is grid-owned and never
externally owned, so `baseAtoms` is right; a slice that _could_ be externally owned must go
through `makeStateUpdater`, which picks the owning atom.

`appendData` / `prependData` land here rather than on `DataTable` because they belong to
`infinite` (design §3) and because doing so makes them a live demonstration of D1: a grid
assembled without `infiniteFeature` does not have them, and the type says so.

`rowOrderingFeature` keeps `moveRow` / `canMoveRow` / `applyRowOrder` exactly as they are — they
are pure helpers over a table and only their two `table.getState().rowOrder` reads change, to
`table.atoms.rowOrder.get()`.

- [ ] **Step 1: Port the three feature modules per the shapes above**

Delete every `declare module '@tanstack/table-core' { interface TableState … }` block and the
`// Re-exported so index.ts can source …` comments above them: rollup-dts dropping a global
augmentation was a v8 problem, and with the state declared under a feature key in the `/features`
entry's own graph it no longer applies. Verify that claim in Step 4 rather than assuming it.

- [ ] **Step 2: Rename the exports**

`LoadingFeature` → `loadingFeature`, `InfiniteFeature` → `infiniteFeature`,
`RowOrderingFeature` → `rowOrderingFeature`. Design §1 requires the register; a `git grep -n
'LoadingFeature\|InfiniteFeature\|RowOrderingFeature'` afterwards must find only the new
spellings in core.

- [ ] **Step 3: Migrate the three test files**

`loading.test.ts`, `infinite.test.ts` and `row-ordering-feature.test.ts`. Each config literal
gains `features: tableFeatures({ loadingFeature })` (etc.); `row-ordering-feature.test.ts`'s 11
`getState()` reads become `table.atoms.rowOrder.get()`.

- [ ] **Step 4: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run \
  src/features/loading src/features/infinite src/features/ordering
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/features/(loading|infinite|ordering)/' || echo 'OWNED FILES CLEAN'
```

Expected: green, `OWNED FILES CLEAN`, and `create-table*.test.ts` from Task 5 still green.

Then confirm the declaration-merge claim survives the bundle, since that is the thing a unit test
cannot see:

```bash
pnpm --filter @ez-kit/data-grid-core build
grep -n "TableState_FeatureMap" packages/data-grid/core/dist/features/index.d.ts
```

Expected: the merges appear in the emitted `.d.ts`. If they do not, the re-export trick the old
comments described is still needed and the comment comes back, corrected — record which it was in
the commit body.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/core/src/features/
git commit -m "feat(data-grid-core)!: port loading, infinite and row-ordering to the v9 plugin API

Renamed into upstream's register (loadingFeature, infiniteFeature,
rowOrderingFeature) and exported from @ez-kit/data-grid-core/features.

Each declares its state under its own key in TableState_FeatureMap instead of
merging into the global TableState, so a plain TanStack table in the same
project no longer gets state.loading declared and lying.

appendData / prependData move from DataTable onto infiniteFeature, where they
belong and where omitting the feature removes them."
```

---

### Task 7: `editingFeature` — the one feature with a row prototype

Taken alone because it is the only feature that touches `assignRowPrototype`, and that is the
mechanism api-notes §3 spends the most words on.

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/features/editing/editing.ts`
- Modify: `packages/data-grid/core/src/features/editing/editing.test.ts`
- Modify: `packages/data-grid/core/src/features/entry.ts`

**Interfaces:**

```ts
// entry.ts
export { editingFeature, EditingMode } from './editing'
export type { EditingApi, EditingConfig, EditingSaveContext, EditingState } from './editing'
```

```ts
declare module '@tanstack/table-core' {
	interface Plugins {
		editingFeature: TableFeature
	}
	interface TableState_FeatureMap {
		editingFeature: { editing: EditingState }
	}
	interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		editingFeature: { editing?: EditingConfig<TData> }
	}
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		editingFeature: { editing: EditingApi<TData> }
	}
	interface Row_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		editingFeature: { getIsEditing: () => boolean }
	}
}
```

**The three moves.**

1. **The `AbortController` leaves the closure for instance data.** v9 requires mutable per-table
   data in `initTableInstanceData`, with `constructTableAPIs` doing assignment only (api-notes
   §3). So:

   ```ts
   declare module '@tanstack/table-core' {
     interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
       editingFeature: { editing: EditingApi<TData>; _editingAbort: { controller?: AbortController } }
     }
   }

   initTableInstanceData: (table) => { table._editingAbort = {} },
   resetTableInstanceData: (table) => {
     table._editingAbort.controller?.abort()
     table._editingAbort = {}
   },
   ```

   A box (`{ controller?: … }`) rather than the controller directly, so `resetController` can
   swap it without reassigning a property that `assignTableAPIs` installed. `resetTableInstanceData`
   runs after `table.reset()` restores internally owned atoms — aborting an in-flight validation
   at that point is correct and is behaviour we do not have today.

2. **`createTable` → `constructTableAPIs` + `assignTableAPIs`.** Every local const in today's
   closure (`getConfig`, `getState`, `writeState`, `runValidate`, `resolveColumnEditing`,
   `validateAndApplyField`, `snapshotRow`, …) becomes a module-level function taking `table` as
   its first argument. That is not cosmetic: a closure over `table` is still legal for a table
   API (the table is a singleton), but hoisting them is what lets the row-prototype half call
   them, and upstream's own guardrail is that `constructTableAPIs` assigns and nothing else.

   The one API surface stays exactly as it is — `table.editing` is a single object with the same
   seven members, assigned through one `table_editing` key. Do not fan it out into seven table
   methods; `EditingApi` is the documented shape and AGENTS.md's settled decisions name
   `editing` as the option and the group.

3. **`createRow` → `assignRowPrototype`.** The v9 form, with the two mechanical details from
   api-notes §3 — the `row_` prefix that gets stripped, and `fn` receiving the row first:

   ```ts
   assignRowPrototype: (prototype, table) => {
     assignPrototypeAPIs('editingFeature', prototype, table, {
       row_getIsEditing: {
         fn: (row) => row.table.atoms.editing?.get().rowId === row.id,
       },
     })
   },
   ```

   **Route B (`row.table`), not the closure.** Both work — the prototype is per table, so closing
   over the hook's `table` is sound — but every stock feature reads state through `row.table`, and
   a method that does not capture anything stays correct if the prototype is ever reused. There
   is no `assignRowAPIs`; `assignPrototypeAPIs` inside the hook is the only route (api-notes §7.3).

   `atoms.editing?.get()` with the optional chain, not `atoms.editing.get()`: inside feature code
   the broadened `Atoms_All` makes every key optional (api-notes §4), which is what lets this
   compile for a feature set the function is not generic over.

**Reads and writes.** The six `table.getState().editing` reads become
`table.atoms.editing.get()`. The four `table.setState((prev) => …)` writes become
`table.baseAtoms.editing.set((prev) => …)` — `editing` is grid-owned and never externally
controlled, so `baseAtoms` is the owning atom. Note what this buys: `writeState` no longer
rebuilds the whole `TableState` to change one slice, and a subscriber to another slice is no
longer woken by a keystroke in a form field.

The `apply`-style multi-slice write in `commit` (if any survives) is the one case needing
`batch` from `@tanstack/store`, so two atom writes land as one notification. Check for it; if
`editing` writes only its own slice, no batching is needed.

- [ ] **Step 1: Port `editing.ts` per the three moves**

- [ ] **Step 2: Rename `EditingFeature` → `editingFeature` and export from `entry.ts`**

- [ ] **Step 3: Migrate `editing.test.ts`** — `features: tableFeatures({ editingFeature })` in
      each config, and the 15 `getState()` reads onto `table.atoms.editing.get()`.

- [ ] **Step 4: Prove the prototype method survives what the design flagged**

Design §2 asks for an explicit audit: prototype-bound methods break under destructuring,
spreading, `Object.keys` and `JSON.stringify`, and `getIsEditing` is our only such method. Add a
characterization test to `editing.test.ts` so the breakage is caught here rather than at runtime
in a kit:

```ts
it('getIsEditing is on the prototype, so it does not survive a spread', () => {
	const row = table.getRowModel().rows[0]!
	expect(typeof row.getIsEditing).toBe('function')
	expect(Object.hasOwn(row, 'getIsEditing')).toBe(false)
	expect(Object.keys(row)).not.toContain('getIsEditing')
	expect({ ...row }.getIsEditing).toBeUndefined()
	// bound callback passing still works, because fn reads `this`
	const bound = row.getIsEditing.bind(row)
	expect(bound()).toBe(false)
})
```

Design §7 already records that no destructuring or bare-callback passing of a row method exists
in the React package today. This test is what keeps that true.

- [ ] **Step 5: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/editing
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/features/editing/' || echo 'OWNED FILES CLEAN'
```

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/core/src/features/
git commit -m "feat(data-grid-core)!: port editing to the v9 plugin API

Table methods move to constructTableAPIs + assignTableAPIs, the per-table
AbortController to initTableInstanceData / resetTableInstanceData, and
row.getIsEditing to assignRowPrototype — reading table through row.table, as
every stock feature does.

State reads and writes go through table.atoms.editing / baseAtoms.editing, so a
keystroke in a form field no longer rebuilds the whole state object."
```

---

### Task 8: `creatingFeature` and `deletingFeature`

Together because both are table-API-only and both reuse the `AbortController`-in-instance-data
pattern Task 7 establishes — porting them apart would invite two spellings of it.

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/features/creating/creating.ts` and its test
- Modify: `packages/data-grid/core/src/features/deleting/deleting.ts` and its test
- Modify: `packages/data-grid/core/src/features/entry.ts`

**Interfaces:**

```ts
// entry.ts
export { creatingFeature, CreatingMode } from './creating'
export type {
	CreatingApi,
	CreatingConfig,
	CreatingSaveContext,
	CreatingState,
	CreateDefaultValueContext,
	CreateDefaultValuesContext,
} from './creating'
export { deletingFeature } from './deleting'
export type { BulkDeletingApi, BulkDeletingConfig, DeletingApi, DeletingConfig, DeletingState } from './deleting'
```

```ts
declare module '@tanstack/table-core' {
	interface Plugins {
		creatingFeature: TableFeature
		deletingFeature: TableFeature
	}
	interface TableState_FeatureMap {
		creatingFeature: { creating: CreatingState }
		deletingFeature: { deleting: DeletingState }
	}
	interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		creatingFeature: { creating?: CreatingConfig<TData> }
		deletingFeature: { deleting?: DeletingConfig<TData> }
	}
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		creatingFeature: { creating: CreatingApi<TData>; _creatingAbort: { controller?: AbortController } }
		deletingFeature: { deleting: DeletingApi; _deletingAbort: { controller?: AbortController } }
	}
}
```

- [ ] **Step 1: Port `creating.ts`**

Same three moves as Task 7 minus the row prototype: instance data for the controller, hoisted
helpers, one `table_creating` key carrying the whole `CreatingApi`. Its 6 `getState()` reads
become `table.atoms.creating.get()`; its writes go to `table.baseAtoms.creating.set(…)`.

- [ ] **Step 2: Port `deleting.ts`**

Same, with one thing that is not the same. `deselect` writes **`rowSelection`**, a slice this
feature does not own and which the consumer may control or externally own. That write must go
through `makeStateUpdater`, not `baseAtoms`:

```ts
import { makeStateUpdater } from '@tanstack/table-core'

const deselect = (table, rowIds: string[]): void => {
	if (rowIds.length === 0) return
	const removed = new Set(rowIds)
	makeStateUpdater(
		'rowSelection',
		table,
	)((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !removed.has(id))))
}
```

`makeStateUpdater(key, instance)` reads `options.atoms` and `baseAtoms` and writes the owning one
(api-notes §3). Writing `baseAtoms.rowSelection` directly would go nowhere whenever the consumer
supplied `atoms.rowSelection` — the exact failure the design's "writes must go to the owning
atom" note warns about, and it would be silent.

Also: `deleting` writes `rowSelection` **and** its own slice in the same gesture. Wrap the pair in
`batch` from `@tanstack/store` so one notification reaches subscribers, preserving the property
the old single `setState` gave for free.

- [ ] **Step 3: Rename and export** — `CreatingFeature` → `creatingFeature`,
      `DeletingFeature` → `deletingFeature`.

- [ ] **Step 4: Migrate both test files** — 30 `getState()` reads in `creating.test.ts`, 19 in
      `deleting.test.ts`, plus `features:` on every config literal.

- [ ] **Step 5: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/creating src/features/deleting
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/features/(creating|deleting)/' || echo 'OWNED FILES CLEAN'
```

Add one case to `deleting.test.ts` that the old implementation could not express: a table given
an external `atoms.rowSelection` still has its selection cleared by a bulk delete. That is the
`makeStateUpdater` decision above, made testable.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/core/src/features/
git commit -m "feat(data-grid-core)!: port creating and deleting to the v9 plugin API

Both follow editing: assignTableAPIs for the API object, instance data for the
AbortController, atoms for reads and writes.

deleting's post-bulk deselect writes rowSelection — a slice it does not own — so
it goes through makeStateUpdater, which picks the owning atom. Writing baseAtoms
directly would silently do nothing for a consumer who supplied their own."
```

---

### Task 9: `draftFeature` — rebuilt on externally-owned atoms

Design §2 calls this "rethought, not ported", and api-notes §4 settles the shape the design left
open: `atoms` is `Partial`, ownership is per slice, so **one atom set**.

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/features/deferred-apply/deferred-apply.ts`
- Modify: `packages/data-grid/core/src/features/deferred-apply/deferred-apply.test.ts`
- Modify: `packages/data-grid/core/src/create-table/create-table.ts` (call the factory)
- Modify: `packages/data-grid/core/src/features/entry.ts`

**Interfaces:**

```ts
// deferred-apply.ts — the atom factory the caller owns
export type DraftAtoms = {
	sorting: Atom<SortingState>
	columnFilters: Atom<ColumnFiltersState>
	globalFilter: Atom<unknown>
}

/**
 * Create the three live draft atoms. **Call once per table instance, never per render:**
 * `useTable` merges the options object into the table on every render and replaces `atoms`
 * wholesale, so a fresh set each render would reset the draft on every keystroke.
 */
export function createDraftAtoms(seed?: Partial<AppliedState>): DraftAtoms

export const draftFeature: TableFeature
```

```ts
declare module '@tanstack/table-core' {
	interface Plugins {
		draftFeature: TableFeature
	}
	interface TableState_FeatureMap {
		draftFeature: { applied: AppliedState }
	}
	interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		draftFeature: { draft?: boolean }
	}
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		draftFeature: { draft: DraftApi }
	}
}
```

`DraftApi`, `QueryDraft`, `PendingCount`, `DraftAxis` and `AppliedState` keep their exact current
shapes and names. The feature's public surface does not change; only what is underneath it does.

**Why external atoms rather than the internal slices.** Emission gating alone does not need them:
with the funnel gone, `draft.apply()` can call the consumer's `sorting.onChange` directly and
nothing else would. What needs them is the _other_ half of today's machinery — the `DRAFT_AXES`
filter inside `syncControlledState`, which exists because a consumer in controlled mode mirrors
back the last **applied** query, and accepting it would discard what the user is composing.
Upstream's precedence — `options.atoms[key] > options.state[key] > baseAtoms[key]` (api-notes §4)
— makes that structurally impossible instead of defended against. That is the whole reason the
funnel could be deleted in Task 5, so this task is what pays for it.

**Why one set and not two.** `ExternalAtoms` is `Partial`, so a table can have three external
slices and keep the rest internal. The three live axes are external; `applied` is an ordinary
internal slice declared in `TableState_FeatureMap` exactly as today. A second set would be a
second copy of the same three values with nothing to reconcile them.

**Why the caller creates them.** See decision 2 in the orientation above. `createTableOptions` is
pure and takes them through `externals.atoms` (Task 4); `createTable` calls `createDraftAtoms`
once; `useDataGrid` in PR 2 calls it in a `useState` initializer. `createDraftAtoms` uses
`createAtom` from `@tanstack/store` — under the vanilla binding `wrapExternalAtoms` is `false`
and the atoms are used directly, while `reactReactivity()` wraps and two-way mirrors them
(`constructTable.js:52-68`); both are correct, and neither requires us to know which is in play.

**The port.**

- `getInitialState` keeps its exact logic — seed `applied` from `initialState.sorting` /
  `columnFilters` / `globalFilter`, seed the live axes from `initialState.draft` on top — but the
  live seed now goes into the atoms, so `createDraftAtoms(seed)` takes it and `getInitialState`
  contributes only `applied`. Both halves read the same `initialState`, so the caller passes the
  same object to both.
- `get()` reads `table.atoms.sorting.get()` and friends — which resolve to the external atoms.
- `isDirty()` / `getPendingCount()` are unchanged apart from their reads. `sameAxis` is unchanged.
- `set()` writes the three atoms directly (they are `Atom`, writable), inside `batch`.
- `apply()` keeps its dirty guard and its "one state change" invariant, now as one `batch`:
  write `baseAtoms.applied`, reset `pagination.pageIndex` to 0 and clear `rowSelection` — the
  last two through `makeStateUpdater`, for the reason Task 8 gives. Then call the consumer's
  per-axis handlers with the newly applied values; that is what replaces the funnel's emission.
- `reset()` / `resetAxis()` write the atoms back to `applied`. Design §3 notes `table.reset()`
  resets only internal base atoms, so resetting the draft axes is this feature's job — which it
  already was, and now the types say so.

- [ ] **Step 1: Write the failing test first**

`deferred-apply.test.ts`'s "emission gating" block is the characterization coverage design §7
relies on; it must pass unchanged in meaning. Before touching the feature, add the case the old
architecture could not express:

```ts
it('a controlled state mirror does not clobber a pending draft', () => {
	const atoms = createDraftAtoms()
	const features = tableFeatures({ rowSortingFeature, draftFeature })
	const table = createTable({ features, data, columns, sorting: { manual: true }, draft: true /* … */ })

	table.draft.set({ sorting: [{ id: 'name', desc: false }] })
	// the consumer mirrors back what it last saw — the APPLIED query, which is empty
	table.setOptions((prev) => ({ ...prev, state: { ...prev.state, sorting: [] } }))

	expect(table.draft.get().sorting).toEqual([{ id: 'name', desc: false }])
	expect(table.draft.isDirty()).toBe(true)
})
```

This is the `DRAFT_AXES` filter's behaviour, stated as a property of atom precedence rather than
of our own guard.

- [ ] **Step 2: Port the feature and add `createDraftAtoms`**

- [ ] **Step 3: Wire `createTable`**

```ts
const draftAtoms =
	'draftFeature' in config.features && isFeatureEnabled(config.draft)
		? createDraftAtoms(config.initialState)
		: undefined
const { options, grid } = createTableOptions(config, draftAtoms ? { atoms: draftAtoms } : {})
```

- [ ] **Step 4: Rename and export** — `DeferredApplyFeature` → `draftFeature`, exported from
      `entry.ts` with `DraftAxis`, `createDraftAtoms` and the five types. The directory keeps its
      name for now; renaming `features/deferred-apply/` to `features/draft/` is churn that would
      obscure this diff, and PR 6's tail is the place for it if it is wanted at all.

- [ ] **Step 5: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/deferred-apply
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/(features/deferred-apply|create-table/create-table)\.?' || echo 'OWNED FILES CLEAN'
```

Expected: the whole file green, the emission-gating block **unchanged in meaning** — if a gating
assertion had to be weakened to pass, that is a behaviour regression, not a migration, and it
goes back.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/core/src/
git commit -m "feat(data-grid-core)!: rebuild draft on externally-owned atoms

The three deferred axes are now external atoms the feature owns, which beat
options.state by upstream's own precedence rule. The DRAFT_AXES filter that
stopped a controlled mirror from discarding a pending draft is no longer needed:
the ownership model makes it impossible rather than defended against.

applied stays an internal slice. One atom set, not two — atoms is partial, so
ownership is per slice. DeferredApplyFeature is now draftFeature."
```

---

### Task 10: Close PR 1 — `allDataGridFeatures`, budgets, and the first green `--filter data-grid-core`

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/features/entry.ts`
- Modify: `packages/data-grid/core/src/index.ts` and `src/index.test.ts`
- Modify: `packages/data-grid/core/package.json` (`size-limit` numbers)
- Modify: whatever core files the final typecheck still names

**Interfaces:**

```ts
/**
 * Every feature this package ships, stock and custom, in one object.
 *
 * For prototypes, documentation examples and the "just give me a grid" case. Registering it
 * defeats the point of composing a set: nothing tree-shakes, and every registered feature
 * creates its state slice and its APIs whether or not the config enables it (design §1,
 * "Accepted cost"). Name the features you use.
 */
export const allDataGridFeatures = tableFeatures({
	...stockFeatures,
	sortedRowModel: createSortedRowModel(),
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	expandedRowModel: createExpandedRowModel(),
	groupedRowModel: createGroupedRowModel(),
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	facetedMinMaxValues: createFacetedMinMaxValues(),
	creatingFeature,
	deletingFeature,
	draftFeature,
	editingFeature,
	infiniteFeature,
	loadingFeature,
	rowOrderingFeature,
})
```

**It must not include `coreReactivityFeature`.** `useTable` injects `reactReactivity()` and
spreads it **before** the caller's set, so a value we supplied would win and break React
rendering (api-notes §5.1). `createTable` supplies `storeReactivityBindings()` the same way, for
the vanilla path (Task 5). Neither `allDataGridFeatures` nor any documented example ever names
the key.

- [ ] **Step 1: Add `allDataGridFeatures`**

`stockFeatures` is the all-in aggregate export (api-notes §2), so spreading it is both correct
and self-maintaining across a table-core patch. The row-model slots must be listed explicitly —
they are not features and are not in `stockFeatures`.

- [ ] **Step 2: Update `src/index.test.ts`**

It asserts the shape of the package's public surface. Add the assertion that makes D1 checkable
from inside the package:

```ts
it('does not export feature values from the main entry', async () => {
	const main = await import('./index')
	for (const name of Object.keys(main)) {
		expect(name).not.toMatch(/Feature$/)
	}
})
```

- [ ] **Step 3: Run the real criterion**

```bash
pnpm --filter @ez-kit/data-grid-core lint \
  && pnpm --filter @ez-kit/data-grid-core typecheck \
  && pnpm --filter @ez-kit/data-grid-core test \
  && pnpm --filter @ez-kit/data-grid-core build
```

This is design §7's PR 1 criterion, and it is the first point in PR 1 at which it can run. Every
one of the 113 `getState()` test call sites has been migrated by the task that owned its file; if
`typecheck` or `test` still names one, it belongs to a task that under-delivered — fix it here
and say which task it was in the commit body, so the next planning pass knows.

`pnpm run ci` and `pnpm build` at the repo root are **still red**, and that is expected: the react
package and both kits are untouched and still call `getState()`, `subscribe`, `getSnapshot` and
`syncControlledState`. Do not attempt to fix them here — that is PR 2, and touching it would
merge two reviews into one.

- [ ] **Step 4: Re-measure the two size budgets**

```bash
pnpm --filter @ez-kit/data-grid-core size
```

Set each limit to the measured value plus roughly 15% headroom, per AGENTS.md, and keep both
`ignore` lists at `["@tanstack/table-core", "@tanstack/store"]`. The `dist/index.js` number
should have **fallen** — `src/store/**`, the funnel and seven `_features` registrations left it.
If it rose, something on the main entry is still reaching the features; find it before setting
the number.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/core/
git commit -m "feat(data-grid-core): add allDataGridFeatures and close the core migration

The all-in set, for prototypes and docs, documented as defeating tree-shaking.
It deliberately omits coreReactivityFeature: useTable and createTable each
inject their own, and a caller-supplied one would win.

data-grid-core now lints, type-checks, tests and builds on v9. The repository
does not — the React package and both kits are PR 2 and PR 3."
```

No changeset is written here. One `minor` changeset covering the whole migration goes in PR 6
(design §7 row 6), because the breaking surface is not final until the kits have landed, and a
changeset naming `@ez-kit/data-grid-shadcn` would fail the `version` job after the merge.

---

## Planning boundary

This pass stops at the end of PR 1. The next pass covers **PR 2 (React)**, and it waits on two
things Task 10 produces rather than predicts:

1. **The real shape of `createTableOptions`' return value and of `DataTable`.** PR 2's central
   question — whether `useDataGrid` adopts `useTable` wholesale or keeps its own
   `useSyncExternalStore` — turns on how much of `use-data-grid.ts` still has a job once
   `table.Subscribe` and `table.atoms` exist. Tasks 5 and 9 make that concrete: the answer is
   readable from the code, and guessing it now would produce signatures for a hook nobody has
   run. Both branches are already unblocked from core's side — decision 5 above records that
   neither needs an API core does not ship.
2. **Which prototype-bound reads the React package actually performs.** Task 7's characterization
   test fixes the rule; PR 2's audit applies it to ~13.6k lines. That audit is cheap once
   `editingFeature` exists and expensive to do against a feature that is still v8-shaped.

Beyond PR 2, design §7 rows 3 (pinning, `start`/`end` through core, react and both kits),
4 (62 docs pages and 54 examples, the `docs-option-names` map, new `tree-shaking` cases),
5 (browser suite including the new RTL pinning cases, and the temporary `e2e` trigger on the
integration branch) and 6 (AGENTS.md, READMEs, the `minor` changesets, recomputed budgets,
removing the temporary trigger) are planned in later passes, each after the one before it has
landed — for the same reason this pass waited for Task 2: the plan is worth more when it is
written against a tree than against a document.

The branch stays local throughout. Pushing `integration/tanstack-v9` and opening any PR against
it is the human's call, and no task above contains a step that does either.

## Self-review notes

- **Spec coverage:** this plan implements design §7 rows "0. Preparation" (Task 1) and
  "1. Core engine" in full (Tasks 2–10). Rows 2 through 6 are explicitly deferred in the planning
  boundary above, not omitted.
- **Counted against the tree, not the design:** 26 `getState()` call sites in core source (design
  says 26 — agrees), 113 in core tests across 7 files, 17 stock features rather than 16
  (api-notes §2), and 21 core types needing `TFeatures` rather than "~23" — out of 39 exported
  declarations generic over the row, the other 18 name no table-core type and keep their
  parameters. `row-actions.ts` carries an eighth global `declare module` with no feature behind
  it; Task 4 deletes it rather than porting it.
- **Decided here, having been left open by the design:** `draft` gets one atom set (api-notes §4
  settles it); the draft atoms are created by the caller because `useTable` replaces `atoms` on
  every render; `ColumnMeta` stays a global merge at v9's three parameters instead of moving to
  the `columnMeta` slot; `rowActions` / row `pinning` / `virtualization` / `direction` leave
  TanStack options for a `grid` bag; `getInitialSnapshot` is deleted rather than wrapped, since
  neither PR-2 branch needs a core API for it; `getState()` gets no shim.
- **Type consistency:** `createTableOptions`, `ResolvedTableOptions`, `FeatureOnChangeHandlers`,
  `columnInvariants`, `deferred` and `onChange.<feature>` are used with the same spelling in
  Task 1's interface block, Steps 3–4, and the design doc's §4.
- **Dropped from PR 0 after verification:** removing destructured prototype methods (none exist)
  and rewriting indeterminate selection (already v9-correct at `header-cell.tsx:145`, covered by
  `data-grid.test.tsx:92-103`). Recorded in the design doc's §7 note.
