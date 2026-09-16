# PR 1 outcomes — what the core migration left for PRs 2-6

**Date:** 2026-09-16
**Commits:** `e7ba4259` (the migration), `c449d02b` (the public export it was missing)
**Branch:** `integration/tanstack-v9`

This is the record of PR 1 of the seven-PR migration in [design.md](./design.md). It exists because
PR 1 was planned and executed against a working directory that is not in the repository, and PRs 2-6
have to be planned from something. It assumes you have read `design.md` and have
[api-notes.md](./api-notes.md) — the verified inventory of what v9 actually installs — to hand, and
it does not repeat either.

Everything below carries its evidence: a `file:line`, a type signature read from the installed
package, or a named test. That is not decoration. The characteristic defect of this migration — hit
nine separate times, and caught nine times only because someone went looking — is a **value that
silently stops being reached**: an option written where nothing reads it, a callback that stops
firing, a member that stops being installed, each of them compiling clean and passing the suite. A
handoff full of unsourced assertions would be the same failure one level up.

---

## 1. What PR 1 delivered

`@ez-kit/data-grid-core` runs on `@tanstack/table-core@9.2.4`, which is its **sole** runtime
dependency, and the package is green on all four gates: typecheck clean, lint clean at
`--max-warnings=0`, 33 files / 661 tests passing, build ESM+DTS, `size-limit` at 10.65/12.5 kB for
`index` and 4.66/5.5 kB for `features`. It started the PR at 231 passing tests and 518 type errors.

Substantively:

- **`@ez-kit/data-grid-core/features`** is a second entry point (`src/entry.ts`, wired in both the
  `exports` map and the `tsup` entries) re-exporting 17 stock features, 9 row-model factories, the
  three named-function registries (`filterFns` / `sortFns` / `aggregationFns`), all seven of our own
  features under upstream's naming register (`editingFeature`, `draftFeature`, …), and
  `allDataGridFeatures`. `coreReactivityFeature` is deliberately absent — `useTable` spreads its own
  before ours (`react-table/dist/useTable.js`), so ours would win and break rendering.
- **The seven custom features are on the v9 plugin API.** Each declares itself under `Plugins` +
  its `*_FeatureMap` entries + `TableState_All`, in one block, replacing the v8 global
  `declare module '@tanstack/table-core' { interface TableState { … } }`. Design §2's "a real defect
  closes along the way" is closed: a consumer building a plain TanStack table in the same project no
  longer gets `state.editing` declared and lying.
- **The hand-written store is gone.** `core/src/store/` in full, with the `silent` / `notify`
  protocol, the `onStateChange` funnel and the eleven-branch per-feature dispatch. `DataTable` is now
  `TanStackTable & { setData, grid }` and nothing else.
- **State ownership follows one rule.** Every feature read and write goes through
  `src/feature-state/` (`readOwnSlice` / `readForeignSlice` / `writeOwnSlice` / `writeForeignSlice`),
  which holds the one cast that makes atom access typecheck under an unresolved `TFeatures`. No
  feature touches `table.atoms` / `table.baseAtoms` / `makeStateUpdater` directly — a git grep for
  those outside `feature-state/` returns prose and `create-table-options.ts`, which is the layer
  below.
- **Column pinning speaks `start` / `end` throughout core**, including the public option value and
  `MenuIcon.PinStart` / `messages.columnMenu.pinStart`.
- **`createTableOptions(config)` is a pure resolver on the public entry**, with `GridOptions` and
  `StateHandlerTable` beside it. Design D3's hybrid packaging is usable.

### 1.1 Where it deviated from the design — PR 6 writes the changeset from this

Four deviations. Each is real, each was taken on evidence, and each needs a release note.

**(a) Core-side pinning vocabulary moved from PR 3 into PR 1.** Design §7 puts the whole
`left`/`right` → `start`/`end` rename in PR 3. PR 1's own criterion — `--filter data-grid-core`
green — is unreachable that way: v9 removed physical `left`/`right` from `Column.getStart` /
`getAfter` / `pin()` entirely, so core cannot compile while still speaking them. Design §7 was in
tension with itself. Core's half was therefore taken here, with **no translation shim** (a shim
introduced to postpone a rename outlives the rename), and it reaches further than the option value:
`ColumnPinSide.Start/End`, `GridMenuIcon.PinStart/PinEnd` and `messages.columnMenu.pinStart/pinEnd`
all renamed. The English defaults stay `'Pin Left'` / `'Pin Right'`, matching the
`moveStart: 'Move left'` logical-key/LTR-wording convention documented at `messages/types.ts:86-92`.
PR 3 keeps everything outside core: `pin-styles.ts`, both kits, the CSS variables, the registry
payload, the docs and the RTL e2e. **Changeset framing:** this is a breaking rename of a public
option value _and_ of each kit's icon map key _and_ of any consumer's message override — three
distinct consumer-visible breaks, not one.

**(b) `toApplied` and `outwardUnchanged` came back as a private read projection.** Design §3 lists
both under "deleted rather than ported". The _write_ funnel is genuinely gone and stays gone. What
returned is a **read** projection at `features/deferred-apply/deferred-apply.ts:464` and `:480`,
reached only through the exported `createAppliedEmitter` (`:503`). It is needed because the
suppression `deferred-apply.test.ts:213` demands is not "stay silent while dirty" but "emit only
when the applied projection differs by per-key reference" — no plain filter produces that.
(Note for whoever transcribes this: the ledger and one report call the first function `toOutward`,
its v8 name. The function is `toApplied`.)

**(c) `getInitialSnapshot` was deleted, not wrapped.** Design §3 left this open pending the
installed types: keep a thin SSR wrapper if `useTable` gives no equivalent frozen-snapshot
guarantee. The types settled it — v9 resolves `readonly initialState: TableState<TFeatures>` once at
construction and never reassigns it, so the guarantee exists on the table and the wrapper would have
wrapped nothing. It went with the rest of the five methods. Its react callers are §2.3.

**(d) §1's compile-time feature gate is NOT delivered.** Design §1 says `sorting: {…}` without
`rowSortingFeature` is a compile error where today it is a silent no-op. It is not. `TableConfig`
declares `sorting?: boolean | SortingConfig` and every sibling unconditionally, and `TFeatures` is a
parameter that gates no field — falsified by probe: `features: tableFeatures({})` with
`sorting: { multi: { max: 3 } }` typechecks clean. What **is** delivered is the runtime half: a
development warning naming the missing feature, from the guard catalogue in
`create-table-options.ts`. Two docblocks asserted the compile-time claim and now explicitly retract
it (`types.ts:794-796`, `create-table-options.ts:74-77`), the second leading with "this map is the
only thing that catches such a field, and nothing stands behind it". See §5 for why the gate was not
built.

---

## 2. What PR 2 inherits

PR 2 is `@ez-kit/data-grid-react`: `useTable`, deleting the binding layer and the second store,
narrowing the selector. It is also the PR where `verify` goes green for the first time. This section
is the complete set of things PR 1 knows about it.

### 2.1 The `grid` collision — the name clash is the visible half, the shape clash is the silent one

Core now writes `table.grid`. So does react. They are different objects.

Core's, `GridOptions<TRow>` at `create-table/create-table-options.ts:314-330`, has **four** members:

```ts
rowActions: { placement: RowActionsPlacement; actions?: … }
rowPinning?: RowPinningConfig            // normalized; absent when row pinning is off
virtualization?: boolean | VirtualizationConfig   // passed through UNRESOLVED
direction: GridDirectionValue
```

React's, `ResolvedGridOptions` at `react/react/src/resolved-options.ts:47-210`, has **fifteen**
declared members: `cellTypes`, `messages`, `rowProps`, `layout`, `ordering`, `pinning`,
`visibility`, `sorting`, `filtering`, `globalFiltering`, `pagination`, `selection`, `expanding`,
`fallbacks`, `virtualization`. (An earlier count of 18 circulated during PR 1; the type is 15.
`defaultResolvedGridOptions()` at `:234` seeds 11 of them.)

`prepare-table.ts:25` does `table.grid = defaultResolvedGridOptions()`, and `useDataGrid` overwrites
`grid` wholesale on its first render — its own doc comment says so. Both run **after** `createTable`.
So as the tree stands, core's bag is clobbered and `rowActions.placement`, `rowPinning` and
`direction` silently never reach anything.

That is the visible half, and `DataTable.grid: GridOptions<TRow>` (`core/src/types.ts:1013`) now
makes `prepare-table.ts:25` a type error as well as a runtime clobber, so it cannot be missed.

**The silent half is the two overlapping names.** `virtualization` is
`boolean | VirtualizationConfig` on core's side and `NormalizedVirtualizationConfig | undefined` on
react's — `true` versus `{ row: {…} }`. Core's `rowPinning` is the normalized row-pin config; react's
`pinning` is `{ column: boolean; row: boolean }`, a different thing under a similar name. If PR 2
merges the two bags, whichever assignment runs second wins and every `grid.virtualization` reader
receives the other shape **with no type error**, if the merged bag is typed as an intersection or
built structurally. There are seven such readers in the react package today —
`data-grid/table.tsx:142` in source, plus `feature-enabled.test.tsx:56` and five in
`use-data-grid.test.tsx:454-480`.

**Do not merge them.** Either keep core's four under their own name, or spread core's into react's
_first_ and rename `virtualization` on one side — and type the result so the two shapes cannot alias.
This seam was discovered twice independently during PR 1, from opposite directions.

### 2.2 `createTableOptions` is now exported, and PR 2 cannot start without it

`import { createTableOptions } from '@ez-kit/data-grid-core'` was `TS2305 … has no exported member`
until `c449d02b`. It is now on the public entry, together with:

- **`GridOptions`** — not speculation about PR 2. `DataTable.grid` is already typed with it
  (`types.ts:1013`), so it was reachable-but-not-nameable: a consumer could write
  `const g = table.grid` and get the type but could not write the annotation. Verified present in
  the **built** `dist/index.d.ts`, not just in source. React names it nowhere today.
- **`StateHandlerTable`** — the parameter type of the exported `bindStateHandlers`.

Design D3's shape holds: `useDataGrid` hands `createTableOptions(config)` to `useTable`, rather than
calling `createTable` from inside a hook.

### 2.3 React callers of methods PR 1 deleted

Five `DataTable` methods are gone (`subscribe`, `getSnapshot`, `getInitialSnapshot`,
`notifyStateSubscribers`, `syncControlledState`) along with `getState` / `setState` on the table.
These are the react-package call sites, from a sweep across `packages/` **and** `apps/`, including
`.mdx` — the first sweep used a `packages/*/src` glob and missed three real callers, which is why
this list is per-name rather than per-file:

| Deleted                  | React call sites                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getSnapshot`            | `use-data-grid-selector.ts:34`; `state/use-extracted-state.ts:31,68`; `use-data-grid.ts:889,1201`; `data-grid/use-infinite-scroll.ts:65,98`; `prepare-table.ts:18,19`; `prepare-table.test.ts:34,38,44`; `use-data-grid.test.tsx:369,383,388,404,407,442,445`                                                                                                                                                                                        |
| `getInitialSnapshot`     | `use-data-grid-selector.ts:35`; `state/use-extracted-state.ts:69`; `prepare-table.ts:20` (comment); `use-data-grid.ts:890` (comment); `prepare-table.test.ts:35,38,40,46,47`                                                                                                                                                                                                                                                                         |
| `notifyStateSubscribers` | `use-data-grid.ts:1213`                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `syncControlledState`    | `use-data-grid.ts:1185` (comment), `1204`, `1392` (comment); `use-data-grid.test.tsx:425,818` (comments)                                                                                                                                                                                                                                                                                                                                             |
| `table.getState()`       | 41 sites across 18 files — heaviest `use-data-grid.test.tsx` (15), `defaults.test.tsx` (4), `data-grid/draft-bar.test.tsx` (3), `data-grid/data-grid.test.tsx` (3), `data-grid/active-filters-bar.tsx` (3), plus `sort-menu-trigger.tsx`, `clear-filters-button.tsx`, `pagination.tsx`, `header-cell.tsx`, `global-filter-input.tsx`, `draft-bar.tsx`, `state/extract-state.ts`, `use-data-grid.ts`, `types.ts` and four more test files at 1-2 each |
| `table.setState(...)`    | `prepare-table.test.ts:42`; `use-data-grid-selector.test.tsx:44,61,83,103,124,148`; `data-grid/compound-slots.test.tsx:177,209`                                                                                                                                                                                                                                                                                                                      |

`table.subscribe` has no caller outside core — react reached the store through
`getSnapshot`/`getInitialSnapshot` inside `useSyncExternalStore`, which is exactly the machinery
design §4 expects to collapse into `table.Subscribe`.

The seven removed **type narrowings** (`options`, `getRowModel`, `getAllColumns`, `getColumn`,
`getRow`, `initialState`, `setOptions`) break no caller: they narrowed members v9's `Table` still
has, so what was removed is a v8-shaped type, not a method.

`apps/docs/hooks/use-mobile.ts:14,23` matches `getSnapshot` and is **not the grid** — it is React's
own `useSyncExternalStore` over a media query. No action.

### 2.4 Feature registration is mandatory, and omitting one is silent

v9 registers nothing by default. Every grid-own feature the react package relies on must be in the
set it builds, or its state slice, its table members and its row methods simply do not exist. This
is asserted per feature by a D1 test in each feature's suite — e.g.
`core/src/features/editing/editing.test.ts:41-58` constructs a table with `tableFeatures({})` and
asserts `table.atoms.editing`, `table.editing`, `table._editingAbort` and `row.getIsEditing` are all
absent, each read carrying a `@ts-expect-error` so the directive fails the build the day one of them
starts existing unconditionally again.

React must register **`editingFeature`, `creatingFeature`, `deletingFeature`, `draftFeature`,
`loadingFeature`, `infiniteFeature`, `rowOrderingFeature`** or `state.editing`, `table.editing`,
`row.getIsEditing`, `s.loading`, `s.infinite`, `rowOrder` and the rest silently become `undefined`.

Note also a **pre-existing** defect surfaced while porting: `deleting: true` renders a Delete button
that does nothing. PR 2 is the natural place to fix it.

The same rule applies to the three named-function registries. `filterFns`, `sortFns` and
`aggregationFns` are `@deprecated` upstream in favour of the individual `filterFn_*` / `sortFn_*`
members, but they are **load-bearing**: a feature set without `filterFns` silently filters nothing.
Verified by mutation — removing `filterFns` from `allDataGridFeatures` fails 3 tests, removing
`sortFns` + `aggregationFns` fails 3 more.

### 2.5 `ColumnMeta` is invariant, so react must cast to `FormColumnMeta`

Upstream declares both `ColumnMeta` parameters `in out`, so **no** concrete
`ColumnMeta<TFeatures, TRow>` is assignable to any other instantiation. React's
`resolveColumnFormConfig(meta, mode)` call therefore _must_ cast. `FormColumnMeta`
(`core/src/column/resolve-form-config.ts`, exported from `src/index.ts`) is
`ColumnMeta<TableFeatures, object>` and exists for exactly that; it is the same cast `creating.ts`
makes internally at its own boundary. This is forced by the upstream variance annotation, not a
shortcut.

Two related names:

- **`MappedColumnDef`** is internal and pinned to the full `TableFeatures`. If react needs the shape
  of a def this package built, that is the name — not `TanStackColumnDef`, which is generic over a
  set react will have resolved anyway.
- **`RowActionsContext.table`** and **`CreateDefaultValue(s)Context.table`** are
  `Table<TableFeatures, TRow>`, the widest instantiation. A kit passing its own narrow table into
  those callbacks hits TS2379 — the contexts are not generic over a feature set.

### 2.6 `header-cell.tsx:201` reads a resizing option as the grid's direction

```ts
const towardsStart = (e.key === 'ArrowLeft') !== (table.options.columnResizeDirection === GridDirection.Rtl)
```

This is the column-**reordering** Alt+Arrow handler, gated on `canMove` (ordering), not on resizing.
In v9 `columnResizeDirection` is declared on `TableOptions_ColumnResizing` and does not exist
without `columnResizingFeature`, so core now sets it only inside its resizing branch — correctly,
because setting it unconditionally would be the `sortFns` defect again. A grid with `direction: 'rtl'`

- ordering on + resizing off (the default) therefore gets `undefined` and **both reordering
  shortcuts move columns the wrong way, silently**.

The defect is the reader, not the conditional. Corrected line:

```ts
const towardsStart = (e.key === 'ArrowLeft') !== (grid.direction === GridDirection.Rtl)
```

The core-side test that encoded the old contract was rewritten in PR 1
(`create-table-resizing.test.ts`). React's half is PR 2's, and it has two parts: this line, and
`react/react/src/api-shapes.test.tsx:135-137` ("reaches the resize delta with resizing off", whose
doc comment states the invariant as a fact) must be rewritten or deleted **with the reason recorded
in the file**.

One process note that came out of this and applies to every option PR 2 moves: the report that let
this through checked that nothing was now spread where nothing reads it. It did not check the other
direction — that nothing still read where nothing is now written. **Check both.**

### 2.7 `actions-cell.tsx:226` — remove the casts, do not re-arity them

```ts
const actionsCtx: RowActionsContext = { row: row as Row<object>, table: table as Table<object> }
```

Both are v8 arity and will fail against v9's `Row<TFeatures, TData>` / `Table<TFeatures, TData>`.
The casts exist only to erase `TRow` at the `table.options` boundary, and core now types
`RowActionsContext.table` as the widest instantiation (§2.5), so they are worth **removing** rather
than re-arity-ing.

### 2.8 `useTable`'s selector projects from a render-phase wrapper, not from `table.store`

[api-notes.md](./api-notes.md):708 says the optional selector projects from `table.store`. What
`useTable` actually passes is `rootSource: createRenderPhaseSource(tableInstance.store, shallow)`
(`@tanstack/react-table@9.2.4/dist/useTable.js:55`, importing from
`@tanstack/table-core/reactivity`). The conclusion in api-notes is unaffected, but the adapter has to
name the render-phase wrapper, so it changes what PR 2 writes.

Two further `useTable` facts from the same inventory: it returns a **fresh object each render**, and
it spreads `coreReactivityFeature` **before** `tableOptions.features`, so a feature set of ours
carrying that key would win and break rendering — which is why `allDataGridFeatures` omits it, and
why `entry.test.ts:150` asserts the absence on **keys**.

### 2.9 The react typecheck baseline

`pnpm --filter @ez-kit/data-grid-react typecheck` is **380 errors** at `c449d02b`:

| Code   | Count | What it is                                                                                                |
| ------ | ----: | --------------------------------------------------------------------------------------------------------- |
| TS2314 |   100 | v8 arity — `DataTable<TRow>`, `TableState`, `TableConfig`, `GlobalFilteringConfig` now need a `TFeatures` |
| TS7006 |    74 | implicit `any` parameters, cascading from the above                                                       |
| TS2339 |    51 | members that moved or were deleted, incl. `ColumnPinSide.Left/.Right`                                     |
| TS2345 |    47 | argument assignability                                                                                    |
| TS2558 |    42 | wrong type-argument count at call sites                                                                   |
| TS2344 |    31 | constraint failures                                                                                       |
| others |    35 | incl. 10 TS2322, 8 TS2707 (`Column` now takes 2-3 args), 6 TS2698, 6 TS2635                               |

Most of this is mechanical arity. The errors that are **not** mechanical are the ones above: 2.1,
2.5, 2.6, 2.7.

### 2.10 One dependency rule, learned twice

**Do not take a dependency on `@tanstack/store` to fix a `TS2742`.** Core hit that error twice —
once because `DraftAtoms` named `Atom` in its public `.d.ts`, once from a conditional `atoms` spread
in `createTableOptions` — and adding the package re-points `@heroui/styles` from `tailwind-merge@3.5.0`
to `3.4.0` and lifts `form-core` alone to `store@0.11.1` while `react-store` stays at `0.11.0`,
splitting `@tanstack/react-form`'s store stack across two module instances. That hoist was isolated
and proved deterministic, not ambient drift.

The fixes that work: name the type through a `@tanstack/table-core` export — `ExternalAtoms_All` for
a bag of atoms, which is also the better type on its merits, being picked from the very type
`options.atoms` requires — or hoist the value to an annotated local so the alias survives inference.
React and the kits will hit the same error the moment an atom type reaches their public surface.

Core's `pnpm-lock.yaml` is byte-identical to the branch base; the branch's only lock diff is the v9
install in `43ac83c9`. Keep it that way.

### 2.11 Design §4's other react-side items, unchanged

`@tanstack/react-table` and `@tanstack/react-store` enter the react package, and per AGENTS.md each
`size-limit` entry ignores its own package's runtime dependencies — so both go in the `ignore` list
of **every** entry, and the budgets are re-measured after the first green build rather than guessed.
`@tanstack/react-virtual` is unaffected.

---

## 3. What PR 3, PR 4 and PR 6 inherit

### 3.1 PR 3 — pinning outside core

Core's half is done (§1.1a). What remains is everything outside it, and it is now **three** dead
name sets rather than the one the design anticipated:

| Dead name                                   | Sites                                                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ColumnPinSide.Left` / `.Right`             | `react/react/src/utils/pin-styles.ts:21,22,24,25`; `data-grid/column-menu-sections.ts:116,122,126,…`                                        |
| `GridMenuIcon.PinLeft` / `.PinRight`        | `react/react/src/data-grid/column-menu-sections.ts:15,16,120,130`; `shadcn/src/blocks/icons.tsx:41,42`; `heroui/src/blocks/icons.tsx:37,38` |
| `messages.columnMenu.pinLeft` / `.pinRight` | `react/react/src/data-grid/column-menu-sections.ts:119,129`                                                                                 |

The latter two are a **breaking change for each kit's icon map and for any consumer's message
override**, on top of the CSS variable rename design §5 already scopes. All three belong in PR 3's
changeset text in those words.

The physics are still where §5 says: `pin-styles.ts` writes `--dg-pin-left` / `--dg-pin-right` from
`column.getStart(…)` / `column.getAfter(…)`; everything else only compares `getIsPinned()`.

### 3.2 PR 4 — docs

Three documented APIs no longer exist, each found by the corrected sweep (§2.3) rather than the
first one:

- **`apps/docs/content/docs/data-grid/editing/creating.mdx:60`** documents
  `creating: { defaultValue: ({ table }) => table.getRowCount() + 1 }`. In v9 `table_getRowCount` is
  exported from `features/row-pagination/rowPaginationFeature.utils`, **not** from core — so on a
  grid without `rowPaginationFeature` this is a runtime `TypeError`, not a type-only staleness.
- **`packages/data-grid/core/README.md:38`** tells readers to "drive state via `table.setState(...)`".
  The method is deleted. This is published npm text, so it is a real consumer-facing error.
- **`apps/docs/content/docs/data-grid/pagination/infinite-scroll.mdx:113`** documents
  `table.appendData(rows)` as public. `appendData` survives — it belongs to `infinite` — but it is
  rebuilt on the adapter input path, and `apps/docs/test/docs-options/page-type-map.ts:1404` pins
  that row.
- **`apps/docs/content/docs/data-grid/editing/creating.mdx:73`** uses
  `table.getState().pagination.pageIndex` in a live `defaultValues` example.

`config.onStateChange` **survives and works** — it was reimplemented in PR 1 as one
`table.store.subscribe(() => config.onStateChange?.(table.store.state))`, gated on the callback
existing so an uninterested grid carries no subscriber. Its docs consumers do not need rewriting:
`state/controlled.mdx`, `production.mdx`, `columns/resizing.mdx`, and the six example components fed
by `production/use-orders-state.ts:90`. One behaviour under it **did** change; see §4.4.

Beyond the stale pages, design §6 stands: `page-type-map.ts` needs `TableConfig<TRow>` →
`TableConfig<TFeatures, TRow>`, and `docs-option-names.test.ts` needs built packages, so it stays red
inside the integration branch until core builds — which it now does.

### 3.3 PR 6 — the tail

The changeset is written from §1.1 above: four deviations, each a consumer-visible statement. The
pinning rename (a) is three separate breaks, not one; (d) is a spec claim not delivered and should
say so plainly rather than be quietly dropped.

AGENTS.md's three required edits from design §7 are unchanged, and two more are earned by PR 1:

- the `_features` framing is now doubly stale — it was the v8 internal registration array, and the
  v9 `_features` table option exists but holds `Partial<CoreFeatures> & TFeatures`;
- the settled-decisions section should record that the **grid-own feature guards are runtime-only**
  (§1.1d), so a later audit does not read the retracted docblocks as a regression.

Also in the blast radius, per design §6 and unchanged: `e2e-slots.test.ts`, `tree-shaking.test.ts`
(§4 wants a new case proving a grid assembled without `editingFeature` does not reach editing code —
now genuinely writable, which it was not under v8), and the shadcn registry payload via
`registry:build`. And the changesets trap: every breaking change here is `minor`, because `major`
against `0.x` publishes `1.0.0`.

---

## 4. Decided during PR 1 — do not re-litigate

Each of these was proposed, tested against the installed package or the compiler, and settled. Two
of them overturned a decision made from the plan.

### 4.1 The guard constants stay four, and are not consolidated

`create-table-options.ts` holds four dev-warning catalogues: `REQUIRED_FEATURE` (a config key → the
feature it needs), `REQUIRED_FACETED_FEATURES` (three members behind one condition),
`FILTER_FNS_SLOT` (a registry slot, not a feature), and `CONDITIONAL_REQUIRED_FEATURES` (a feature
whose ask lives on a sub-axis, behind a predicate). Consolidating them into one
`{ option, member, askedBy }` shape was ruled for, twice, and **rejected on evidence both times**.

The evidence: each `REQUIRED_FEATURE` key does **double duty** as the config field read and the
label printed, and `satisfies Partial<Record<keyof TableConfig, …>>` turns a bad key into a `TS2561`
_with a "did you mean"_ — falsified directly by renaming `sorting` → `sortng` and reading the
diagnostic. Splitting label from predicate, which the consolidated shape requires, would make "says
`sorting`, tests `filtering`" **compile**: this branch's signature defect, inside the code written to
catch it. The rejection is recorded at `REQUIRED_FEATURE` so it is not re-proposed from the plan.

The split into four also has a load-bearing reason, found by measurement rather than reasoning:
`isFeatureEnabled(config.ordering)` is true for a bare `ordering: true` (columns only), so an
`ordering` entry in `REQUIRED_FEATURE` would fire on the commonest grid in the repo; `pagination` is
already taken by `rowPaginationFeature`, so `infinite` cannot key by it; and `loading` has **no**
`TableConfig` key at all. Only `editing`, `creating`, `deleting` and `draft` are plain top-level keys.
The trap — a key that can be `true` while its real ask lives on a sub-axis — is written at the
catalogue so the next person adding an entry meets it.

All eight entries across the two feature catalogues are exercised by the `it.each` at
`create-table-options.test.ts:410-431`, and each fails when removed.

### 4.2 `draft` gets one atom set, and the caller mints it

Design §2 left the two-atoms-versus-one question to be fixed against the installed types. The types
answer it: `atoms` is `readonly atoms?: ExternalAtoms<TFeatures>` where `ExternalAtoms` is a
`Partial`, and precedence is `options.atoms[key] > options.state[key] > baseAtoms[key]`. One set,
therefore — three writable atoms from `createDraftAtoms(config.initialState)`, built **once in
`createTable`** (`create-table.ts:59-70`) and passed as `options.atoms`. `applied` stays an ordinary
internal slice. They must be minted by the caller, not inside the pure resolver, because `useTable`
replaces `atoms` wholesale each render and a resolver-built set would reset the draft per keystroke.

The atoms are made via `storeReactivityBindings().createWritableAtom`, so no new dependency, and
`DraftAtoms` is `Required<Pick<ExternalAtoms_All, 'sorting' | 'columnFilters' | 'globalFilter'>>` —
picked from the very type `options.atoms` requires, so the members cannot merely _resemble_ what the
table accepts (§2.10).

Reads and writes go through `readForeignSlice` / `writeForeignSlice` rather than a typed handle in
instance data, deliberately: both already resolve `options.atoms[key] ?? baseAtoms[key]`, and a
deferred axis's own feature is optional — `tableFeatures({ rowSortingFeature, draftFeature })` has no
`columnFilters` slice at all, and `constructTable` builds `table.atoms[key]` only for
`Object.keys(table.initialState)`, so a handle would read an orphan atom there.

One consequence binds anyone touching `draft`: `table_reset` writes `table.baseAtoms[key]` directly
and never touches an external atom (`constructTable.js:88-92` returns the external atom's value
without consulting `options.state` at all), so **an externally-owned slice is not restored by
`reset()`**. The draft feature self-restores its three axes in `resetTableInstanceData`, guarded on
deferral. For every _other_ feature the opposite rule holds: seed the slice in `getInitialState` and
`reset()` closes it for free — `table_reset` folds every feature's initial state back through
`baseAtoms` in one batch _before_ it calls any `resetTableInstanceData` hook, so that hook holds only
what state restoration cannot do, which is tearing down an in-flight `AbortController`.

### 4.3 A feature's own-slice write routes through `options.on<Slice>Change`

`writeOwnSlice` prefers `options.on<Slice>Change` when present and falls back to `makeStateUpdater`
when absent. It does not write the atom directly, and it does not go straight to `makeStateUpdater`.

Two reasons, both measured. `makeStateUpdater` skips the per-slice consumer callback **and** the
`columnPinning` / `columnVisibility` invariant enforcement that `bindStateHandlers` installs, so a
feature write that v8 routed via `table.setState` would silently fire neither — hitting
`deleting.deselect()` and `draft.apply()`. And v9's own `table.set<Slice>()` routes that way, so a
feature writing its own slice should take the same path as a stock setter. No recursion: the
installed handler writes via `makeStateUpdater` and _then_ calls the consumer, so routing into it
terminates.

The option name is **derived** — `on${Capitalize<key>}Change` — not looked up in a map. A map
would silently drop custom slices, which is the same defect one level down. The derivation was
checked against all 14 `TableState_All` slices and all 14 stock `on…Change: makeStateUpdater(…)`
pairs, including the four irregular-looking ones (`columnFilters`, `columnOrder`, `expanded`,
`globalFilter`), with no counterexample.

`writeForeignSlice` keeps its presence check and stays a **no-op** on an unregistered slice, where
`writeOwnSlice` **throws** with the slice named. That asymmetry is proven by disjoint mutation sets:
removing the foreign guard flips exactly the foreign no-op case; removing the own guard flips exactly
the two diagnostics cases; removing the routing flips exactly the on-change and invariant cases.

Also settled here: the accessor exports `SliceKey` / `SliceOf` / `AnyTable`, and a real
`Table<TFeatures, TData>` satisfies `AnyTable` with **no cast** — `AnyTable` is byte-for-byte
upstream's own `instance` parameter from `dist/utils.d.ts:40-45`. And every ported feature must
augment `TableState_All` as well as `TableState_FeatureMap`, or it cannot name its own slice; that is
locked in by a test that fails to compile without it.

### 4.4 A controlled write to a deferred axis no longer lands, and that is forced

Under v8, passing `state.sorting` to a grid with `draft` on would land while the draft was clean. It
no longer does — clean or dirty. This is **forced by v9's atom precedence**, confirmed from installed
source: `constructTable.js:88-99` resolves
`const reactiveState = externalAtom ? externalAtom.get() : baseAtoms[key].get(); if (externalAtom) return reactiveState;`
— `options.state` is never consulted once an external atom exists. Preserving the old behaviour would
mean mirroring `config.state[axis]` into the atom behind a dirtiness check, i.e. re-hand-writing the
`DRAFT_AXES` guard that design §2 deleted.

It is nonetheless a **real public behaviour change** and must be visible in PR 6's changeset and in
PR 4's docs, not merely noted here. The test that pins it states the new behaviour positively and
asserts both that the write is ignored and that the draft is intact (`draft.get().sorting` unchanged,
`isDirty() === false`) — pinning that the write is _ignored_ rather than merely invisible.

Related and settled: `onDraftApply` is **not** a public option. It is internal wiring on TanStack's
options bag (written at `create-table-options.ts:919`, read at `deferred-apply.ts:297`, exported from
neither entry), needed because at `apply()` the live axes do not move, so there is no write to hang a
per-axis callback on. The consumer's spelling is unchanged: `sorting.onChange` /
`filtering.onChange` / `globalFiltering.onChange`. AGENTS.md's settled decisions govern the public
option vocabulary; nothing there is violated.

### 4.5 Smaller things that were settled with evidence and should stay settled

- **`sortFns` belongs in `options.features`, not in table options.** `constructTable.js:26`
  destructures it straight out of `tableOptions.features` into `table._rowModelFns`; it is never read
  off top-level options. Same for `filterFns` and `aggregationFns`.
- **Prototype methods receive the row first.** `assignPrototypeAPIs` prepends the instance in _both_
  branches (`fn(this, ...args)` at `dist/utils.js:337`, `fn(self, ...deps)` at `:328`), while
  `assignTableAPIs` installs `fn` verbatim at `:299-309`. `editingFeature` is the only feature using
  `assignRowPrototype`, and this is proven by a test whose logic depends on the argument order, then
  falsified by substituting a table-wide closure.
- **A namespace object (`table.editing`, `table.creating`, …) goes through `initTableInstanceData`
  plus `assignTableInstanceData`, never `assignTableAPIs`,** which installs one function per key.
  `assignTableInstanceData` is keyed on `Table_FeatureMap[F]`, so a misspelled feature key is
  `TS2345`, a misspelled member `TS2561` and a missing one `TS2345` — a compile error, not a runtime
  one, within the stated limit that excess-property checking covers a literal argument and not a
  widened or cast one.
- **Both `rowSelection` truthiness filters stay**, at `deleting.ts:363` and
  `create-table-options.ts:1019` (`notifySelection`). v9 narrowed `RowSelectionState` to
  `Record<string, true>`, so the type says they are dead. The atom can be **consumer-owned**, and
  nothing at runtime rejects a literal `false`; dropping either would promote a deselected row to
  selected. Each is kept behind a documented reason at the site and each is now covered by a case
  that fails when it is removed.
- **The closed-state constants are frozen at two levels** in `creating.ts` and `editing.ts`, because
  `{ ...INITIAL_STATE }` aliases the nested `values` / `errors` objects by reference. `deleting`'s is
  two primitives, so its freeze is degenerate and documented as such rather than copied blindly.

---

## 5. Deliberately not done

Three follow-ups PR 1 chose not to take, each with what it costs to leave.

**The compile-time feature gate (§1.1d).** It is achievable: `tableFeatures()` returns what it was
given, so `typeof features` carries the registered keys, and `TableConfig` could intersect roughly
twelve conditional blocks. Two costs decided against it _inside PR 1_. It degrades the diagnostic —
the named `TS2561 … did you mean 'sorting'?` becomes "not assignable to `A & B & C…`" — and it
**breaks `apps/docs/test/docs-option-names.test.ts`**, whose `ts.TypeChecker.getPropertiesOfType()`
cannot see through a conditional intersection, taking its 430-name coverage over 114 pages with it.
That test is the repo's strongest guard against fabricated option names, so the gate is its own
follow-up, sized against the docs test's resolver, not a loose end of this migration. **Cost of
leaving it:** the type-level half of design D1 is unshipped and a mis-registered config is caught
only at runtime, by the guard catalogue and nothing else.

**`createTableOptions` is 676 lines, in a 1118-line file.** The function runs from
`create-table/create-table-options.ts:443` to the end of the file. AGENTS.md's ceilings are functions
under 50 lines and files 200-400 typical / 800 maximum, so this is past both. It was already the
largest function in the package before the migration and grew with the guard catalogue and the
options mapping. The `// ──` banners inside it are the seams an extraction would cut along. **Cost of
leaving it:** the single hardest file in the package to review stays that way through four more PRs,
and PR 2 will read it.

**The `rowSelection` truthiness narrowing beyond the two sites already handled.** The sweep that
found them was scoped to package code testing a `rowSelection` _value_ for truthiness, and found
exactly two. The wider question — every place in the repo where v9 narrowed a state type and a
runtime check consequently looks dead — was not swept. The rule to apply if it is: a type-dead check
on a possibly-consumer-owned atom gets a **documented disable, not a deletion**. **Cost of leaving
it:** a future tidy-up removes such a check on the types' authority and silently changes behaviour,
which is the exact defect the two documented disables exist to prevent.

One more, smaller: `CreatingMode` / `EditingMode` still live inside their feature modules, so core's
main entry reaches three feature modules. Measured to cost a consumer nothing — the feature objects
are dropped from the bundle — and left recorded rather than restructured. It is a clean ~20-line
change (move each enum to `features/<f>/mode.ts`, re-export from the feature module so `/features` is
unchanged) if anyone wants the entry graph tidy.

---

## 6. Two notes on method, earned the hard way

**A falsification is only as good as the fixture's ability to observe the mistake.** The `apply()`
granularity regression — all three deferred-axis handlers firing when any axis was dirty, where v8
fired each only when its own applied value moved — survived two tests that came close. One moved
_both_ sorting and columnFilters before applying, so guarded and unguarded were indistinguishable;
the other built its table with no sorting spy at all, so the spurious call had nothing to land in.
Each mechanism had been falsified; the _granularity_ of one had not.

**The snapshot regime was the real backup, twice.** PR 1 ran as a single commit (the mid-migration
tree carried ~2669 type-aware lint errors, so the pre-commit hook could not pass until the last
feature was ported), with per-task directory snapshots standing in for per-task commits. Both times
uncommitted work was destroyed mid-task, those snapshots are what established that the recovery was
byte-faithful. If a later PR in this migration has to run the same way, keep them.
