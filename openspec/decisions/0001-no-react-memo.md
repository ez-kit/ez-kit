# 0001. No `React.memo` in the data grid

- Status: Accepted
- Recorded: 2026-10-26 (moved from `AGENTS.md`; the decision itself predates this record)

## Decision

The three data-grid React packages and the data-grid docs examples use **no `memo` / `React.memo`**. Re-renders are isolated by selector subscriptions (`useDataGridState`, `useDataGridSelector`, `useGridContext`, each with `{ compare }`), by stable values (`useMemo` / `useCallback` on **values**) and by composition. ESLint enforces it (`no-restricted-syntax` + `no-restricted-properties`; the GridMessages block spreads `NO_MEMO_IMPORT_SYNTAX` into its own list — keep it there), and `data-grid/host-rerender-isolation.test.tsx` holds the guarantee. The only legitimate disable is a test proving the grid **accepts** a consumer's memo-wrapped renderer.

## Context, rationale and rejected alternatives

The three data-grid React packages and the data-grid docs examples use **no `memo` / `React.memo`**,
and adding one to a row, a cell or any other component is rejected. Re-renders are isolated by
three mechanisms instead:

- **selector subscriptions**: a component re-renders because the slice it selected changed —
  `useDataGridState`, `useDataGridSelector` and `useGridContext`, all on `@tanstack/react-store`'s
  `useSelector`, each taking `{ compare }` (`shallow` for a derived object);
- **stable values**: every value the grid publishes or passes on keeps its identity while its
  inputs are unchanged, with `useMemo` / `useCallback` on **values** as the tool;
- **composition**: a layout passed as `children`, or an element the grid builds once, is not
  re-rendered by its host.

The reason is the defect this replaced. `DataGridControlled` merged the cell-type registry inline,
so every render of the component hosting `<DataGrid>` handed every cell a new registry and
re-rendered all of them. A memo boundary around a cell would have hidden that rather than fixed it,
while costing a props comparison per row and per cell on every render. The two `memo`s
`items-source/host.tsx` used to carry are now element identity: `DataGridControlled` builds
`<ItemsSourceHost />` once, and `ActiveRunners` builds its runner elements once per active set.
`data-grid/host-rerender-isolation.test.tsx` holds the guarantee. It asserts that a host
re-render reaches no cell, header cell or row, and that a live value in `context` reaches only
the cells that select it. Its header comment records which providers rebuild their value per
render on purpose (`VirtualProvider`, whose rebuild **is** the virtualizer's scroll notification)
and why.

ESLint enforces it (`eslint.config.mjs`): `no-restricted-syntax` for `import { memo } from 'react'`
and `no-restricted-properties` for `React.memo`. The import half is a `no-restricted-syntax`
selector, not `no-restricted-imports`, because the latter reports every `import * as React` once
`importNames` is set. Since a later block's `no-restricted-syntax` replaces an earlier one's, the
GridMessages block spreads `NO_MEMO_IMPORT_SYNTAX` into its own list. Keep it there. Two tests
disable the rule on one import line each, because they hold the grid to **accepting** a
consumer's memo-wrapped renderer. That is the only legitimate use: a consumer may pass one, and
the package must not write one.
