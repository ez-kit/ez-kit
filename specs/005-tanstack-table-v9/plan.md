# TanStack Table v9 Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land PR 0 (the on-v8 preparation refactor) and the whole of PR 1 (the core engine on v9), so `@ez-kit/data-grid-core` lints, type-checks, tests and builds against TanStack Table 9.2.4. Tasks 1–2 were planned and executed first, against documentation only as far as the install; everything from Task 3 is planned against the installed API recorded in `api-notes.md`.

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
- From Task 2 until Task 13 the package does not compile, and the repository does not build until
  PR 2: `pnpm run ci`, `pnpm build` and `pnpm --filter @ez-kit/data-grid-core typecheck` are red by
  design (design §7). No task before Task 13 may use any of those three as its criterion, or run
  any command that depends on a successful build. Each task states a criterion that is checkable
  anyway — see "Working on a tree that does not build" below.
- **Design §7's PR 3 row is re-scoped:** the core-side half of design §5 (`sortFn`, logical column
  pinning) moves into PR 1 as Task 4, because PR 1's own criterion cannot be met without it. The
  reasoning is in the PR 1 remainder's orientation section; PR 3 keeps everything outside core.

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

Tasks 3–13 finish design §7 row "1. Core engine". They all land on `integration/tanstack-v9`,
which **stays local** — pushing it and opening any PR is the human's call, so no task below
contains a `git push` or a `gh pr create` step.

### Working on a tree that does not build

Design §7 accepts that the repository is red from Task 2 until PR 2. `pnpm run ci`,
`pnpm build` and `pnpm --filter @ez-kit/data-grid-core typecheck` therefore cannot be a
task's criterion until Task 13. Three checks work while the tree is broken, and every task
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

- **Per-file lint.** `eslint` runs on a file list without the package compiling:
  `pnpm --filter @ez-kit/data-grid-core exec eslint <files> --max-warnings=0`.
- **Targeted vitest.** Vitest transpiles per module graph and does **not** typecheck, so a test
  runs as long as the modules it imports are runtime-valid. Which tests are runnable when is not
  uniform, and each task says which it runs:
  - **From Task 3**, `features/entry.ts` imports nothing but `table-core`, so a smoke test over it
    runs.
  - **From Task 4**, `column-state.test.ts`, `system-columns.test.ts` and `map-columns.test.ts`
    run — verified: none of the three imports `createTable`.
  - **From Task 5**, `create-table-options.test.ts` runs (after change 1 the resolver imports no
    feature module).
  - **From Task 6**, everything that goes through `createTable` becomes reachable. All seven
    feature test files do, which is why none of them can run before then.

Also record the package's total error count before starting, in the session scratchpad and never
in the repo, so a later task can tell a fix from a regression:

```bash
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -c 'error TS' > "$SCRATCH/tsc-baseline.txt"
```

A task is done when its stated criterion passes. "The monorepo gate is red" is never a reason
to skip a task's own criterion, and never a reason to claim one passed.

### Decisions taken here that the design left open

Recorded where the reader needs them; each is argued in the task that implements it.

1. **`draft` gets one atom set** (api-notes §4) — the three live axes are external atoms, the
   `applied` snapshot is an ordinary internal slice. Task 12.
2. **The draft atoms are created by the caller, not by `createTableOptions`.** `useTable` merges
   `tableOptions` into the table on **every render** (api-notes §5.2) and replaces `atoms`
   wholesale, so atoms built inside the options resolver would be new objects every render and
   the draft would reset on each keystroke. `createTableOptions` stays pure and takes them as an
   argument. Task 5 defines the parameter; Task 12 the factory.
3. **`ColumnMeta` stays a global declaration merge**, widened to v9's **three** type parameters,
   rather than moving to the `columnMeta` feature slot. Task 3.
4. **Non-feature config leaves TanStack options.** `rowActions`, row `pinning`, `virtualization`
   and `direction` are read only by the React layer; they move to a `grid` bag returned beside
   `options`, which deletes `row-actions.ts`'s global `declare module` outright. This is forced
   rather than chosen: its merge target, `TableOptionsResolved`, does not exist in v9. Task 5.
5. **`getInitialSnapshot` is deleted, not wrapped.** Neither PR-2 branch needs a core API:
   `table.initialState` is public and stable by reference (api-notes §4), so a PR 2 that keeps
   `useSyncExternalStore` writes `() => table.initialState` as its `getServerSnapshot` inline.
   Task 6.
6. **`table.getState()` gets no shim.** Reads become `table.store.state` (whole snapshot) or, from
   inside a feature, the accessor in decision 7.
7. **Feature state is reached through one shared accessor module, never through `table.atoms` /
   `table.baseAtoms` directly.** This is not a style preference. Inside a `TableFeature` hook the
   table is `Table<TFeatures, TData>` with `TFeatures` unresolved, so `Atoms<TFeatures>` and
   `BaseAtoms<TFeatures>` have **no provable key** and `table.atoms.editing.get()` fails with
   `TS2339` — the optional-chained spelling included. The `*_All` variants that
   `coreTablesFeature.types.d.ts:42-54` describes as "what `Table` uses so feature code can access
   any slice atom" are **not** what a feature receives; `Table_CoreProperties` declares the
   narrow ones, and that doc comment is stale. Upstream's own custom-feature skill reaches its
   slice through an explicit cast (`skills/custom-features/SKILL.md`, `readDensity`). One cast,
   written once, in a module that also encodes the ownership rule — see Task 7.

### The core-side vocabulary renames move into PR 1 (re-scoping design §7)

Design §7 puts §5 (`sortFn`, logical column pinning) in PR 3, and PR 1's criterion at
`--filter data-grid-core` green. Those two cannot both hold: `map-columns.ts:187` writes
`setIfDefined(result, 'sortingFn', …)` and `column-state.ts` writes `columnPinning: { left, right }`
into a `Partial<TableState>` whose `ColumnPinningState` is now `{ start, end }` — so core does not
type-check while either stands, and the pinning error surfaces inside Task 5's own owned-file
grep.

**Task 4 therefore takes the core-side half of design §5**, and PR 3 keeps everything outside
core: `react/react/src/utils/pin-styles.ts`, the literal `getIsPinned()` comparisons in both
kits, the `--dg-pin-*` CSS variables and both kits' shadow variables, the shadcn registry
payload, the docs, and the RTL e2e cases. This is a deliberate re-scoping of the design's PR 3
row, not drift, and there is no cost to React from it: React does not build during PR 1 either
way. A `left` ↔ `start` translation shim at the core boundary was considered and **rejected** —
a shim introduced to postpone a rename outlives the rename.

### Counts, measured against the tree rather than the design

| Thing                                    | Design says     | Counted today                                                                                                                                                                                                                                                         |
| ---------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getState()` in core source              | 26              | **26 lines / 27 occurrences** in 7 files. `create-table.ts` 4, creating 6, editing 6, deleting 5, draft 3, `row-ordering-feature.ts` 1, `row-ordering.ts` 1 — the last being a **whole-snapshot** read (`const state = table.getState()` at `:98`), not a slice read. |
| `getState()` in core tests               | (153 repo-wide) | **113 lines / 115 occurrences** in 7 files, the seventh being `system-columns/system-column-def.test.ts` (1 site, owned by Task 6).                                                                                                                                   |
| `getState()` in react source             | 20              | **17.** Out of PR 1's scope; recorded so the PR 2 pass does not inherit the design's figure.                                                                                                                                                                          |
| custom features                          | 7               | **7** ✓ — plus 9 `declare module '@tanstack/table-core'` blocks in core source: the seven features, `row-actions.ts` (an eighth with no feature behind it, deleted in Task 5) and `column/types.ts`'s `ColumnMeta` (Task 3).                                          |
| stock features to re-export              | 16              | **17** (api-notes §2 — `cellSpanningFeature`).                                                                                                                                                                                                                        |
| core generic types to thread `TFeatures` | ~23             | **21** of the 39 exported declarations generic over `TRow`/`TData`; the other 18 name no table-core type and keep their parameters. Task 3 lists both sets.                                                                                                           |

### Files (PR 1 remainder)

| File                                             | Responsibility                                                                                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/data-grid/core/src/features/entry.ts`  | **New (Task 3).** The `@ez-kit/data-grid-core/features` payload: stock re-exports, row-model factories, `tableFeatures`, and our seven as they are ported.                              |
| `packages/data-grid/core/tsup.config.ts`         | **New (Task 3).** Two named entries; replaces the inline `tsup src/index.ts` script.                                                                                                    |
| `packages/data-grid/core/src/feature-state/`     | **New (Task 7).** `readOwnSlice` / `readForeignSlice` / `writeOwnSlice` / `writeForeignSlice` — the one place a feature touches state, and the one place the ownership rule is written. |
| `packages/data-grid/core/src/store/**`           | **Deleted (Task 6).** The hand-written store, in full.                                                                                                                                  |
| `packages/data-grid/core/src/features/*/`\*`.ts` | **Modified (Tasks 8–12).** Each feature onto the v9 plugin API, with its own `*_FeatureMap` merges.                                                                                     |

---

### Task 3: The feature-composition surface — `/features` entry point and `TFeatures` on the public types

**Branch:** `integration/tanstack-v9` (already current).

**Files:**

- Create: `packages/data-grid/core/src/features/entry.ts`
- Create: `packages/data-grid/core/src/features/entry.test.ts`
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
// our seven are appended here by Tasks 8–12, and `allDataGridFeatures` by Task 13.
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
	/* …, narrowed in Task 6 */
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

Per "Working on a tree that does not build" above. This number only ever has to come down by
Task 13; it is recorded so a later task can tell a fix from a regression.

- [ ] **Step 2: Create the entry module**

Create `packages/data-grid/core/src/features/entry.ts` with the re-exports in the Interfaces
block above, each on its own `export { … } from '@tanstack/table-core'` line so `import/order`
and the alphabetical rule are satisfiable.

Name the file `entry.ts`, **not** `index.ts`. `src/features/` is a directory of feature folders,
and a barrel at `src/features/index.ts` would make `import … from '../features'` resolve to
everything — one careless intra-package import would pull all seven features into any module,
which is the reachability the tree-shaking test added in PR 4 exists to prevent. Nothing inside
the package imports from this file; feature modules keep importing each other by their own paths
(`'../features/creating'`).

That rule has one deliberate exception, added in Task 12: `create-table.ts` imports
`createDraftAtoms` from `./features/deferred-apply` directly. It is one named function from one
feature module, not the barrel, and Task 13 Step 4 accounts for what it costs the main entry's
bundle.

- [ ] **Step 3: Write the smoke test**

Cheap, runnable here, and it catches this task's actual failure mode — a re-export spelled with a
name that exists but is the wrong one, which lint cannot see:

```ts
// src/features/entry.test.ts
import { describe, expect, it } from 'vitest'

import * as features from './entry'

const STOCK = [
	'cellSelectionFeature',
	'cellSpanningFeature',
	'columnFacetingFeature',
	'columnFilteringFeature',
	'columnGroupingFeature',
	'columnOrderingFeature',
	'columnPinningFeature',
	'columnResizingFeature',
	'columnSizingFeature',
	'columnVisibilityFeature',
	'globalFilteringFeature',
	'rowAggregationFeature',
	'rowExpandingFeature',
	'rowPaginationFeature',
	'rowPinningFeature',
	'rowSelectionFeature',
	'rowSortingFeature',
] as const

describe('@ez-kit/data-grid-core/features', () => {
	it('re-exports all 17 stock features', () => {
		for (const name of STOCK) expect(features[name], name).toBeDefined()
		expect(Object.keys(features).filter((k) => k.endsWith('Feature'))).toHaveLength(STOCK.length)
	})

	it('re-exports the nine row-model factories as callable factories', () => {
		expect(typeof features.createSortedRowModel()).toBe('function')
		expect(typeof features.createCoreRowModel()).toBe('function')
	})

	it('does not re-export coreReactivityFeature — useTable and createTable each inject their own', () => {
		expect(features).not.toHaveProperty('coreReactivityFeature')
	})
})
```

The length assertion is what makes the first case non-vacuous: it fails on a missing export and
on a surplus one, so Tasks 8–12 must update it as they append, which is the point.

- [ ] **Step 4: Give the package a second build entry**

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
limit (`"6 KB"`) with a comment that it is re-measured in Task 13 after the first green build —
guessing a number now and calling it a budget would be a budget that measures nothing.

- [ ] **Step 5: Add `@tanstack/store` as a direct dependency**

```bash
pnpm --filter @ez-kit/data-grid-core add @tanstack/store@0.11.1
```

Task 12 imports `createAtom` and `batch` from it. Pin the version `react-table@9.2.4` already
resolves (api-notes §0) so the workspace does not gain a third `@tanstack/store` copy — atoms
from two copies are not the same module instance.

- [ ] **Step 6: Thread `TFeatures` through the 21 declarations that need it**

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

The parameter list is copied from the upstream declaration at `dist/types/ColumnDef.d.ts:17`.
**Arity is the load-bearing part** — TypeScript rejects a merge whose parameter _count_ differs
(`TS2428`), which is what would happen to today's two-parameter version. The `in out` variance
annotations and the `CellData` default are copied for fidelity and readability, not because
omitting them would fail; a merge without them compiles.

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

- [ ] **Step 7: Export the new names from the package index**

`src/index.ts` gains `export type { TableFeatures } from '@tanstack/table-core'` and keeps its
existing re-exports. It does **not** re-export the feature values — those are the `/features`
entry's whole reason to exist, and duplicating them on the main index would make every feature
reachable from `@ez-kit/data-grid-core`, undoing the bundle win before it is measured.

Verify:

```bash
grep -nE "rowSortingFeature|stockFeatures|createSortedRowModel" packages/data-grid/core/src/index.ts
```

Expected: no output.

- [ ] **Step 8: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/entry.test.ts
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/(features/entry|column/types|types)\.ts\(' || echo 'OWNED FILES CLEAN'
pnpm --filter @ez-kit/data-grid-core exec eslint \
  src/features/entry.ts src/features/entry.test.ts src/types.ts src/column/types.ts \
  src/index.ts tsup.config.ts --max-warnings=0
```

Expected: the smoke test green, `OWNED FILES CLEAN`, lint silent. The package total goes **up**
in this task and that is expected and knowingly introduced: every call site of `TableConfig`,
`DataTable` and `TanStackColumnDef` now passes one argument too few. Tasks 4–12 consume that
debt; Task 13 clears it.

- [ ] **Step 9: Commit**

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

### Task 4: The core-side vocabulary renames — `sortFn`, and logical column pinning

Design §7 assigns §5 to PR 3. The core-side half moves here instead, because PR 1's own criterion
cannot be met without it — see "The core-side vocabulary renames move into PR 1" above, which
records the re-scoping and its reason. Everything outside core stays in PR 3.

It runs before `createTableOptions` (Task 5) so that Task 5's owned-file grep is achievable: the
`ColumnPinningState` mismatch surfaces inside `create-table-options.ts` otherwise, with no
instruction covering it.

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/column/map-columns/map-columns.ts` and its test
- Modify: `packages/data-grid/core/src/column-state/column-state.ts` and its test
- Modify: `packages/data-grid/core/src/system-columns/system-columns.ts` and its test
- Modify: `packages/data-grid/core/src/column/types.ts` (`ColumnPinSide`)
- Modify: `packages/data-grid/core/src/column/normalize.ts`
- Modify: `packages/data-grid/core/src/types.ts`
- Modify: `packages/data-grid/core/src/create-table/create-table-options.ts` (the pinning reads)

**Interfaces:**

Produces, for Task 5 and for PR 3:

```ts
// column/types.ts — the public vocabulary
/**
 * Which edge a column is pinned to. **Logical**, like `align`: `'start'` is the left edge in
 * LTR and the right edge in RTL. v9 removed the physical `'left'` / `'right'` everywhere, so
 * the AGENTS.md entry that recorded pinning as physical is rewritten rather than defended —
 * design §D2 and §5. Row pinning stays `top` / `bottom`: a vertical axis does not flip.
 */
export const ColumnPinSide = { Start: 'start', End: 'end' } as const
export type ColumnPinSide = (typeof ColumnPinSide)[keyof typeof ColumnPinSide]

// column-state/column-state.ts
export type ColumnInvariants = {
	readonly forcedStart: readonly string[]
	readonly forcedEnd: readonly string[]
	readonly alwaysVisible: readonly string[]
}
export function mergePinningSeed(
	seed: { start: readonly string[]; end: readonly string[] },
	user?: Partial<ColumnPinningState>,
): ColumnPinningState

// system-columns/system-columns.ts
export function extractPinningState<TRow extends object>(
	columns: TanStackColumnDef<TFeatures, TRow>[],
): { start: string[]; end: string[] }
```

**The whole change, as a list.** Every item is a rename; none is a logic change. If a diff hunk
changes what a branch decides rather than what it is spelled, it is a mistake.

1. `map-columns.ts:187` — `setIfDefined(result, 'sortingFn', sorting.fn)` → `'sortFn'`, and the
   doc comment at `:82` that names it. `map-columns.test.ts:41-49` asserts on `result[0]?.sortingFn`
   twice; both become `sortFn`. (api-notes §6 confirms `sortFn` on the column def and that no
   `sortingFn` spelling survives in `dist`.)
2. `column/types.ts` — `ColumnPinSide.Left/Right` → `Start/End` with values `'start'` / `'end'`,
   and the doc comment rewritten per the Interfaces block. `ColumnPinningDef.side` /
   `.initialSide` keep their names and now take the new values.
3. `column/normalize.ts:13` — the comment's `pinning: 'left'` example.
4. `column-state.ts` — `forcedLeft` / `forcedRight` → `forcedStart` / `forcedEnd`;
   `mergePinningSeed`'s `seed.left` / `.right` and `user.left` / `.right` → `.start` / `.end`;
   `enforceColumnInvariants`'s two `enforcePinnedSide` calls and the `nextPinning.left` /
   `.right` writes. The comment at `:63-64` explaining why unmentioned seeds go in front or last
   keeps its meaning and gains the new words.
5. `system-columns.ts` — `extractPinningState` returns `{ start, end }`; its
   `position === ColumnPinSide.Left` test becomes `.Start`.
6. `create-table-options.ts:157, 368, 412` — `const { left: pinnedLeft, right: pinnedRight }`,
   the `mergePinningSeed({ left, right }, …)` call and the `ColumnPinningState` import site.
7. `types.ts:641` — the `columnPinning` `onChange` payload type. It already names table-core's
   `ColumnPinningState`, so the type is right automatically; what changes is the surrounding
   prose and any `left`/`right` example in the doc comment.

**What this task does NOT touch.** Row pinning (`RowPinningConfig`, `data-pinned="top"|"bottom"`)
— a vertical axis has no logical names, and design §5 says so explicitly. `columnResizeDirection`
— api-notes §6 confirms it stays `'ltr' | 'rtl'` upstream. And anything outside
`packages/data-grid/core`.

- [ ] **Step 1: Run the three affected tests first, to fix the baseline**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run \
  src/column/map-columns src/column-state src/system-columns/system-columns.test.ts
```

Expected: all green **before** the rename. None of these three imports `createTable` (verified),
so they are the only core tests that run at this point, and they are exactly the ones this task
touches. If any is already red, that is a Task 3 regression and it is fixed before continuing.

- [ ] **Step 2: Apply the seven renames**

Mechanically, per the list. Do not use a blanket `sed`: `column-state.ts` contains the English
words "left" and "right" in prose (`:62`, `:110`) that must not change, and `column/types.ts`
uses "left edge" / "right edge" in the `align` doc comment, which stays because `align` is
already logical and its comment is explaining exactly that.

- [ ] **Step 3: Update the three test files**

`map-columns.test.ts` (2 assertions), `column-state.test.ts` (the `{left,right}` fixtures and
`forcedLeft`/`forcedRight` expectations), `system-columns.test.ts` (the `extractPinningState`
result shape).

- [ ] **Step 4: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run \
  src/column/map-columns src/column-state src/system-columns/system-columns.test.ts
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/(column/map-columns/|column-state/|system-columns/system-columns\.ts|column/normalize)' \
  || echo 'OWNED FILES CLEAN'
git grep -n "sortingFn\|forcedLeft\|forcedRight\|ColumnPinSide.Left\|ColumnPinSide.Right" -- packages/data-grid/core/src
```

Expected: tests green, `OWNED FILES CLEAN`, and the final grep silent.

`system-column-def.test.ts` also names pinning but imports `createTable`, so it cannot run here;
Task 6 owns it.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/core/src/
git commit -m "feat(data-grid-core)!: logical column pinning and sortFn inside core

v9 removed the physical left/right pinning vocabulary, so ColumnPinSide becomes
start/end and every core-side carrier follows: ColumnInvariants, mergePinningSeed,
enforceColumnInvariants, extractPinningState. sortingFn becomes sortFn on the
column def.

The design scheduled this for the pinning PR, but core cannot type-check while
it stands, so the core half moves forward. The React adapter, both kits, the CSS
variables and the registry payload are unchanged and stay in that PR.

Row pinning keeps top/bottom: a vertical axis does not flip under RTL."
```

---

### Task 5: `createTableOptions` onto the v9 option shape

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/create-table/create-table-options.ts` and its test
- Modify: `packages/data-grid/core/src/features/row-actions/row-actions.ts` (delete its `declare module`)

**Interfaces:**

Consumes from Tasks 3–4: `TableConfig<TFeatures, TRow>`, the `/features` entry, `@tanstack/store`,
the `start` / `end` pinning vocabulary.

Produces, for Tasks 6 and 12 and for PR 2:

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
	return { options, deferred, grid }
}
```

**The return type shrinks from five members to three.** `initialState` is folded into
`options.initialState`, which is where v9 reads it. `columnInvariants` and `onChange` lose their
external consumer when the funnel dies (Task 6) and become internal to this function — see
change 7 below, which is where they now do their work. `deferred` survives because Task 12's
`createTable` needs it to decide whether to build draft atoms.

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
3. **The table-level `sortingFns` registry moves to the feature set.** api-notes §1 shows
   `sortFns` is a **feature slot**, not a table option, so a named comparator registry is
   something the consumer puts in `tableFeatures({ sortFns: … })`. `sorting.fns` stays in our
   config as the ergonomic spelling and is **warned about in development** when
   `config.features.sortFns` is absent — it cannot be forwarded, because options cannot reach
   the feature set. (The column-level `sortFn` rename was Task 4.)
4. **`columnResizeDirection` becomes conditional.** It is an option of `columnResizingFeature`
   and does not exist without it. `config.direction` still reaches the React layer through
   `grid.direction` unconditionally — it is a fact about the grid, which is why it was set
   unconditionally before.
5. **`rowActions`, `pinning`, `virtualization` leave `options` for `grid`**, and
   `row-actions.ts`'s `declare module '@tanstack/table-core'` block is deleted with them. Its
   merge target, `TableOptionsResolved`, does not exist in v9, so this is a hard compile error
   from the moment the bump resolves — not a tidy-up. The other half of the leak design §2 names
   (per-feature `editing` / `creating` / `deleting` / `rowOrdering` / `draft` options) moves to
   `TableOptions_FeatureMap` in Tasks 8–12, so those five keys stay on `options` and are simply
   untyped until their feature's task lands.
6. **`atoms` is passed through**, spread conditionally (`exactOptionalPropertyTypes`):
   `...(externals?.atoms !== undefined ? { atoms: externals.atoms } : {})`.
7. **This task owns the `on<Slice>Change` wiring, unconditionally.** No later task adds it, and
   Task 6 does not check whether it was done. Each of the eleven per-feature callbacks becomes an
   upstream `on<Slice>Change` option built here, and each handler does three things in order:
   enforce the column invariants, write through the owning atom, then call the consumer's
   callback.

   ```ts
   const onColumnPinningChange = (updater: Updater<ColumnPinningState>): void => {
   	const prev = table.atoms.columnPinning.get() // through the accessor — Task 7
   	const next = enforceColumnInvariants({ columnPinning: functionalUpdate(updater, prev) }, columnInvariants)
   	makeStateUpdater('columnPinning', table)(next.columnPinning!)
   	config.pinning?.column?.onChange?.(next.columnPinning!)
   }
   ```

   Two notes carried over verbatim from the funnel's comments, because both are still true:
   - **Selection.** Supplying `onRowSelectionChange` _replaces_ the built-in writer — verified at
     `dist/features/row-selection/rowSelectionFeature.utils.js:29-31`, where `table_setRowSelection`
     does nothing but call the option. So every handler we supply must write the state itself
     (`makeStateUpdater`) before invoking the consumer's callback, or the feature stops working.
     This is what the funnel's comment warned about; in v9 it applies to all eleven, not just
     selection.
   - **Resizing.** Forward `onColumnSizingChange` only. `columnResizing` (v8's `columnSizingInfo`)
     churns on every pointer move mid-drag.

   `enforceColumnInvariants` is what the funnel ran on every write, and these handlers are where
   that job now lives. Only `onColumnPinningChange` and `onColumnVisibilityChange` need it —
   those are the two slices an invariant constrains.

   The handlers close over `table`, which does not exist while options are being built. Build
   them in `getDefaultTableOptions` instead, which receives the table (api-notes §3) — or, if
   that proves awkward for a per-instance config, have `createTable` bind them after
   construction via `setOptions`. **Decide this in the task and write down which**, because Task
   6 reads the result.

- [ ] **Step 1: Add the registered-vs-configured development guard**

`sorting: {…}` without `rowSortingFeature` is a compile error under Task 3, but only when the
call site is typed — a config assembled through a cast or read from JSON is not. Add one dev-only
check near the top of the function, beside the existing `warnUnreachableSeed` block:

```ts
const REQUIRED_FEATURE = {
	sorting: 'rowSortingFeature',
	filtering: 'columnFilteringFeature',
	globalFiltering: 'globalFilteringFeature',
	pagination: 'rowPaginationFeature',
	selection: 'rowSelectionFeature',
	visibility: 'columnVisibilityFeature',
	expanding: 'rowExpandingFeature',
	resizing: 'columnResizingFeature',
} as const satisfies Partial<Record<keyof TableConfig<TableFeatures, object>, string>>

if (IS_DEV) {
	for (const [option, feature] of Object.entries(REQUIRED_FEATURE)) {
		const value = (config as Record<string, unknown>)[option]
		if (isFeatureEnabled(value as FeatureOption<object>) && !(feature in config.features)) {
			console.warn(
				`[data-grid] \`${option}\` is configured, but \`${feature}\` is not in \`features\` — ` +
					`the option has no effect. Add it to your \`tableFeatures({ … })\` call.`,
			)
		}
	}
}
```

One cast, to `Record<string, unknown>`, at the point where a string key indexes a typed object —
which is the honest description of what is happening. Do **not** write `as never`: it is
`any`-equivalent for argument positions, it disables exactly the check the guard exists to
perform, and it ships in a package linted at `--max-warnings=0` under `typescript-eslint` strict.

Note `resizing` needs **two** features: `columnResizingFeature` requires `columnSizingFeature`
(`FeatureSlotPrereqs`, api-notes §1). Upstream turns the missing prerequisite into a string
literal type at the key, so `tableFeatures` already catches it at compile time — do not duplicate
that check here; warn only about `columnResizingFeature` itself.

- [ ] **Step 2: Apply changes 1–7 above**

Move code rather than rewriting it wherever the logic is unchanged — the gates, the invariants,
the seed merging and every comment on them are untouched by v9, and a rewrite would put behaviour
changes where a reviewer is not looking for them.

- [ ] **Step 3: Update the existing unit test**

`create-table-options.test.ts` (Task 1) asserts `options.getSortedRowModel` is a function when
sorting is on. That assertion is now wrong by design. Replace it with the v9 statement of the
same intent — and note the positive half, which the absence assertions alone do not cover:

```ts
it('gates sorting at the table level rather than by attaching a row model', () => {
	const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() })
	const on = createTableOptions({ features, data: rows, columns, sorting: true })
	const off = createTableOptions({ features, data: rows, columns })

	// positive: the resolver produces a usable v9 option object
	expect(on.options.features).toBe(features)
	expect(on.options.data).toBe(rows)
	expect(on.options.columns.map((c) => c.id ?? c.accessorKey)).toEqual(['name', 'age'])
	expect(on.options.initialState).toBeDefined()
	expect(typeof on.options.onSortingChange).toBe('function')

	// negative: the row model is a feature slot now, not an option
	expect(on.options).not.toHaveProperty('getSortedRowModel')
	expect(on.options.enableSorting).toBeUndefined()
	expect(off.options.enableSorting).toBe(false)
})
```

The first block is what stops the test passing against a resolver that returns `{}`. Every other
case in the file gains a `features` field in its config literal; the purity case and the
draft-throw case keep their assertions unchanged.

Add one case for the `grid` bag, since nothing else asserts it exists:

```ts
it('returns non-TanStack config in `grid`, not in `options`', () => {
	const { options, grid } = createTableOptions({ features, data: rows, columns, direction: 'rtl' })
	expect(grid.direction).toBe('rtl')
	expect(grid.rowActions.placement).toBe(RowActionsPlacement.Inline)
	expect(options).not.toHaveProperty('rowActions')
	expect(options).not.toHaveProperty('virtualization')
})
```

- [ ] **Step 4: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run src/create-table/create-table-options.test.ts
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/(create-table/create-table-options|features/row-actions/row-actions)\.ts\(' \
  || echo 'OWNED FILES CLEAN'
```

Expected: the test file green, `OWNED FILES CLEAN`. `createTableOptions` imports no feature module
after change 1, so nothing broken is in its graph.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/core/src/
git commit -m "feat(data-grid-core)!: resolve v9 table options instead of v8 ones

Row models are feature slots in v9, so the getXRowModel attachments go and the
enableX gates stay — config gates behaviour, not presence. The sortingFns
registry becomes the sortFns feature slot. rowActions, row pinning and
virtualization move out of TanStack options into a grid bag, which removes
row-actions' augmentation of TableOptionsResolved — a type v9 does not have.

The eleven per-feature callbacks become on<Slice>Change options. Each writes the
state itself before calling the consumer: supplying the option replaces the
built-in writer, so a handler that only forwards would stop the feature working."
```

---

### Task 6: `createTable` on `constructTable`; delete the store and the outward funnel

This is where the lights come back on: after it, core constructs a real v9 table and every test
that goes through `createTable` becomes reachable.

**It is the largest task in PR 1 — roughly 1600 lines touched — and it has no seam.** The
production half (`create-table.ts`, 237 lines → ~25) has no runnable criterion without its test
half, and the test half is meaningless without the production half; the only inner boundary,
`create-table-resizing.test.ts` at 77 lines, is too small to be a task. The size is the work
being atomic, not the task being unfocused. A reviewer should read it as one change: the table
stops being ours and starts being v9's.

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/create-table/create-table.ts`
- Modify: `packages/data-grid/core/src/create-table/index.ts`
- Modify: `packages/data-grid/core/src/types.ts` (`DataTable`)
- Delete: `packages/data-grid/core/src/store/store.ts`, `packages/data-grid/core/src/store/index.ts`
- Modify: `packages/data-grid/core/src/create-table/create-table.test.ts` (18 `getState()` sites)
- Modify: `packages/data-grid/core/src/create-table/create-table-resizing.test.ts`
- Modify: `packages/data-grid/core/src/system-columns/system-column-def.test.ts` (1 `getState()` site)

**Interfaces:**

Consumes from Task 5: `createTableOptions(config, externals?)` returning `{ options, deferred, grid }`,
and whichever of the two `on<Slice>Change` binding routes Task 5 chose.

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
`prependData` move to `infiniteFeature` in Task 8 and do not exist between these two tasks.

**What PR 2 gets instead, so it is not blocked.** Whole-state observation is
`table.store.subscribe(fn)`; the current snapshot is `table.store.state`; a slice is
`table.atoms.<slice>.get()` (from outside a feature `TFeatures` is resolved, so this compiles —
decision 7 applies only inside feature hooks); a server snapshot is `() => table.initialState`.
Controlled state is `options.state.<slice>` + `on<Slice>Change`, which Task 5 resolves — the
one-way mirror `syncControlledState` performed is upstream's job in v9
(`table_syncExternalStateToBaseAtoms`, called from `constructTable`). No core API is needed for
any of it, under either PR-2 branch.

**The new body.** ~25 lines where it was 237:

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

**This body is provisional in one respect, stated here so it does not read as final:** Task 12
replaces the `createTableOptions(config)` call with a three-statement block that builds the draft
atoms first and passes them through `externals`. Nothing else in it changes.

Gone with it: `createStore`, the `ref` wrapper, `toOutward`, `outwardUnchanged`, `syncApplied`,
`onStateChange` and its eleven-branch dispatch, `DRAFT_AXES`, the second `createStore` from
`table.initialState`, and the `setOptions` call that switched to fully-controlled mode.

- [ ] **Step 1: Rewrite `create-table.ts` and delete `src/store/`**

```bash
git rm -r packages/data-grid/core/src/store
```

Then remove `SetStateOptions` from `src/types.ts`'s imports, along with `syncControlledState`
whose signature named it.

- [ ] **Step 2: Narrow `DataTable`**

Per the Interfaces block. Keep the doc comment on `setData`; drop the rest with the members they
described.

- [ ] **Step 3: Migrate the three test files**

`create-table.test.ts`, `create-table-resizing.test.ts`, `system-column-def.test.ts`. Every config
literal gains `features: tableFeatures({ … })` naming exactly the features that test exercises —
itself worth doing carefully, because these literals become the worked examples PR 4's docs are
written from. The 19 `getState()` reads become `table.store.state`, or
`table.atoms.<slice>.get()` where the assertion is about one slice.

For assertions on `subscribe` / `getSnapshot` / `syncControlledState`: rewrite each against
`table.store.subscribe` / `table.store.state` / `options.state`. Where an assertion tested the
deleted plumbing rather than a behaviour — the `silent` / `notify` protocol is the clear case —
delete it, and **list each deleted assertion by name in the commit body**. "Deleted with a note"
is not enough at 1283 lines: a reviewer cannot otherwise distinguish a deletion-for-plumbing from
a deletion-for-inconvenience, and that distinction is the whole review.

Do **not** touch the feature test files here; they belong to Tasks 8–12 and will still fail.

- [ ] **Step 4: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run \
  src/create-table src/system-columns src/column-state src/column/map-columns
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/(create-table/|types\.ts|system-columns/system-column-def)' || echo 'OWNED FILES CLEAN'
```

Expected: all green. A v9 table constructs, sorts, filters, paginates, resizes and pins under a
stock-only feature set, and Task 4's three test files still pass.

- [ ] **Step 5: Commit**

```bash
git add -A packages/data-grid/core/src/
git commit -m "feat(data-grid-core)!: construct the v9 table and delete the hand-written store

createTable is now constructTable(createTableOptions(config)). src/store/** is
gone in full, and with it the onStateChange funnel, toOutward, outwardUnchanged
and syncApplied — v9 owns state in atoms and emits per slice.

DataTable drops subscribe, getSnapshot, getInitialSnapshot, syncControlledState
and notifyStateSubscribers: every one existed only to marry that store to
useSyncExternalStore. Readers use table.store / table.atoms.

Assertions deleted with the plumbing they covered: <list each by name>."
```

---

### Task 7: The feature state accessor — one cast, and the ownership rule made mechanical

Every task from here writes feature code, and feature code cannot touch `table.atoms` or
`table.baseAtoms` directly. This task builds the one module that can, and makes the
own-slice / foreign-slice distinction a matter of which function you call.

**Branch:** `integration/tanstack-v9`.

**Files:**

- Create: `packages/data-grid/core/src/feature-state/feature-state.ts`
- Create: `packages/data-grid/core/src/feature-state/feature-state.test.ts`
- Create: `packages/data-grid/core/src/feature-state/index.ts`

**Interfaces:**

Consumed by Tasks 8–12; every state read and write in a ported feature goes through one of these
four and through nothing else.

```ts
import type { TableState_All, Updater } from '@tanstack/table-core'

/** Any table, seen from inside a feature hook — `TFeatures` is unresolved there. */
type AnyTable = { readonly options: { readonly atoms?: object | undefined }; readonly baseAtoms: object }

type SliceKey = keyof TableState_All
type SliceOf<K extends SliceKey> = Exclude<TableState_All[K], undefined>

/**
 * Read a slice **this feature declares**. The feature's own `getInitialState` seeded it, so the
 * atom is guaranteed to exist and the return type is not optional.
 */
export function readOwnSlice<K extends SliceKey>(table: AnyTable, key: K): SliceOf<K>

/**
 * Read a slice **another feature declares**. It may not be registered on this table, so the
 * caller must handle `undefined` — `readForeignSlice(table, 'rowSelection') ?? {}`.
 */
export function readForeignSlice<K extends SliceKey>(table: AnyTable, key: K): SliceOf<K> | undefined

/** Write a slice **this feature declares**. Throws in development if the slice is absent. */
export function writeOwnSlice<K extends SliceKey>(table: AnyTable, key: K, updater: Updater<SliceOf<K>>): void

/**
 * Write a slice **another feature declares**, or do nothing when that feature is not registered.
 */
export function writeForeignSlice<K extends SliceKey>(table: AnyTable, key: K, updater: Updater<SliceOf<K>>): void
```

**Why four functions and not one.** Both writers are built on upstream's `makeStateUpdater`, so
the _mechanism_ is shared — but two things differ, and one of them is not documentary.

- **The ownership rule.** A feature must never write a foreign slice through `baseAtoms`: when
  the consumer supplied `atoms.<slice>`, `baseAtoms.<slice>` is not the owning atom and the write
  goes nowhere, silently. `makeStateUpdater` resolves that correctly
  (`(instance.options.atoms?.[key] ?? instance.baseAtoms[key]).set(…)`, `dist/utils.js:69-73`), so
  routing both through it is what makes the rule hold. Having the rule appear as a _name at the
  call site_ is what makes it reviewable: `writeForeignSlice(table, 'rowSelection', …)` says what
  it is doing, and a reviewer who sees `writeOwnSlice(table, 'rowSelection', …)` inside
  `deletingFeature` knows it is wrong without reading the feature's declarations.
- **Presence.** This is the mechanical difference. `makeStateUpdater` does
  `instance.baseAtoms[key].set(…)` with no guard, so on an unregistered slice it throws
  `TypeError: Cannot read properties of undefined`. For an own slice that throw is correct — it
  means the feature's `getInitialState` failed to seed, which is a bug. For a foreign slice it is
  wrong: the feature is legitimately optional and must no-op. So `writeForeignSlice` checks
  presence and `writeOwnSlice` does not, and the same asymmetry gives the two readers different
  return types.

**The cast, written once.** `Atoms<TFeatures>` and `BaseAtoms<TFeatures>` have no provable key
while `TFeatures` is unresolved, which is why `table.atoms.editing.get()` fails with `TS2339`
inside a feature. Upstream's own custom-feature skill solves it with an inline cast
(`skills/custom-features/SKILL.md`, `readDensity`); this module is that cast, hoisted:

```ts
type AtomBag = {
	atoms: Record<string, { get: () => unknown } | undefined>
	baseAtoms: Record<string, { set: (u: unknown) => void } | undefined>
	options: { atoms?: Record<string, unknown> | undefined }
}

const bag = (table: AnyTable): AtomBag => table as unknown as AtomBag

export function readForeignSlice<K extends SliceKey>(table: AnyTable, key: K): SliceOf<K> | undefined {
	return bag(table).atoms[key]?.get() as SliceOf<K> | undefined
}

export function readOwnSlice<K extends SliceKey>(table: AnyTable, key: K): SliceOf<K> {
	const atom = bag(table).atoms[key]
	if (atom === undefined) {
		throw new Error(`[data-grid] state slice "${key}" is missing — its feature did not seed getInitialState.`)
	}
	return atom.get() as SliceOf<K>
}

export function writeOwnSlice<K extends SliceKey>(table: AnyTable, key: K, updater: Updater<SliceOf<K>>): void {
	makeStateUpdater(key, table)(updater as never)
}

export function writeForeignSlice<K extends SliceKey>(table: AnyTable, key: K, updater: Updater<SliceOf<K>>): void {
	if (bag(table).baseAtoms[key] === undefined) return
	makeStateUpdater(key, table)(updater as never)
}
```

The `as never` on `makeStateUpdater`'s argument is the one place a cast of that kind is
acceptable in this package, and it is not `any`-laundering: `makeStateUpdater`'s own declaration
types its updater as `Updater<TableState<any>[…]>`, so the type information is already gone
upstream of us. Our signature restores it for every caller. Put the `eslint-disable` for it here,
with that sentence as the comment, and nowhere else.

**Reading from outside a feature is unaffected.** A consumer, a test, or the React adapter has
`TFeatures` resolved, so `table.atoms.sorting.get()` compiles there and is the right thing to
write. This module is for feature hooks only; say so in its file header.

- [ ] **Step 1: Write the failing tests first**

Against a real constructed table — `createTable` works from Task 6, and a stock feature set gives
real slices to read and write:

```ts
// src/feature-state/feature-state.test.ts
import { createAtom } from '@tanstack/store'
import { rowSelectionFeature, rowSortingFeature, tableFeatures } from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { createTable } from '../create-table'

import { readForeignSlice, readOwnSlice, writeForeignSlice, writeOwnSlice } from './feature-state'

const columns = [{ accessorKey: 'name' as const }]
const data = [{ name: 'Ada' }]

describe('feature-state', () => {
	it('reads and writes a registered slice', () => {
		const table = createTable({ features: tableFeatures({ rowSortingFeature }), data, columns, sorting: true })
		expect(readOwnSlice(table, 'sorting')).toEqual([])
		writeOwnSlice(table, 'sorting', [{ id: 'name', desc: true }])
		expect(readOwnSlice(table, 'sorting')).toEqual([{ id: 'name', desc: true }])
	})

	it('readForeignSlice returns undefined for an unregistered slice, readOwnSlice throws', () => {
		const table = createTable({ features: tableFeatures({ rowSortingFeature }), data, columns })
		expect(readForeignSlice(table, 'rowSelection')).toBeUndefined()
		expect(() => readOwnSlice(table, 'rowSelection')).toThrow(/rowSelection/)
	})

	it('writeForeignSlice is a no-op for an unregistered slice', () => {
		const table = createTable({ features: tableFeatures({ rowSortingFeature }), data, columns })
		expect(() => {
			writeForeignSlice(table, 'rowSelection', {})
		}).not.toThrow()
	})

	// The rule this module exists to enforce. baseAtoms is NOT the owning atom when the
	// consumer supplied one, so a write that reached for it directly would go nowhere.
	it('writeForeignSlice writes through a consumer-supplied external atom', () => {
		const external = createAtom<Record<string, boolean>>({ a: true })
		const features = tableFeatures({ rowSortingFeature, rowSelectionFeature })
		const table = createTable({ features, data, columns, selection: true, atoms: { rowSelection: external } })

		writeForeignSlice(table, 'rowSelection', {})

		expect(external.get()).toEqual({})
		expect(readForeignSlice(table, 'rowSelection')).toEqual({})
	})
})
```

The last case is the one that matters: it is the property Tasks 10 and 12 depend on, proved once,
here, rather than once per feature.

Note it needs `createTable` to accept an `atoms` passthrough from config. If Task 5's
`externals` parameter is the only route, give the test `createTableOptions` + `constructTable`
directly rather than adding a config field for it — **do not widen the public config to make a
test convenient.**

- [ ] **Step 2: Implement the module**

- [ ] **Step 3: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run src/feature-state
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/feature-state/' || echo 'OWNED FILES CLEAN'
pnpm --filter @ez-kit/data-grid-core exec eslint src/feature-state --max-warnings=0
```

Expected: four cases green, `OWNED FILES CLEAN`, lint silent — the `eslint-disable` for the one
`as never` is the only suppression in the module, and there are no others in the package.

- [ ] **Step 4: Commit**

```bash
git add packages/data-grid/core/src/feature-state/
git commit -m "feat(data-grid-core): add the feature state accessor

Inside a TableFeature hook the table's TFeatures is unresolved, so Atoms<TFeatures>
and BaseAtoms<TFeatures> have no provable key and table.atoms.<slice>.get() does
not compile. Upstream solves this with an inline cast per feature; this hoists it
into one module.

readOwnSlice / writeOwnSlice and readForeignSlice / writeForeignSlice differ in
more than name: a foreign slice may not be registered, so its reader returns
undefined and its writer no-ops, while an own slice missing is a seeding bug and
throws. Both writers route through makeStateUpdater, which picks the owning atom
— writing baseAtoms directly goes nowhere when the consumer supplied their own."
```

---

### Task 8: The three state-only features — `loadingFeature`, `infiniteFeature`, `rowOrderingFeature`

Grouped because all three are `getInitialState` plus at most one table method, and the port is
the same three moves in each: rename into upstream's register, replace the global
`declare module` with per-feature `*_FeatureMap` merges, and replace `createTable` with
`constructTableAPIs` + `assignTableAPIs`.

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/features/loading/loading.ts` and `loading.test.ts`
- Modify: `packages/data-grid/core/src/features/infinite/infinite.ts` and `infinite.test.ts`
- Modify: `packages/data-grid/core/src/features/ordering/row-ordering-feature.ts` and its test
- Modify: `packages/data-grid/core/src/features/ordering/row-ordering.ts` — it holds the second
  of the task's two `getState()` reads, and it is a **whole-snapshot** read
  (`const state = table.getState()` at `:98`), not a slice read
- Modify: `packages/data-grid/core/src/features/ordering/ordering.test.ts` and
  `row-ordering.test.ts` — both construct tables through `createTable`, so both need `features:`;
  neither holds a `getState()` site
- Modify: `packages/data-grid/core/src/features/entry.ts` and `entry.test.ts`

**Interfaces:**

Consumes from Task 7: `readOwnSlice` / `writeOwnSlice` / `readForeignSlice` / `writeForeignSlice`.

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
2. **`Cell_FeatureMap` and `Header_FeatureMap` take no type parameters**, unlike the other eight
   (api-notes §3). None of these three touches them, but the next four tasks are where the mistake
   would be made by symmetry, so it is stated once here. `TableState_FeatureMap` takes none either.
3. **A slice only gets an atom if it is in `initialState`.** `constructTable` builds
   `baseAtoms` / `atoms` from `Object.keys(table.initialState)` after every feature's
   `getInitialState` has run (`dist/core/table/constructTable.js:84-100`). Each of these features
   already seeds its slice there, so nothing extra is needed — but a feature that assigned state
   lazily would get no atom at all, and `readOwnSlice` would throw on it. That throw exists for
   exactly this mistake.

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
					writeOwnSlice(table, 'infinite', (prev) => ({ ...prev, ...partial }))
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
`setInfiniteStatus` (api-notes §3). Note the write goes through `writeOwnSlice`: `infinite` is
this feature's slice, and Task 7's module is the only route to it.

`appendData` / `prependData` land here rather than on `DataTable` because they belong to
`infinite` (design §3) and because doing so makes them a live demonstration of D1: a grid
assembled without `infiniteFeature` does not have them, and the type says so.

`rowOrderingFeature` keeps `moveRow` / `canMoveRow` / `applyRowOrder` exactly as they are — they
are pure helpers over a table. Two reads change: `row-ordering-feature.ts`'s
`table.getState().rowOrder` becomes `readOwnSlice(table, 'rowOrder')`, and `row-ordering.ts:98`'s
whole-snapshot `table.getState()` becomes per-slice reads of whichever slices its body actually
uses — read the body and name them; do not translate it to `table.store.state`, which would
subscribe the caller to everything.

- [ ] **Step 1: Port the three feature modules per the shapes above**

Delete every `declare module '@tanstack/table-core' { interface TableState … }` block and the
`// Re-exported so index.ts can source …` comments above them: rollup-dts dropping a global
augmentation was a v8 problem, and with the state declared under a feature key in the `/features`
entry's own graph it should no longer apply. That claim is **verified in Task 13**, where the
package can actually build — not here, where it cannot.

- [ ] **Step 2: Rename the exports**

`LoadingFeature` → `loadingFeature`, `InfiniteFeature` → `infiniteFeature`,
`RowOrderingFeature` → `rowOrderingFeature`. Design §1 requires the register. Afterwards
`git grep -n 'LoadingFeature\|InfiniteFeature\|RowOrderingFeature' -- packages/data-grid/core`
must find only the new spellings.

Update `entry.test.ts`'s `*Feature` count assertion from 17 to 20 as the three are appended.

- [ ] **Step 3: Migrate the five test files**

`loading.test.ts`, `infinite.test.ts`, `row-ordering-feature.test.ts` (11 `getState()` reads →
`table.atoms.rowOrder.get()`; from a test `TFeatures` is resolved, so the accessor module is not
needed), plus `ordering.test.ts` and `row-ordering.test.ts`, which need only `features:` on each
config literal — they hold no `getState()` site, but both call `createTable` and would otherwise
fail the criterion below.

- [ ] **Step 4: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run \
  src/features/loading src/features/infinite src/features/ordering src/features/entry.test.ts
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/features/(loading|infinite|ordering)/' || echo 'OWNED FILES CLEAN'
```

Expected: green — all four files under `src/features/ordering`, both entry-point cases,
`OWNED FILES CLEAN` — and Task 6's `create-table*.test.ts` still green.

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

### Task 9: `editingFeature` — the one feature with a row prototype

Taken alone because it is the only feature that touches `assignRowPrototype`, and that is the
mechanism api-notes §3 spends the most words on.

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/features/editing/editing.ts` and `editing.test.ts`
- Modify: `packages/data-grid/core/src/features/entry.ts` and `entry.test.ts`

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
		editingFeature: { editing: EditingApi<TData>; _editingAbort: { controller?: AbortController } }
	}
	interface Row_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		editingFeature: { getIsEditing: () => boolean }
	}
}
```

**The three moves.**

1. **The `AbortController` leaves the closure for instance data.** v9 requires mutable per-table
   data in `initTableInstanceData`, with `constructTableAPIs` doing assignment only (api-notes
   §3):

   ```ts
   initTableInstanceData: (table) => { table._editingAbort = {} },
   resetTableInstanceData: (table) => {
     table._editingAbort.controller?.abort()
     table._editingAbort = {}
   },
   ```

   A box (`{ controller?: … }`) rather than the controller directly, so `resetController` can
   swap it without reassigning a property that `assignTableAPIs` installed.
   `resetTableInstanceData` runs after `table.reset()` restores internally owned atoms — aborting
   an in-flight validation at that point is correct, and is behaviour we do not have today.

2. **`createTable` → `constructTableAPIs` + `assignTableAPIs`.** Every local const in today's
   closure (`getConfig`, `getState`, `writeState`, `runValidate`, `resolveColumnEditing`,
   `validateAndApplyField`, `snapshotRow`, …) becomes a module-level function taking `table` as
   its first argument. That is not cosmetic: a closure over `table` is still legal for a table
   API (the table is a singleton), but hoisting them is what lets the row-prototype half call
   them, and upstream's own guardrail is that `constructTableAPIs` assigns and nothing else.

   The one API surface stays exactly as it is — `table.editing` is a single object with the same
   seven members, assigned through one `table_editing` key. Do not fan it out into seven table
   methods; `EditingApi` is the documented shape and AGENTS.md's settled decisions name `editing`
   as the option and the group.

3. **`createRow` → `assignRowPrototype`.** The v9 form, with the two mechanical details from
   api-notes §3 — the `row_` prefix that gets stripped, and `fn` receiving the row first:

   ```ts
   assignRowPrototype: (prototype, table) => {
     assignPrototypeAPIs('editingFeature', prototype, table, {
       row_getIsEditing: {
         fn: (row) => readOwnSlice(row.table, 'editing').rowId === row.id,
       },
     })
   },
   ```

   **Route B (`row.table`), not the closure.** Both work — the prototype is per table, so closing
   over the hook's `table` is sound — but every stock feature reads state through `row.table`, and
   a method that captures nothing stays correct if the prototype is ever reused. There is no
   `assignRowAPIs`; `assignPrototypeAPIs` inside the hook is the only route (api-notes §7.3).

**Reads and writes go through Task 7's accessor, with one spelling and no exceptions.** The six
`table.getState().editing` reads become `readOwnSlice(table, 'editing')`; the four
`table.setState((prev) => …)` writes become `writeOwnSlice(table, 'editing', (prev) => …)`.
`editing` is this feature's slice, so the _own_ pair is correct throughout. Do **not** write
`table.atoms.editing.get()` or `table.baseAtoms.editing.set(…)` anywhere in this file — neither
compiles here (decision 7), and the optional-chained spelling does not either.

Note what the change buys beyond compiling: `writeState` no longer rebuilds the whole
`TableState` to change one slice, so a subscriber to another slice is no longer woken by a
keystroke in a form field.

If any single operation writes two slices — check `commit` — wrap the pair in `batch` from
`@tanstack/store` so they land as one notification, preserving what the single `setState` gave
for free. If `editing` only ever writes its own slice, no batching is needed; say which it was.

- [ ] **Step 1: Port `editing.ts` per the three moves**

- [ ] **Step 2: Rename `EditingFeature` → `editingFeature`**, export from `entry.ts`, and bump
      `entry.test.ts`'s count to 21.

- [ ] **Step 3: Migrate `editing.test.ts`** — `features: tableFeatures({ editingFeature })` in
      each config, and the 15 `getState()` reads onto `table.atoms.editing.get()` (a test has
      `TFeatures` resolved and does not need the accessor).

- [ ] **Step 4: Prove the prototype method survives what the design flagged**

Design §2 asks for an explicit audit: prototype-bound methods break under destructuring,
spreading, `Object.keys` and `JSON.stringify`, and `getIsEditing` is our only such method. Add a
characterization test so the breakage is caught here rather than at runtime in a kit:

```ts
it('getIsEditing is on the prototype, so it does not survive a spread', () => {
	const row = table.getRowModel().rows[0]!
	expect(typeof row.getIsEditing).toBe('function')
	expect(Object.hasOwn(row, 'getIsEditing')).toBe(false)
	expect(Object.keys(row)).not.toContain('getIsEditing')
	expect({ ...row }.getIsEditing).toBeUndefined()
	// bound callback passing still works, because fn reads the row it is given
	const bound = row.getIsEditing.bind(row)
	expect(bound()).toBe(false)
})
```

Design §7 already records that no destructuring or bare-callback passing of a row method exists
in the React package today. This test is what keeps that true.

- [ ] **Step 5: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/editing src/features/entry.test.ts
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/features/editing/' || echo 'OWNED FILES CLEAN'
git grep -n "atoms\.\|baseAtoms\." -- packages/data-grid/core/src/features/editing/editing.ts
```

Expected: green, `OWNED FILES CLEAN`, and the last grep **silent** — the feature reaches state
only through the accessor.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/core/src/features/
git commit -m "feat(data-grid-core)!: port editing to the v9 plugin API

Table methods move to constructTableAPIs + assignTableAPIs, the per-table
AbortController to initTableInstanceData / resetTableInstanceData, and
row.getIsEditing to assignRowPrototype — reading the table through row.table, as
every stock feature does.

State goes through the feature-state accessor, so a keystroke in a form field no
longer rebuilds the whole state object."
```

---

### Task 10: `creatingFeature`

`creating` and `editing` are near-twins; this task follows Task 9's shapes exactly, and any
divergence between the two ports is a defect in one of them.

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/features/creating/creating.ts` (490 lines) and
  `creating.test.ts` (551 lines, 30 `getState()` sites)
- Modify: `packages/data-grid/core/src/features/entry.ts` and `entry.test.ts`

**Interfaces:**

```ts
// entry.ts
export { creatingFeature, CreatingMode } from './creating'
export type {
	CreateDefaultValueContext,
	CreateDefaultValuesContext,
	CreatingApi,
	CreatingConfig,
	CreatingSaveContext,
	CreatingState,
} from './creating'
```

```ts
declare module '@tanstack/table-core' {
	interface Plugins {
		creatingFeature: TableFeature
	}
	interface TableState_FeatureMap {
		creatingFeature: { creating: CreatingState }
	}
	interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		creatingFeature: { creating?: CreatingConfig<TData> }
	}
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		creatingFeature: { creating: CreatingApi<TData>; _creatingAbort: { controller?: AbortController } }
	}
}
```

- [ ] **Step 1: Port `creating.ts`**

The same three moves as Task 9 minus the row prototype: instance data for the `AbortController`
(same `{ controller?: AbortController }` box, same `initTableInstanceData` /
`resetTableInstanceData` pair), hoisted helpers, one `table_creating` key carrying the whole
`CreatingApi`. Its 6 `getState()` reads become `readOwnSlice(table, 'creating')`; its writes
become `writeOwnSlice(table, 'creating', …)`.

`creating` writes only its own slice — confirm that while porting, and if any operation writes a
second, wrap the pair in `batch` and say so.

- [ ] **Step 2: Rename `CreatingFeature` → `creatingFeature`**, export from `entry.ts`, bump
      `entry.test.ts`'s count to 22.

- [ ] **Step 3: Migrate `creating.test.ts`** — `features:` on every config literal, 30
      `getState()` reads onto `table.atoms.creating.get()`.

- [ ] **Step 4: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/creating src/features/entry.test.ts
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/features/creating/' || echo 'OWNED FILES CLEAN'
git grep -n "atoms\.\|baseAtoms\." -- packages/data-grid/core/src/features/creating/creating.ts
```

Expected: green, `OWNED FILES CLEAN`, last grep silent.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/core/src/features/
git commit -m "feat(data-grid-core)!: port creating to the v9 plugin API

Follows editing exactly: assignTableAPIs for the API object, instance data for
the AbortController, and the feature-state accessor for reads and writes."
```

---

### Task 11: `deletingFeature` — and the foreign-slice write in practice

Split from `creating` because they share no code: separate modules, separate tests, separate
entry lines. What binds them is the `AbortController` pattern, which Task 9 established, so
splitting costs one cross-reference. `deleting` also carries the one thing neither twin does —
a write to a slice it does not own.

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/features/deleting/deleting.ts` (316 lines) and
  `deleting.test.ts` (282 lines, 19 `getState()` sites)
- Modify: `packages/data-grid/core/src/features/entry.ts` and `entry.test.ts`

**Interfaces:**

```ts
// entry.ts
export { deletingFeature } from './deleting'
export type {
	BulkConfirmationConfig,
	BulkDeletingApi,
	BulkDeletingConfig,
	BulkDeletingContext,
	ConfirmationConfig,
	DeletingApi,
	DeletingConfig,
	DeletingContext,
	DeletingState,
} from './deleting'
```

```ts
declare module '@tanstack/table-core' {
	interface Plugins {
		deletingFeature: TableFeature
	}
	interface TableState_FeatureMap {
		deletingFeature: { deleting: DeletingState }
	}
	interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		deletingFeature: { deleting?: DeletingConfig<TData> }
	}
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		deletingFeature: { deleting: DeletingApi; _deletingAbort: { controller?: AbortController } }
	}
}
```

- [ ] **Step 1: Write the failing test first**

`deselect` writes `rowSelection`, a slice `deletingFeature` does not own. Task 7 proved that
`writeForeignSlice` reaches a consumer-supplied atom; this proves `deleting` actually calls it,
which is a different claim. Write it before the port, against the v8 implementation, so it fails
for the right reason:

```ts
it('clears the selection after a bulk delete even when the consumer owns rowSelection', async () => {
	const external = createAtom<Record<string, boolean>>({ '1': true, '2': true })
	const table = makeTable({ atoms: { rowSelection: external } }) // helper, per Task 7 Step 1

	await table.deleting.bulk.delete(['1', '2'])

	expect(external.get()).toEqual({})
})

it('a bulk delete on a table with no rowSelectionFeature does not throw', async () => {
	const table = makeTable({ features: tableFeatures({ deletingFeature }) })
	await expect(table.deleting.bulk.delete(['1'])).resolves.not.toThrow()
})
```

The second case is the other half of the foreign-write contract: the feature is legitimately
optional, so the write must no-op rather than crash.

- [ ] **Step 2: Port `deleting.ts`**

Same shape as Tasks 9 and 10 — instance data for the controller, hoisted helpers, one
`table_deleting` key — with one difference that is not cosmetic:

```ts
const deselect = (table: AnyTable, rowIds: string[]): void => {
	if (rowIds.length === 0) return
	const removed = new Set(rowIds)
	writeForeignSlice(table, 'rowSelection', (prev) =>
		Object.fromEntries(Object.entries(prev).filter(([id]) => !removed.has(id))),
	)
}
```

`writeForeignSlice`, not `writeOwnSlice`: `rowSelection` belongs to `rowSelectionFeature`, may be
absent, and may be externally owned. Task 7's module is where that rule lives; this is its first
real caller.

`deleting` writes `rowSelection` **and** its own slice in the same gesture. Wrap the pair in
`batch` from `@tanstack/store` so one notification reaches subscribers, preserving the property
the old single `setState` gave for free.

- [ ] **Step 3: Rename `DeletingFeature` → `deletingFeature`**, export from `entry.ts`, bump
      `entry.test.ts`'s count to 23.

- [ ] **Step 4: Migrate the rest of `deleting.test.ts`** — `features:` on every config literal,
      19 `getState()` reads onto `table.atoms.<slice>.get()`.

- [ ] **Step 5: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/deleting src/features/entry.test.ts
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/features/deleting/' || echo 'OWNED FILES CLEAN'
git grep -n "atoms\.\|baseAtoms\." -- packages/data-grid/core/src/features/deleting/deleting.ts
```

Expected: green including both Step 1 cases, `OWNED FILES CLEAN`, last grep silent.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/core/src/features/
git commit -m "feat(data-grid-core)!: port deleting to the v9 plugin API

Follows editing and creating, with one difference: the post-bulk deselect writes
rowSelection, a slice deleting does not own, so it goes through writeForeignSlice
— which reaches a consumer-supplied atom and no-ops when the feature is absent.
Covered by two tests written before the port."
```

---

### Task 12: `draftFeature` — rebuilt on externally-owned atoms

Design §2 calls this "rethought, not ported", and api-notes §4 settles the shape the design left
open: `atoms` is `Partial`, ownership is per slice, so **one atom set**.

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/features/deferred-apply/deferred-apply.ts` and its test
- Modify: `packages/data-grid/core/src/create-table/create-table.ts` (build the atoms)
- Modify: `packages/data-grid/core/src/features/entry.ts` and `entry.test.ts`

**Interfaces:**

```ts
// deferred-apply.ts — the atom factory the caller owns
export type DraftAtoms = {
	sorting: Atom<SortingState>
	columnFilters: Atom<ColumnFiltersState>
	globalFilter: Atom<unknown>
}

/** The seeds `createDraftAtoms` needs, read off the table's `initialState`. */
export type DraftSeed = Partial<TableState_All> & { draft?: Partial<AppliedState> }

/**
 * Create the three live draft atoms from a table initial state.
 *
 * The **applied** seed is `initialState.sorting` / `.columnFilters` / `.globalFilter` — a grid
 * given an initial sort must not be born dirty. The **live** seed is `initialState.draft`, laid
 * on top, which is how a draft restored from storage comes back pending. Where `draft` says
 * nothing, the live atom starts at the applied value. This is exactly the rule
 * `getInitialState` already encodes; the two read the same object and must not disagree.
 *
 * **Call once per table instance, never per render:** `useTable` merges the options object into
 * the table on every render and replaces `atoms` wholesale, so a fresh set each render would
 * reset the draft on every keystroke.
 */
export function createDraftAtoms(initialState?: DraftSeed): DraftAtoms

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
funnel could be deleted in Task 6, so this task is what pays for it.

**Why one set and not two.** `ExternalAtoms` is `Partial`, so a table can have three external
slices and keep the rest internal. The three live axes are external; `applied` is an ordinary
internal slice declared in `TableState_FeatureMap` exactly as today. A second set would be a
second copy of the same three values with nothing to reconcile them.

**Why the caller creates them.** See decision 2 in the orientation above. `createTableOptions` is
pure and takes them through `externals.atoms` (Task 5); `createTable` calls `createDraftAtoms`
once; `useDataGrid` in PR 2 calls it in a `useState` initializer. `createDraftAtoms` uses
`createAtom` from `@tanstack/store` — under the vanilla binding `wrapExternalAtoms` is `false`
and the atoms are used directly, while `reactReactivity()` wraps and two-way mirrors them
(`constructTable.js:52-68`); both are correct, and neither requires us to know which is in play.

**The port.**

- `getInitialState` keeps its exact logic for the `applied` slice — seeded from
  `initialState.sorting` / `columnFilters` / `globalFilter`. It no longer seeds the live axes;
  `createDraftAtoms` does that, from `initialState.draft`, per the doc comment above.
- `get()` reads the three live axes. They are external atoms, so `readOwnSlice` is wrong and
  `readForeignSlice` is misleading: read the `DraftAtoms` handle the feature was given. Store it
  in instance data (`initTableInstanceData`), set from `table.options.atoms`, so the feature has
  a typed handle rather than reaching back through the accessor for slices that belong to three
  other features.
- `isDirty()` / `getPendingCount()` are unchanged apart from their reads. `sameAxis` is unchanged.
- `set()` writes the three atoms directly (they are `Atom`, writable), inside `batch`.
- `apply()` keeps its dirty guard and its "one state change" invariant, now as one `batch`:
  `writeOwnSlice(table, 'applied', …)`, then `writeForeignSlice(table, 'pagination', …)` to reset
  `pageIndex` and `writeForeignSlice(table, 'rowSelection', {})`. Both of the latter are foreign
  and both features are optional — a draft grid with no pagination and no selection is legal, and
  `writeOwnSlice` there would throw. Then call the consumer's per-axis handlers with the newly
  applied values; that is what replaces the funnel's emission.
- `reset()` / `resetAxis()` write the atoms back to `applied`. Design §3 notes `table.reset()`
  resets only internal base atoms, so resetting the draft axes is this feature's job — which it
  already was, and now the types say so.

- [ ] **Step 1: Write the failing tests first**

`deferred-apply.test.ts`'s "emission gating" block is the characterization coverage design §7
relies on; it must pass unchanged in meaning. Before touching the feature, add the two cases the
old architecture could not express:

```ts
it('a controlled state mirror does not clobber a pending draft', () => {
	const features = tableFeatures({ rowSortingFeature, draftFeature })
	const table = createTable({ features, data, columns, sorting: { manual: true }, draft: true })

	table.draft.set({ sorting: [{ id: 'name', desc: false }] })
	// the consumer mirrors back what it last saw — the APPLIED query, which is empty
	table.setOptions((prev) => ({ ...prev, state: { ...prev.state, sorting: [] } }))

	expect(table.draft.get().sorting).toEqual([{ id: 'name', desc: false }])
	expect(table.draft.isDirty()).toBe(true)
})

// apply() writes pagination and rowSelection, which belong to two optional features.
it('apply() works on a draft grid with neither pagination nor selection registered', () => {
	const features = tableFeatures({ rowSortingFeature, draftFeature })
	const table = createTable({ features, data, columns, sorting: { manual: true }, draft: true })

	table.draft.set({ sorting: [{ id: 'name', desc: true }] })
	expect(() => {
		table.draft.apply()
	}).not.toThrow()
	expect(table.draft.isDirty()).toBe(false)
})
```

The first states the `DRAFT_AXES` filter's behaviour as a property of atom precedence rather than
of our own guard. The second is the foreign-write contract at `apply()`'s two call sites, which
Task 11 proved for `deleting` and which nothing else here would cover.

- [ ] **Step 2: Port the feature and add `createDraftAtoms`**

- [ ] **Step 3: Wire `createTable`**

This replaces the first statement of Task 6's body and nothing else:

```ts
const draftAtoms =
	'draftFeature' in config.features && isFeatureEnabled(config.draft)
		? createDraftAtoms(config.initialState)
		: undefined
const { options, grid } = createTableOptions(config, draftAtoms !== undefined ? { atoms: draftAtoms } : {})
```

`config.initialState` is the table initial state, which is exactly what `createDraftAtoms`'
`DraftSeed` parameter declares — the applied half comes from its `sorting` / `columnFilters` /
`globalFilter`, the live half from its `draft`. The feature's `getInitialState` receives the same
object, which is why the two cannot disagree.

Note this makes `create-table.ts` import one named function from one feature module — the
deliberate exception to Task 3 Step 2's rule, recorded there, and accounted for in Task 13 Step 5.

`config.initialState` must also _declare_ `draft`. Today that comes from a global
`declare module` on `InitialTableState` (`deferred-apply.ts:85-88`) — v9 has no such interface to
merge into, so the field moves onto our own `TableConfig['initialState']` type in this task,
typed as `Partial<AppliedState>`. It is our config, not TanStack's, and it always should have
been.

- [ ] **Step 4: Rename and export**

`DeferredApplyFeature` → `draftFeature`, exported from `entry.ts` with `DraftAxis`,
`createDraftAtoms` and the five types; bump `entry.test.ts`'s count to 24. The directory keeps
its name: renaming `features/deferred-apply/` to `features/draft/` is churn that would obscure
this diff, and PR 6's tail is the place for it if it is wanted at all.

- [ ] **Step 5: Criterion**

```bash
pnpm --filter @ez-kit/data-grid-core exec vitest run \
  src/features/deferred-apply src/features/entry.test.ts src/create-table
pnpm --filter @ez-kit/data-grid-core exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 \
  | grep -E '^src/(features/deferred-apply/|create-table/create-table\.ts)' || echo 'OWNED FILES CLEAN'
```

Expected: the whole file green, the emission-gating block **unchanged in meaning** — if a gating
assertion had to be weakened to pass, that is a behaviour regression, not a migration, and it
goes back. `create-table*.test.ts` must still pass: Step 3 changed a statement they exercise.

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

### Task 13: Close PR 1 — `allDataGridFeatures`, budgets, and the first green `--filter data-grid-core`

**Branch:** `integration/tanstack-v9`.

**Files:**

- Modify: `packages/data-grid/core/src/features/entry.ts` and `entry.test.ts`
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
the vanilla path (Task 6). Neither `allDataGridFeatures` nor any documented example ever names
the key — `entry.test.ts`'s third case asserts it.

- [ ] **Step 1: Add `allDataGridFeatures`**

`stockFeatures` is the all-in aggregate export (api-notes §2), so spreading it is both correct
and self-maintaining across a table-core patch. The row-model slots must be listed explicitly —
they are not features and are not in `stockFeatures`.

- [ ] **Step 2: Guard the main entry's surface**

`src/index.ts` exports no `*Feature` identifier today, so an assertion over it is green before
and after this PR. It is worth adding anyway — as a **regression guard**, which is what it is,
not as "the assertion that makes D1 checkable":

```ts
// src/index.test.ts
it('keeps feature values off the main entry — they belong to /features', async () => {
	const main = await import('./index')
	expect(Object.keys(main).filter((n) => n.endsWith('Feature'))).toEqual([])
})
```

What actually makes D1 checkable is the type error a consumer gets from omitting `features`, and
the tree-shaking cases PR 4 adds — neither of which lives here.

- [ ] **Step 3: Run the real criterion**

```bash
pnpm --filter @ez-kit/data-grid-core lint \
  && pnpm --filter @ez-kit/data-grid-core typecheck \
  && pnpm --filter @ez-kit/data-grid-core test \
  && pnpm --filter @ez-kit/data-grid-core build
```

This is design §7's PR 1 criterion, and it is the first point at which it can run. All 113
`getState()` test call sites across the seven files have been migrated by the task that owned
each file — `create-table.test.ts` and `system-column-def.test.ts` in Task 6,
`row-ordering-feature.test.ts` in Task 8, `editing.test.ts` in 9, `creating.test.ts` in 10,
`deleting.test.ts` in 11, `deferred-apply.test.ts` in 12. If `typecheck` or `test` still names
one, say in the commit body which task under-delivered, so the next planning pass knows.

`pnpm run ci` and `pnpm build` at the repo root are **still red**, and that is expected: the react
package and both kits are untouched and still call `getState()`, `subscribe`, `getSnapshot` and
`syncControlledState`. Do not attempt to fix them here — that is PR 2, and touching it would
merge two reviews into one.

- [ ] **Step 4: Verify the declaration merges survive the bundle**

This is the question Task 8 Step 1 deferred, and this is the first task where the command exists:

```bash
grep -c "TableState_FeatureMap\|interface Plugins" packages/data-grid/core/dist/features/index.d.ts
```

Expected: non-zero — every ported feature's merges appear in the emitted `.d.ts`. If they do not,
the re-export trick the old `// Re-exported so index.ts can source …` comments described is still
needed; restore it with a comment corrected for v9, and record in the commit body that it was.

- [ ] **Step 5: Re-measure the two size budgets**

```bash
pnpm --filter @ez-kit/data-grid-core size
```

Set each limit to the measured value plus roughly 15% headroom, per AGENTS.md, keeping both
`ignore` lists at `["@tanstack/table-core", "@tanstack/store"]`.

`dist/index.js` should have **fallen**: `src/store/**`, the funnel and the seven `_features`
registrations left it. It will not have fallen by the whole of that, because Task 12 makes
`create-table.ts` import `createDraftAtoms` from `features/deferred-apply`, which pulls that one
module — `draftFeature` and its types included — into the main entry's graph. That is the price
of keeping the atom lifetime with the caller, it is one feature rather than seven, and it is
expected. If `dist/index.js` reaches anything under `features/` **other than**
`deferred-apply`, something is still wrong; find it before setting the number.

- [ ] **Step 6: Commit**

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
things Task 13 produces rather than predicts:

1. **The real shape of `createTableOptions`' return value and of `DataTable`.** PR 2's central
   question — whether `useDataGrid` adopts `useTable` wholesale or keeps its own
   `useSyncExternalStore` — turns on how much of `use-data-grid.ts` still has a job once
   `table.Subscribe` and `table.atoms` exist. Tasks 6 and 12 make that concrete: the answer is
   readable from the code, and guessing it now would produce signatures for a hook nobody has
   run. Both branches are already unblocked from core's side — decision 5 records that neither
   needs an API core does not ship.
2. **Which prototype-bound reads the React package actually performs.** Task 9's characterization
   test fixes the rule; PR 2's audit applies it to ~13.6k lines. That audit is cheap once
   `editingFeature` exists and expensive to do against a feature that is still v8-shaped.

Two carry-forwards for that pass: the react package has **17** `getState()` call sites, not the
20 design §3 records; and Task 7's accessor is for feature hooks only — in the React adapter
`TFeatures` is resolved, so `table.atoms.<slice>.get()` compiles there and is what PR 2 should
write.

Beyond PR 2, design §7 rows 3, 4, 5 and 6 are planned in later passes, each after the one before
it has landed — for the same reason this pass waited for Task 2: the plan is worth more when it
is written against a tree than against a document. **Row 3 is now smaller than the design states**
— Task 4 took the core-side renames, so PR 3 is the React adapter, both kits, the CSS variables,
the registry payload and the RTL e2e cases.

The branch stays local throughout. Pushing `integration/tanstack-v9` and opening any PR against
it is the human's call, and no task above contains a step that does either.

## Self-review notes

- **Spec coverage:** this plan implements design §7 rows "0. Preparation" (Task 1) and
  "1. Core engine" in full (Tasks 2–13), plus the core-side half of §5, which is re-scoped out of
  the PR 3 row and into Task 4 because PR 1's own criterion cannot be met without it. Rows 2
  through 6 are explicitly deferred in the planning boundary above, not omitted.
- **Counted against the tree, not the design:** 26 `getState()` call-site lines (27 occurrences)
  in core source, in 7 files — one of them, `row-ordering.ts:98`, a whole-snapshot read; 113 lines
  (115 occurrences) in core tests across 7 files, the seventh being
  `system-columns/system-column-def.test.ts`; 17 stock features rather than 16 (api-notes §2); 21
  core types needing `TFeatures` rather than "~23", out of 39 exported declarations generic over
  the row. `row-actions.ts` carries an eighth global `declare module` with no feature behind it,
  and its merge target `TableOptionsResolved` does not exist in v9, so Task 5 deletes it rather
  than porting it. Design §3's figure of 20 `getState()` sites in the react package measures
  **17**; recorded for the PR 2 pass.
- **Decided here, having been left open by the design:** `draft` gets one atom set (api-notes §4
  settles it); the draft atoms are created by the caller because `useTable` replaces `atoms` on
  every render; `ColumnMeta` stays a global merge at v9's three parameters instead of moving to
  the `columnMeta` slot; `rowActions` / row `pinning` / `virtualization` / `direction` leave
  TanStack options for a `grid` bag; `getInitialSnapshot` is deleted rather than wrapped, since
  neither PR-2 branch needs a core API for it; `getState()` gets no shim; and feature state is
  reached through one accessor module rather than through `table.atoms` / `table.baseAtoms`,
  which do not type-check inside a feature hook.
- **Type consistency:** `createTableOptions` is declared once in Task 5's Interfaces block and
  called with that signature in Tasks 6 and 12. `GridOptions`, `DraftAtoms`, `DraftSeed`,
  `createDraftAtoms`, `readOwnSlice` / `readForeignSlice` / `writeOwnSlice` / `writeForeignSlice`
  and every `*Feature` name are spelled identically in the task that produces them and in each
  task that consumes them. Task 1's `FeatureOnChangeHandlers` and `ResolvedTableOptions` are v8
  artefacts that Task 5 retires, which is why they are absent from Tasks 5–13.
- **Task ownership is total:** every core file holding a `getState()` call site, a
  `declare module '@tanstack/table-core'` block, or a `left` / `right` pinning spelling appears in
  exactly one task's Files list. Task 13 Step 3 names which task owned each of the seven test
  files, so an escapee is attributable rather than anonymous.
- **Dropped from PR 0 after verification:** removing destructured prototype methods (none exist)
  and rewriting indeterminate selection (already v9-correct at `header-cell.tsx:145`, covered by
  `data-grid.test.tsx:92-103`). Recorded in the design doc's §7 note.
