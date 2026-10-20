# Design

## Context

See proposal.md, Why. The current state that shapes the approach:

- Grid state lives in `table.store`, a TanStack `ReadonlyStore` (`get()` + `subscribe()` returning
  a `Subscription`). The `context` option lives in a `GridContextAtom`, built from
  `table._reactivity`. Under `useTable`'s render-phase binding its subscribers wake at the
  table's `commit()` (see the `createGridContextAtom` docblock); the vanilla binding notifies
  synchronously.
- `@tanstack/react-store@0.11.1` is already installed, as a dependency of
  `@tanstack/react-table@9.2.4` (`"^0.11.1"`). Its `useSelector(source, selector?, { compare? })`
  wraps `useSyncExternalStoreWithSelector` from the `use-sync-external-store` shim. Its `source`
  only needs `get()` and `subscribe()` returning `{ unsubscribe }`. Its React peer range covers the
  package's own `react >=18`, and the package's `test:react18` run still applies.
- `@tanstack/react-form@1.33.2` declares `@tanstack/react-store: ^0.11.0` (a range, not an exact
  pin), and `@tanstack/form-core@1.33.2` declares `@tanstack/store: ^0.11.0`. The form packages
  never share atoms with the grid (`specs/005-tanstack-table-v9/api-notes.md`).
- `DataGridControlled` (`data-grid/data-grid.tsx`) computes
  `mergeCellTypes(tableCellTypes ?? {}, cellTypes ?? {})` inline. `CellTypesProvider` memoises on
  `[parent, cellTypes]`, so the fresh object invalidates it on every render, and every
  `useCellTypes()` reader re-renders: three call sites in `cell.tsx`, plus `header-cell`,
  `footer-cell`, `filter-panel`, `creating-row` and `auto-form`.
- `GridBody` already renders `children` as-is, and the table object `useDataGrid` returns is a
  `useState`-held `view`, so `TableProvider`'s value is already stable.

## Goals / Non-Goals

**Goals:**

- One read path: every grid subscription hook goes through `useSelector`.
- Provider values that only change when their inputs do.
- A regression test that fails if a host re-render reaches the cells again.

**Non-Goals:**

- Changing `GridContextAtom`'s public shape or its render-phase timing.
- Stabilising values the **consumer** passes in (`columns`, `cellTypes`, an inline `context`
  object). The docs tell them to hoist those; the grid does not deep-compare them.
- Re-exporting `useSelector` / `Store` from this package. A consumer who wants an app store
  installs the library they choose; the grid does not care which one it is.

## Decisions

### D0. No `React.memo`: isolation comes from stores, stable values and composition

This change makes the grid's re-render isolation hold **without** memoised component
boundaries, and that is the point of the feature, not a side effect of it. The mechanisms are:

- **subscriptions**: a component re-renders because the store slice it selected changed (D2);
- **stable values**: every object the grid publishes or passes on keeps its identity while its
  inputs are unchanged. `useMemo` / `useCallback` on **values** is the allowed tool for this (D3);
- **composition**: a layout passed as `children` is an element the host never recreates.

`React.memo` (and `memo(...)` from `react`) is not used anywhere in this change, and adding it to
rows, cells or any other component is **rejected**. A memo boundary hides an unstable provider
value instead of fixing it, so the defect this change fixes (`resolvedCellTypes`) would have stayed
invisible behind one. It also costs a props comparison per row and per cell on every render. A
re-render problem found later gets fixed by one of the three mechanisms above.

The package has two existing uses, `SourceRunner` and `ItemsSourceHost` in
`items-source/host.tsx`. This change removes both (D6), and an ESLint rule keeps the ban in force
(D7), so after it no `memo` is left in the data-grid React packages.

### D1. Direct dependency, same range as `react-table`

Add `"@tanstack/react-store": "^0.11.1"` to `dependencies` of `@ez-kit/data-grid-react`, the
range `@tanstack/react-table@9.2.4` declares. pnpm then resolves both declarations to the one
`0.11.1` instance already in the tree. Add it to every `size-limit` `ignore` list of the package.
Run a plain `pnpm install`, never `pnpm up -r` (AGENTS.md). Verify with
`pnpm why @tanstack/store`: the grid side must show only `0.11.1`.

_Observed on install._ The lockfile moved one step beyond the new importer lines: pnpm re-pointed
`@tanstack/react-form`'s `^0.11.0` onto the `0.11.1` copy and dropped `react-store@0.11.0`.
`form-core` keeps `@tanstack/store@0.11.0`. This is benign: `react-store`'s source is identical
between `0.11.0` and `0.11.1`, and `react-form` imports only `useSelector` / `useStore`, which read
a source structurally through `get()` / `subscribe()` and share no reactive graph with it. The
`@ez-kit/form-react` suite passes unchanged. No `overrides` entry was added.

_Alternatives._ (a) Keep the hand-rolled hooks. That is the status quo, and it keeps the
fresh-object loop contract. (b) Make it a peer dependency. That pushes an install onto every
consumer for a package that is an implementation detail, unlike `react`. (c) Copy `useSelector`
into the package. That duplicates upstream for no gain.

### D2. Hooks become `useSelector` call sites with an optional `compare`

- `useDataGridSelector(table, selector, options?)` becomes
  `useSelector(table.store, selector, options)`. `table.store` already satisfies `SelectionSource`.
- `useDataGridState(selector, options?)` keeps delegating to `useDataGridSelector`.
- `useGridContext()` and `useGridContext(selector, options?)` adapt the atom through a
  per-atom, memoised source: `{ get: atom.get, subscribe: (l) => ({ unsubscribe: atom.subscribe(l) }) }`.
- The options type is the package's own `{ compare?: (a, b) => boolean }`. It is structurally
  identical to upstream's `UseSelectorOptions`, but `react-store` does not appear in the emitted
  `.d.ts`. That avoids the same `TS2742` class `GridContextAtom` already avoids.
- `shallow` is the comparison the docs recommend, and it comes from the package root.

  _Revised during implementation._ The root **already** exported a `shallow` of its own
  (`src/utils/shallow-equal.ts`, used by `CellTypesProvider` and `GridComponentsProvider`), with
  the `(a: T, b: T) => boolean` shape `compare` takes. Re-exporting `@tanstack/store`'s under the
  same name would have collided with it and changed what an existing export does, so the
  package's own `shallow` is the one recommended, at no new bytes. The options type is exported
  as `DataGridSelectorOptions`.

  The planned `tree-shaking.test.ts` case — "importing `shallow` alone reaches nothing else" —
  does not hold for the root entry and never did: every root import, `useDataGridTable` and
  `buildPageWindow` included, reaches `@ez-kit/data-grid-core` and the same ~100 kB of shared
  chunks. The case pins what is true instead: `shallow` adds under 2 kB over the
  `useDataGridTable` floor and does not reach the compound.

The "fresh object loops forever" warnings come out of the three docblocks and `context.mdx`. With
the shim's selector memoisation that loop no longer exists; the warning becomes "without
`compare`, a fresh object re-renders on every store change".

_Alternative._ Expose `useSelector` directly and deprecate the three hooks. Rejected: the hooks
carry the grid's types (`TableState<GridFeatures>`, `GridContext`) and the context lookup, which is
what makes them worth having.

### D3. Provider values memoised at the source

- `resolvedCellTypes` becomes `useMemo` over `[tableCellTypes, cellTypes]`. With both
  `undefined`, the deps stay stable, so the `?? {}` fallback no longer creates a fresh object.
- Audit every provider between `BoundDataGrid` and `GridBody`: `DndBundleProvider`,
  `DndAdapterProvider`, `GridFactoryDefaultsProvider`, `CellTypesProvider`,
  `GridComponentsProvider` (incl. `guard`), `TableProvider`, `RowDragRegistryProvider`,
  `GridDndProvider`, `ItemsSourceProvider`. Also audit the ones `DataGridTable` mounts
  (`InfiniteProvider` and `VirtualProvider` both build `{ … }` inline, plus `AriaRowIndexProvider`).
  Fix those whose value is rebuilt per render with unchanged inputs. Leave a provider alone when
  its re-render is already gated by a subscription that changed anyway, and record that in the
  test's comment.

### D4. One render-count test guards the whole guarantee

A test in `packages/data-grid/react/react/src` renders a host holding `useState`. The host passes
`context` and a layout as `children` built outside it. Each cell is a registered cell type whose
render bumps a counter **in an effect**: a ref write during render would break the rules the
package lints for. The test then asserts:

1. A host re-render with unchanged config leaves the cell count unchanged.
2. A context change re-renders only cells that select the changed field.
3. A store held in `context` and updated outside React re-renders only its subscribers.
4. A fresh-object selector with `compare: shallow` does not re-render on an unrelated slice.

It runs under both React 19 and `test:react18`.

### D5. Docs: extend `context.mdx`, add `rendering.mdx`

- `state/context.mdx` gets a "Values that change often" section: a store in `context`, read with
  the store library's own hook inside a cell. It also notes that `useGridContext` itself takes
  `compare`.
- `state/rendering.mdx` is new and goes in `meta.json` after `context`. It covers what re-renders
  on a state change, a context change and a host re-render; the host-plus-`children` pattern; and
  hoisting `columns` / `cellTypes`. One live example, registered in `manifest.json` +
  `registry.ts`, runs on both kits automatically. It has no internal comments; the explanation
  lives in the MDX.
- The example's store uses `@tanstack/react-store`, declared in `apps/docs` with the same
  `^0.11.1` range, so the docs app resolves the same copy.
- `page-type-map.ts` gets a `StateRendering` `DocPage` and a `PAGE_ENTRIES` entry. If the page
  carries no option table, both arrays are empty, which still satisfies the coverage walk.

### D6. `items-source/host.tsx` without `memo`

The two `memo`s protect one thing: the consumer's `useItems` hook in `SourceRunner` must not
re-run because something above it re-rendered. That includes the grid's host
(`ItemsSourceHost` sits directly in `DataGridControlled`, not under `children`) and the
`ActiveRunners` list re-reading the store after a runner publishes. They are replaced by the
same mechanism `children` uses, which is element identity:

- `DataGridControlled` creates `<ItemsSourceHost />` once with `useMemo(() => <ItemsSourceHost />, [])`.
  React bails out on an identical element exactly as it does for `children`. `ItemsSourceHost`
  takes no props and reads only the items-source store context, whose value is already stable.
- `ActiveRunners` builds the runner elements with `useMemo` over `active`. The store's `getActive`
  returns the same array until the active set changes, so a re-render caused by anything else
  reuses the elements, and `SourceRunner` does not call the hook again.

The existing items-source tests are the contract: a hook runs once per mount and re-runs on its own
state change, retry or version bump. Add one assertion that a host re-render does not re-run a
source hook. This is the assertion the `memo`s used to guarantee implicitly.

_Alternative._ Move `ItemsSourceHost` out of `DataGridControlled` into `BoundDataGrid`. Rejected:
it must sit inside `TableProvider` so that a source hook can call `useDataGridState`.

### D7. ESLint bans `memo` in the data-grid React packages

Add a config block to `eslint.config.mjs` scoped to `packages/data-grid/react/*/src/**/*.{ts,tsx}`
and `apps/docs/shared/data-grid/examples/**/*.tsx`. The docs examples teach the pattern, so they
fall under the same rule. It has two rules:

- `no-restricted-syntax`, with an `ImportSpecifier[imported.name='memo']` selector on `react`, catches `import { memo }` (see the revision note below for why this is not `no-restricted-imports`);
- `no-restricted-properties`, with `{ object: 'React', property: 'memo' }`, catches `React.memo`,
  since the kits use `import * as React` in several files.

Both messages point at D0's three mechanisms.

_Revised during implementation._ `no-restricted-imports` with `importNames: ['memo']` also reports
every `import * as React from 'react'`, since a namespace import could reach `memo`, and the kits
use that form in 27 files. So the import half is a `no-restricted-syntax` selector after all,
held in one constant (`NO_MEMO_IMPORT_SYNTAX`). The override hazard is handled rather than
avoided: the memo block is mounted first, and the GridMessages block, whose files are a subset of
it, spreads the constant into its own list. `React.memo` stays on `no-restricted-properties`.

Test files are not exempt, with two scoped exceptions: `react-columns.test.tsx` and
`flex-render.test.tsx` each import `memo` to hold the grid to **accepting** a consumer's
memo-wrapped renderer. That is behaviour the package must keep, so each disables the rule on its
import line with that reason.

## Risks / Trade-offs

- [Adding the declaration re-points the lockfile, as during PR 1 of the v9 migration] → The
  range is identical to the existing transitive one. Diff `pnpm-lock.yaml` and check
  `pnpm why @tanstack/store` before committing. If anything other than the new importer line
  moves, stop and investigate rather than add `overrides`.
- [`useSelector` and the render-phase context atom disagree on timing] → `useSelector` reads
  `source.get()`, the same getter the current hook reads, and `useTable` already drives
  `useSelector` over the same binding. Test D4.2 covers it.
- [`shallow` on the root entry costs bundle bytes] → It already shipped there; nothing new is
  added. `tree-shaking.test.ts` pins that it costs no more than the root floor (see D2).
- [A consumer's inline `columns` / `cellTypes` / `context` object still re-renders everything] →
  This is out of scope by design. `rendering.mdx` says to hoist them, and `syncGridContext`
  already absorbs re-merged `context`.
- [Removing the items-source `memo`s makes a consumer's `useItems` hook run more often] → D6
  keeps the bail-out through element identity. The new host-re-render assertion in the
  items-source tests fails if a hook re-runs.
- [Behaviour change for fresh-object selectors] → Code that previously looped now renders. No
  correct program relied on the loop, so this is a fix.

## Migration Plan

Additive minor for `@ez-kit/data-grid-react`: no consumer action is required. Rollback is
reverting the change; the old hooks have the same signatures minus the optional argument.
