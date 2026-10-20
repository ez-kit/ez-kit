# Proposal

## Why

The data-grid already keeps its state and its `context` option in TanStack Store atoms, but the
promise that "a selector re-renders only what it reads" does not hold in practice:

- Every render of the component hosting `<DataGrid>` re-renders **every cell**, because
  `DataGridControlled` hands `CellTypesProvider` a registry rebuilt on each render
  (`mergeCellTypes(...)` at `data-grid/data-grid.tsx:572`), and cells read that context through
  `useCellTypes()`. That cancels both the `children` bail-out a consumer could use and every
  selector below it.
- The three subscription hooks (`useDataGridSelector`, `useDataGridState`, `useGridContext`) are
  hand-rolled on `useSyncExternalStore`. They re-implement what `@tanstack/react-store`'s
  `useSelector` already does, and they carry a sharp contract — a selector returning a fresh
  object loops forever — that `useSelector`'s `compare` option removes. The package was kept off
  `react-store` during the v9 migration out of caution about a second `@tanstack/store` copy, not
  because of a defect in it; that risk is manageable by matching `@tanstack/react-table`'s range.
- Two patterns that make live values cheap are undocumented: putting a **store** (not a value)
  into `context`, and keeping state in a host that passes the layout through `children`.

## What Changes

- `@ez-kit/data-grid-react` declares `@tanstack/react-store` as a direct dependency, with the
  same range `@tanstack/react-table` declares, so one copy of `@tanstack/store` serves the grid.
- `useDataGridSelector`, `useDataGridState` and `useGridContext` are rebuilt on `useSelector` and
  accept an optional `{ compare }` argument. A selector that returns a fresh object no longer
  loops; with `compare: shallow` it re-renders only when the object's fields change. Existing call
  sites keep their behaviour (additive, not breaking). `GridContextAtom`'s public shape is
  unchanged.
- Every context value `<DataGrid>` publishes stays referentially stable while its inputs are
  unchanged, so re-rendering the grid's host re-renders only components whose subscribed value
  changed. Starts with the cell-type registry; the remaining providers are audited.
- Isolation is achieved **without `React.memo`**: through selector subscriptions, values kept
  stable with `useMemo` / `useCallback`, and `children` composition. The two existing `memo`s in
  `items-source/host.tsx` are replaced by element identity. A new ESLint rule forbids `memo` /
  `React.memo` in the data-grid React packages and in the data-grid docs examples.
- Docs: `state/context.mdx` gains a section on passing a store through `context`; a new page
  `state/rendering.mdx` explains what re-renders and the host-plus-`children` pattern, with a live
  example for both kits.

## Capabilities

### New Capabilities

- `data-grid-render-isolation`: how state, context and option changes propagate to rendered
  components — selector subscriptions with an optional comparison, referentially stable provider
  values, and the guarantee that a layout passed as `children` is not re-rendered by its host.

### Modified Capabilities

None.

## Impact

- **Code**: `packages/data-grid/react/react/src/use-data-grid-selector.ts`,
  `data-grid/table-context.tsx`, `grid-context.tsx`, `data-grid/data-grid.tsx` (provider values),
  `items-source/host.tsx`, plus any provider the audit finds unstable.
- **Tooling**: a new block in `eslint.config.mjs` (`no-restricted-imports` +
  `no-restricted-properties`), and the rule recorded in `AGENTS.md`.
- **Dependencies**: `@tanstack/react-store` becomes a direct dependency of
  `@ez-kit/data-grid-react` (already in the tree transitively via `@tanstack/react-table`); it is
  added to every `size-limit` `ignore` list of that package. No new package downloads.
- **Public API**: optional third/second parameter on the three hooks; no removals.
- **Docs**: `apps/docs/content/docs/data-grid/state/{context,rendering}.mdx`, `state/meta.json`,
  a new manifest example, and `apps/docs/test/docs-options/page-type-map.ts`.
- **Release**: a minor changeset for `@ez-kit/data-grid-react` (not the shadcn kit — it is
  ignored by changesets).
