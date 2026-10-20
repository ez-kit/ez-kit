# Design

## Context

How it works today (see proposal.md for the motivation):

- `GridContext` is an empty interface in `react/react/src/grid-context.tsx`. It types the
  `context` option on `UseDataGridConfig`, `DataGridDefaultOptions` (and through it the factory
  `defaults` and `DataGridOptionsProvider`), the `GridContextAtom` behind `table.gridContext`, and
  the return value of `useGridContext`.
- The three option layers are combined by `mergeOptionLayers` → `deepMerge`. `context` has no
  special case there, so nested plain objects merge recursively. The docblock on `GridContext` and
  `state/context.mdx` say "a named key is replaced". That is not true for nested objects with
  different keys. The existing test `replaces a named key rather than accumulating it` checks only
  the same key at both levels, so it cannot tell the two behaviors apart.
- `createDataGrid` already lifts one option out of `defaults` into its own field, `features`. At
  runtime it is folded back into the factory layer (`{ ...defaults, features }`), and on the type
  side it is carried by the `TFeatures` parameter of `DataGridBundle`. `context` repeats this
  pattern.
- No kit sets `context`. Only the two docs examples, the two package tests and the
  `state/context.mdx` page extend `GridContext`.

## Goals / Non-Goals

**Goals:**

- One source for the type: the value passed to `createDataGrid({ context })`.
- The bundle reader returns a complete type, and the instance-level `context` is a `Partial`.
- A grid without a factory still reads and writes context, with `Record<string, unknown>` when
  untyped or `withTypes<T>()` when typed.
- Partial imports of `@ez-kit/data-grid-react` get no heavier.

**Non-Goals:**

- Changing the merge semantics. Making `context` replace instead of deep-merge is a separate
  decision.
- Runtime validation of the context. `withTypes` remains an unchecked assertion.
- A preset factory in the kits (`createKitDataGrid({ context })`). A consumer who needs a typed
  context calls the kit's re-exported `createDataGrid` with `allComponents`.
- Changes to re-render behavior (`data-grid-render-isolation`).

## Decisions

### 1. The type comes from a value, not from an explicit generic

`createDataGrid` gets a third type parameter, `TContext extends object | undefined = undefined`,
and `CreateDataGridOptions` gets `context?: TContext`. A bare `createDataGrid<Ctx>({…})` is not an
option: TypeScript has no partial inference of type arguments, so naming `TContext` explicitly
would disable inference of `TCellTypes`/`TFeatures`. The `features` note in `create-data-grid.tsx`
already describes the same trap.

The constraint is `object`, not `Record<string, unknown>`. An `interface` without an index
signature is not assignable to `Record<string, unknown>`, so a consumer's `interface AppCtx`
would otherwise not pass.

The same trap applies to anyone who writes type arguments explicitly
(`createDataGrid<KitCellTypes, KitFeatures>`): `TContext` stays `undefined`. The kits do exactly
this, but they have no context, so for them it is correct. For consumers this goes into the
docblock of the `context` field next to the existing note about `features`.

### 2. Runtime: folded into the factory layer, like `features`

`factoryDefaults = { ...defaults, features, context }` (only keys that are defined). The existing
`GridFactoryDefaultsProvider` / `useDataGridWithDefaults` path delivers it to both forms
(controlled and uncontrolled) without new code. The type of the factory's `defaults` field becomes
`Omit<DataGridDefaultOptions<…>, 'context'>`, so there is one entry point.
`DataGridOptionsProvider` keeps `context` in its `defaults`.

**Alternative considered:** a separate context layer beside the options stack. Rejected: it would
duplicate the three-layer merge that already works and is covered by tests.

### 3. `UseDataGridConfig` gets a context parameter instead of `Omit` at every place it is used

`UseDataGridConfig<TFeatures, TRow, TContext extends object = GridContextRecord>` with
`context?: TContext`, where `GridContextRecord = Record<string, unknown>`. The bundle substitutes
`Partial<TContext>`. The parameter is threaded through the same way into `DataGridProps`
(uncontrolled half), `BoundUseDataGridConfig`, `BoundDataGridProps` and `BoundDataGrid`.

**Alternative considered:** `Omit<…, 'context'> & { context?: Partial<TContext> }` at each bound
type. Rejected: there would be four such places (two branches of `TFeatures` × `DataGrid` /
`useDataGrid`), and an `Omit` over a large config makes the emitted `.d.ts` harder to read. A
parameter with a default does not change any existing type, including the `typeArgs` in
`page-type-map.ts`.

The `DataGridBundle` branch with no `features` set used to return `typeof DataGrid` /
`typeof useDataGrid` as is. With `TContext` set, these become bound signatures parameterized by
context. With `TContext = undefined`, they stay exactly the same types, which is what keeps the
kit annotations unchanged.

### 4. The reader is one type, `GridContextReader<T>`

```ts
type GridContextReader<TContext> = {
	(): TContext
	<TSelected>(selector: (context: TContext) => TSelected, options?: DataGridSelectorOptions<TSelected>): TSelected
}
```

- The package export: `useGridContext: GridContextReader<GridContextRecord> & { withTypes }`.
- The bundle member: `useGridContext: GridContextReader<TContext extends object ? TContext : GridContextRecord>`.
  At runtime it is the same function. The bundle does not get its own `withTypes`, because it is
  not needed there.
- `withTypes<T extends object>(): GridContextReader<T>` returns the same function.

`table.gridContext` (`GridContextAtom`) is typed over `GridContextRecord`. The reader narrows the
type at one cast inside the implementation; the atom type is not threaded through the
bundle-independent `DataTable`.

### 5. `withTypes` is attached without breaking tree-shaking

Attaching it with a top-level assignment (`useGridContext.withTypes = …`) is the same class of
defect AGENTS.md records for `DataGrid.Toolbar = …`: esbuild cannot drop that statement, and it
would anchor the hook (and its imports) into every partial import of `./index`. The fix is the one
already chosen for the compound namespace:
`export const useGridContext = /* @__PURE__ */ Object.assign(useGridContextImpl, { withTypes })`
with a flat object literal, no spread. `tree-shaking.test.ts` gets a case: an import of a name
unrelated to the context must not reach `useGridContext`.

`withTypes<T>()` is a generic used only in the return type, which
`@typescript-eslint/no-unnecessary-type-parameters` (in `strictTypeChecked`) flags. Here that is
exactly the purpose (an explicit assertion, as in Redux `useSelector.withTypes`), so it gets one
`eslint-disable-next-line` with a reason, in the declaration only.

### 6. The docs move to `withTypes`, not to a factory

The docs examples render through the `shared/DataGrid` runtime switcher, which lazily loads one
kit's prebuilt `DataGrid`. They have no factory of their own. Each example declares its own
`const useExampleContext = useGridContext.withTypes<…>()`. This removes the global leak between
examples and also shows the exact pattern `withTypes` exists for. The factory form is documented
on `state/context.mdx` as the main path.

### 7. The ownership convention ("a kit writes only under its own key") becomes a note

With per-bundle types, two bundles no longer collide at the type level. The only shared runtime
space left is `DataGridOptionsProvider` above grids from different bundles. The section in
`context.mdx` shrinks to that case: a kit's key remains a recommendation, not a mechanism.

## Risks / Trade-offs

- [`withTypes` lies if it is called in a grid with a different context] → This is documented as
  an assertion. The factory path stays the recommended one, and the docs show `withTypes` only for
  grids without a factory.
- [A variable typed with an `interface`, passed whole into the untyped `context` (prebuilt grid),
  does not pass `Record<string, unknown>`] → The usual form is an object literal
  `context={{ currentUser }}`, which passes. Anyone who wants a typed context gets their own
  factory or `withTypes`. This goes into the docs next to the fallback type.
- [`Partial<TContext>` is shallow, while the merge is deep. An instance writing `permissions` must
  pass the whole nested object, even though at runtime the missing nested keys would come from the
  default] → This is stricter than the runtime, not weaker. A deep `Partial` would make the
  instance type harder to read for the sake of a rare case. Revisit only on request.
- [Breaking change for everyone who extended `GridContext`] → The package is pre-1.0 (0.12.0), so
  it ships as a minor with a migration in the changeset: replace `declare module` with
  `createDataGrid({ context })` or `useGridContext.withTypes<T>()`. Leftover module augmentation
  does not break compilation; it just stops typing anything. That is the quiet part, so the
  changeset says it explicitly.
- [The third parameter of `DataGridBundle` is erased by an explicit
  `createDataGrid<C, F>`] → Same behavior as `features`, recorded in the docblock. Kits are not
  affected.

## Migration Plan

1. The package: types, factory, reader, `withTypes`, tests.
2. The docs: the page and the two examples, in the same PR, because the examples stop compiling
   once `GridContext` is removed.
3. The changeset on `@ez-kit/data-grid-react` (minor) with before/after migration examples.

Rollback is a revert of the PR. There are no data or migrations.
