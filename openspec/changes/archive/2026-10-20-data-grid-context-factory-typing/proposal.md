# Proposal

## Why

The grid context is typed through one global declaration: an application extends the empty
`interface GridContext` with `declare module '@ez-kit/data-grid-react'`. This causes two problems.

- **The type is shared by every grid in the program.** It cannot differ between grids. In the docs
  app, two examples (`grid-context.tsx`, `render-isolation.tsx`) each extend it, so every example
  sees both sets of keys. If two examples used one key with different types, one of them would
  fail to compile because of the other.
- **Every key has to be optional.** The global interface does not know whether a given grid
  received a value, so readers write `context.currentUser?.name` everywhere, even where a value is
  always present.

Moving the type into `createDataGrid` solves both problems. The factory gets a default object, the
type is inferred from it, and readers get a complete type because the default guarantees every
key.

## What Changes

- **BREAKING**: `interface GridContext` and its declaration merging are removed.
  `declare module '@ez-kit/data-grid-react' { interface GridContext { … } }` no longer types
  anything.
- `createDataGrid` gets a new `context` key. The object passed there is the factory-level default,
  and `TContext` is inferred from it.
- The bundle returned by `createDataGrid({ context })`:
  - gets a new member `useGridContext`, which reads the context as a complete `TContext` (whole
    object and selector forms, same contract as today);
  - types `context` on `DataGrid` and `useDataGrid` as `Partial<TContext>`.
- `DataGridBundle` gets a third type parameter, `TContext`.
- **BREAKING**: `context` is removed from the factory's `defaults` (`createDataGrid({ defaults })`).
  The factory has exactly one way to set a context, the `context` key.
- Where no factory context is set (prebuilt kit `DataGrid`, bare `useDataGrid`,
  `DataGridOptionsProvider`), `context` is `Record<string, unknown>`. The same type is returned
  when reading with the package-level `useGridContext`.
- New `useGridContext.withTypes<T>()`. It returns the same hook typed for `T`, for grids that have
  no factory of their own. At runtime it is the same function; the cast happens once.
- How the three layers merge is unchanged: factory < `DataGridOptionsProvider` < instance,
  instance wins, through the same `deepMerge` as every other option (nested plain objects merge
  key by key). The docs and the `GridContext` docblock currently say a named key is replaced
  rather than merged. That is not what the code does, and the rewritten docs correct it.

## Capabilities

### New Capabilities

- `data-grid-context-typing`: how the grid context gets its type. Covers the factory default as
  the source of the type, bundle-bound readers and writers, the untyped fallback, and
  `withTypes`.

### Modified Capabilities

None. `data-grid-render-isolation` describes which components re-render on a context change. This
change does not touch that behavior; only the types change.

## Impact

- `@ez-kit/data-grid-react`:
  - `grid-context.tsx`, `create-data-grid.tsx`, `data-grid-options-context.tsx`,
    `use-data-grid.ts`, `types.ts` and `index.ts`: the exports `GridContext` (removed) and
    `useGridContext` (gets `withTypes`).
  - Tests that extend the module: `grid-context.test.tsx`, `host-rerender-isolation.test.tsx`.
- Kits (`shadcn`, `heroui`): the code does not change. The kits set no context, and the new
  `TContext` parameter of `DataGridBundle` defaults to "no context", so the existing
  `DataGridBundle<KitCellTypes, KitFeatures>` annotations keep their meaning. This needs a check
  in typecheck, not an edit.
- `apps/docs`:
  - `state/context.mdx` is rewritten; `state/defaults.mdx` and `state/rendering.mdx` are checked
    for mentions.
  - The examples `grid-context.tsx` and `render-isolation.tsx` move to `withTypes`.
  - `page-type-map.ts`: the expected name count on the `CreateDataGridOptions` table.
  - `tree-shaking.test.ts` gets a case: `withTypes` must not anchor the hook into partial imports.
- A changeset on `@ez-kit/data-grid-react` (minor, pre-1.0, breaking).
