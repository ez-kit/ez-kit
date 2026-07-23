# Design: Standardize the data-grid UI-kit contract

**Date:** 2026-07-02
**Status:** Approved (pending spec review)
**Scope:** `packages/data-grid/react/react` (contract), `packages/data-grid/react/{shadcn,heroui,native}` (consumers)

## Goal

Make plugging a UI kit into the headless data-grid easy — for us (shadcn / heroui /
native) and for a third party who has their own UI kit on another project. The
contract already exists (`GridComponents` in `react/src/types.ts`); this work
_hardens, de-duplicates, and documents_ it. No architectural rewrite.

## Problem statement

The headless `react` package is already fully decoupled from visuals: it ships zero
styling and consumes UI primitives through a DI registry (`GridComponents`), wired in
via `createDataGrid({ components })`. What makes onboarding a new kit rough today:

1. **All ~40 components are `optional`.** `satisfies GridComponents` type-checks the
   props of what you _do_ pass, but never that the set is complete. A forgotten `Td`
   surfaces as `undefined is not a component` at runtime, not a build error.
2. **No core-vs-feature tiering.** Nothing tells an implementer whether rendering a
   basic table needs 6 components or all 40.
3. **Wiring boilerplate is duplicated verbatim.** Each kit's `data-grid.tsx` repeats
   an identical `extendDataGrid` closure plus the `createDataGrid` + re-export dance.
4. **The contract lives only in `types.ts`.** An external developer must reverse-engineer
   the types; there is no single "implement this" document.
5. **The CSS / `data-slot` contract is implicit.** A kit can forget
   `import '@ez-kit/data-grid-react/styles.css'` and get a broken layout with no diagnostic.

## Non-goals

- No scaffold / generator for new kits (explicitly deferred).
- No change to how features are configured per-`useDataGrid` call.
- No new public factory function name — see decision below.
- No visual styling added to the `react` package (project constraint stands).

## Decisions (locked)

- The full-support marker type is named **`FullGridComponents`** (= `Required<GridComponents>`).
- The de-duplication is done by **folding `extendDataGrid` into the existing
  `createDataGrid` return value** — no new factory function. Kits write:
  ```ts
  const { DataGrid, useDataGrid, GridComponentsProvider, extendDataGrid } = createDataGrid({ components, cellTypes })
  ```
- Scaffold generator is out of scope for this spec.

## Design

### 1. Tier the contract + enforce completeness at the type level

Add a `contract.ts` module to the `react` package that groups the existing component
keys by feature. `GridComponents` stays exactly as-is (all-optional) — it remains the
injectable shape, because a minimal/partial kit is still valid. The new artifacts are
_obligation_ types layered on top:

```ts
// react/src/contract.ts
export type GridCoreComponents = Required<
	Pick<GridComponents, 'Table' | 'Thead' | 'Tbody' | 'Tr' | 'Th' | 'Td' | 'Button' | 'Input' | 'Checkbox' | 'Toolbar'>
>
export type GridPaginationComponents = Required<Pick<GridComponents, 'Pagination' | 'PageSizer'>>
export type GridSortingComponents = Required<Pick<GridComponents, 'SortIndicator' | 'SortMenu' | 'ColumnMenu'>>
export type GridFilteringComponents = Required<
	Pick<
		GridComponents,
		| 'FilterPopover'
		| 'FilterPanel'
		| 'FilterPanelChip'
		| 'FilterChip'
		| 'ClearFiltersButton'
		| 'GlobalFilterInput'
		| 'OperatorSelect'
		| 'BetweenInput'
		| 'MultiSelectFilter'
	>
>
export type GridEditingComponents = Required<
	Pick<GridComponents, 'Modal' | 'FormShell' | 'ActionsCell' | 'CreatingActionsCell' | 'ConfirmDialog' | 'NumberInput'>
>
export type GridSelectionComponents = Required<Pick<GridComponents, 'SelectionBar'>>
export type GridPinningComponents = Required<Pick<GridComponents, 'RowPinMenu'>>
export type GridResizingComponents = Required<Pick<GridComponents, 'Resizer'>>
export type GridStateComponents = Required<
	Pick<GridComponents, 'LoadingRow' | 'EmptyState' | 'NoResultsState' | 'RefetchOverlay'>
>
export type GridInfiniteComponents = Required<Pick<GridComponents, 'LoadMoreRow'>>
export type GridColumnComponents = Required<Pick<GridComponents, 'ColumnVisibilityMenu'>>
export type GridExpandComponents = Required<Pick<GridComponents, 'Chevron'>>

/** A kit that advertises full support for every feature. */
export type FullGridComponents = Required<GridComponents>
```

**Core** (`GridCoreComponents`) = the minimum to render a basic table:
`Table, Thead, Tbody, Tr, Th, Td, Button, Input, Checkbox, Toolbar`. Everything else is
grouped by the feature that needs it. The single source of truth for the key→feature
grouping is a `COMPONENT_FEATURE: Record<keyof GridComponents, GridFeature>` map, from
which the dev-time guard (§3) derives its error messages.

Our three in-repo kits declare full support, so they switch from
`satisfies GridComponents` → `satisfies FullGridComponents`. A missing component
becomes a **compile error** instead of a runtime crash. External kits keep using
`GridComponents` (partial support) or opt into any subset of the tier types they claim.

All tier types are exported from `react/src/index.ts`.

### 2. Fold `extendDataGrid` into `createDataGrid`

`createDataGrid({ components, cellTypes })` gains one more return field, `extendDataGrid`,
bound to the same `components` + `cellTypes` closure:

```ts
// inside createDataGrid, alongside the existing return
function extendDataGrid<TExtra extends CellTypeRegistry>(extra: TExtra) {
	return createDataGrid({ components, cellTypes: { ...cellTypes, ...extra } as TCellTypes & TExtra })
}
return {
	DataGrid: BoundDataGrid,
	useDataGrid,
	useDataGridStore,
	GridComponentsProvider,
	defineColumns,
	createColumnHelper,
	extendDataGrid,
}
```

Each kit's `data-grid.tsx` then drops its hand-written `extendDataGrid` function and the
`createDataGrid` re-export dance, keeping only the kit-specific `components` object plus a
single destructure. `createDataGridInstance`-style consumers are unaffected.

`CreateDataGridOptions` and the `createDataGrid` return type in `create-data-grid.tsx`
are updated; the new `extendDataGrid` is added to the exported types.

### 3. Dev-time completeness guard (closes the runtime gap for partial kits)

For kits that legitimately use `GridComponents` (partial), a feature can still reference a
component the kit did not register. Rather than wrap all ~35 injected-component read sites
(invasive) or Proxy the merged registry (unsafe — `GridComponentsProvider` spreads the
context value, so a throw-on-undefined Proxy would break nested providers), add a **single
dev-only guard component** mounted once inside the provider tree by the DataGrid root
(`ComponentGuard`). It renders nothing and, if a required component is missing, throws one
aggregated, actionable error:

```
[data-grid] Missing required UI-kit component(s):
  - Table (core)
  - ConfirmDialog (editing)
Register them via createDataGrid({ components }) or a local <DataGrid components={{…}} /> override.
```

- It asserts only components whose need is **unambiguous at render time**, so it can never
  fire a false positive: the always-rendered structural primitives
  (`Table, Thead, Tbody, Tr, Th, Td`) plus components gated by a config that is definitively
  present (`ConfirmDialog` when `deleting.confirmation`, `FormShell` when creating/editing
  `mode === 'modal'`, `SelectionBar` when the selection-bar config is set). Broader coverage
  comes from `satisfies FullGridComponents` at author time.
- Mounted as `{IS_DEV && <ComponentGuard />}` (`IS_DEV = process.env.NODE_ENV !== 'production'`),
  so it is stripped from prod builds and adds no runtime cost there.
- Feature names in the message come from the `COMPONENT_FEATURE` map in §1 (single source of
  truth).

### 4. Single contract document

Add `packages/data-grid/react/react/CONTRACT.md` — the "implement this" reference an
external developer reads. One row per component:

| Component | Tier / feature | Props type | Required `data-slot` | Notes |
| --------- | -------------- | ---------- | -------------------- | ----- |

Plus a short preamble covering:

- The two obligations every kit has: register components + `import '@ez-kit/data-grid-react/styles.css'` once at the kit/app root.
- `FullGridComponents` vs partial `GridComponents`.
- That the `react` layer emits `data-slot="…"` structural hooks; the kit's CSS targets them.

Authored by hand for v1 (kept next to `types.ts` so it is easy to keep in sync); codegen
from JSDoc is a possible later enhancement, not part of this spec.

## Rollout order

Each step is independently shippable and valuable on its own:

1. **Tiers + `FullGridComponents`; migrate shadcn/heroui/native to `satisfies FullGridComponents`.**
   Immediately surfaces any current gaps as compile errors. Highest value, lowest risk.
2. **Fold `extendDataGrid` into `createDataGrid`; delete the per-kit duplication.**
3. **Dev-time guard** in the `react` layer.
4. **`CONTRACT.md`.**

## Testing

- **Contract types:** a `contract.test-d.ts` (type-level) asserting `FullGridComponents`
  equals `Required<GridComponents>` and that each tier is a subset of it. Migrated kits
  compiling under `satisfies FullGridComponents` is itself the completeness test.
- **`extendDataGrid`:** unit test in `create-data-grid.test.tsx` — extending adds custom
  cell types and the returned `defineColumns` is typed to the merged keys; the base bundle
  still works.
- **Dev-time guard:** unit test that rendering a feature with its component omitted throws
  the named error in dev and does **not** throw (guard stripped) when
  `NODE_ENV === 'production'`.
- **Regression:** existing shadcn/heroui/native test suites must stay green (they exercise
  the real wiring after the `extendDataGrid` fold).

## Risks & mitigations

- **Migrating to `satisfies FullGridComponents` reveals a real gap in a kit.** That is the
  point — fix by implementing the missing block. If a kit intentionally lacks a component,
  it stays on `GridComponents` (partial) and relies on the §3 guard.
- **Tier grouping drifts from the actual feature that consumes a component.** Mitigated by
  deriving the guard's `COMPONENT_FEATURE` map from the same tier keys, so grouping and
  error messages share one source of truth.
- **`extendDataGrid` generic merge (`TCellTypes & TExtra`).** Covered by the type-level and
  unit tests above; behavior must match the current per-kit `extendDataGrid`.

## Addendum — grouping refinements (as-built)

Two follow-up refinements applied after the initial approval:

1. **Nested feature map as the single source of truth.** Instead of a flat
   `COMPONENT_FEATURE` written by hand, the source of truth is a nested
   `FEATURE_COMPONENTS: Record<GridFeature, readonly (keyof GridComponents)[]>`
   (`satisfies` forces every feature to be present). Both the flat `COMPONENT_FEATURE`
   lookup (used by the guard) and every `Grid*Components` tier type are _derived_ from it
   (`ComponentsFor<F> = Required<Pick<GridComponents, (typeof FEATURE_COMPONENTS)[F][number]>>`),
   so the grouping lives in exactly one place. All three are exported.

2. **`blocks/` mirror the feature grouping.** Each kit's components are organized into one
   folder per feature (`blocks/core/`, `blocks/pagination/`, …) matching `FEATURE_COMPONENTS`,
   so the file tree reads like the contract. Applied to `shadcn`, `heroui`, and `native`
   (native was split from a single `components.tsx` into per-component files under the same
   folders, with a thin assembly file building `nativeComponents`). `cell-types.ts` /
   `cell-types/` stay at `blocks/` root (not `GridComponents`). shadcn's `components/ui/**`
   (vendored) is untouched. The convention is documented in `CONTRACT.md`.

3. **The DI registry itself is nested end-to-end — no flattening.** The public `GridComponents`
   (partial) and `FullGridComponents` (full) types are now feature-grouped mapped types
   (`{ [F in GridFeature]: ComponentsFor<F> }`), derived from `FEATURE_COMPONENTS`. Kits register
   the nested object (`{ core: {…}, pagination: {…}, … } satisfies FullGridComponents`), the
   context stores it nested, and consumers read it the same way (`useGridComponents().core.Table`).
   The former flat shape survives only as an internal type, `GridComponentRegistry` (the members of
   each group). `GridComponentsProvider` merges an override group-by-group (`mergeGridComponents`);
   there is no flatten step anywhere. The dev guard resolves a component through its feature group
   via `COMPONENT_FEATURE`.
