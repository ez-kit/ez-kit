# Tasks

## 1. Context types and the reader

- [x] 1.1 In `react/react/src/grid-context.tsx`, remove `interface GridContext`, add
      `GridContextRecord = Record<string, unknown>` and the `GridContextReader<TContext>` type
      (whole-object and selector overloads), and retype `EMPTY_GRID_CONTEXT`, `GridContextAtom`,
      `createGridContextAtom` and `syncGridContext` over `GridContextRecord`. Verify:
      `pnpm --filter @ez-kit/data-grid-react typecheck` reports errors only at the old
      `GridContext` usages fixed in 1.2–1.4.
- [x] 1.2 Export `useGridContext` as
      `/* @__PURE__ */ Object.assign(useGridContextImpl, { withTypes })` with a flat literal.
      `withTypes<T extends object>(): GridContextReader<T>` returns the same function, with one
      `eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters` and a reason.
      Rewrite the docblocks of `grid-context.tsx`: no declaration merging, the factory as the main
      path, `withTypes` as the explicit assertion, and the merge described as `deepMerge` (fixing
      the false "a named key is replaced" claim). Verify: package typecheck and lint are clean.
- [x] 1.3 Add a `TContext extends object = GridContextRecord` parameter to `UseDataGridConfig` in
      `use-data-grid.ts`, with `context?: TContext` and the docblock example moved from
      `declare module` to `createDataGrid({ context })`. Thread the parameter through the
      uncontrolled half of `DataGridProps`. Update `index.ts`: drop the `GridContext` export,
      export `GridContextRecord` and `GridContextReader`. Verify: package typecheck is clean.
- [x] 1.4 Rewrite `grid-context.test.tsx` without `declare module`: readers via
      `useGridContext.withTypes<…>()`, plus type tests (`expectTypeOf` / `@ts-expect-error`) that
      the bare hook returns `unknown` values and that `withTypes` types the selector. Replace
      `replaces a named key rather than accumulating it` with two tests: a nested plain object
      merges key by key, and a store instance is replaced whole (spec: "Context layers keep their
      merge order"). Add a `withTypes` subscription test (a field read does not re-render when
      another field changes). Verify: `pnpm --filter @ez-kit/data-grid-react test grid-context`
      passes.
- [x] 1.5 Move `data-grid/host-rerender-isolation.test.tsx` from `declare module '../grid-context'`
      to `withTypes`. Verify: that test file passes unchanged in its assertions.

## 2. Factory context in `createDataGrid`

- [x] 2.1 In `create-data-grid.tsx`, add the `TContext extends object | undefined = undefined`
      parameter and the `context?: TContext` field to `CreateDataGridOptions`. Its docblock notes
      that an explicit `createDataGrid<C, F>` leaves `TContext` at `undefined`, as with `features`.
      Change `defaults` to `Omit<DataGridDefaultOptions<…>, 'context'>`. Fold `context` into
      `factoryDefaults` next to `features`. Verify: package typecheck is clean.
- [x] 2.2 Add a third `TContext` parameter, default `undefined`, to `DataGridBundle`. With
      `TContext` set, `DataGrid` / `useDataGrid` in both `TFeatures` branches take
      `context?: Partial<TContext>` (through `BoundUseDataGridConfig` / `BoundDataGridProps` /
      `BoundDataGrid` and a bound variant of the unbound branch). With `undefined`, they stay
      exactly today's types. Add the `useGridContext` member,
      `GridContextReader<TContext extends object ? TContext : GridContextRecord>`, returning the
      same runtime function. Verify: package typecheck is clean, and both kits'
      `pnpm --filter @ez-kit/data-grid-shadcn typecheck` / `…-heroui typecheck` pass with no edits
      to their `data-grid.tsx`.
- [x] 2.3 Add tests to `create-data-grid.test.tsx` (or a new `create-data-grid-context.test.tsx`)
      covering the spec requirements: - type inferred from the default; - the default reaches a grid with no `context`; - the bundle reader returns required keys, and an unknown key is a `@ts-expect-error`; - the instance `Partial` overrides one key while the rest come from the factory; - a wrong-typed instance key, and a key outside the type, are `@ts-expect-error`; - `defaults: { context }` on the factory is a `@ts-expect-error`; - three layers factory < provider < instance; - two bundles in one file with different `tenant` types.
      Verify: `pnpm --filter @ez-kit/data-grid-react test create-data-grid` passes.
- [x] 2.4 Update the factory-related docblocks in `data-grid-options-context.tsx`
      (`DataGridDefaultOptions`, `GridFactoryDefaultsProvider`): the factory layer no longer
      carries `context` from `defaults`; it comes from the separate key. Verify: lint is clean.

## 3. Tree-shaking guarantee

- [x] 3.1 In `apps/docs/test/tree-shaking.test.ts`, under `@ez-kit/data-grid-react`, add a case:
      importing a name unrelated to the context (for example `{ useDataGridTable }`) does not reach
      the `useGridContext` implementation. Pick a marker literal unique to it, the same way
      `FilterPanel`'s `data-slot` is used. Check that the case fails if `withTypes` is attached by
      a top-level assignment instead of the annotated `Object.assign`, then restore it. Verify:
      `pnpm --filter @ez-kit/docs test tree-shaking` passes.

## 4. Documentation and examples

- [x] 4.1 Move `apps/docs/shared/data-grid/examples/components/grid-context.tsx` and
      `render-isolation.tsx` from `declare module` to a local
      `const useExampleContext = useGridContext.withTypes<…>()`. Keys stay required where the
      example always passes a value. No explanatory comments in the code (the source panel shows
      them to readers); explanations go in MDX. Verify: `pnpm --filter @ez-kit/docs typecheck`
      passes and both examples render on the `shadcn` and `heroui` routes in `pnpm docs:dev`.
- [x] 4.2 Rewrite `apps/docs/content/docs/data-grid/state/context.mdx`: - replace "Type it once" with "Type it at the factory" (`createDataGrid({ context })`, the
      bundle `useGridContext`, `Partial` at the instance); - add a `withTypes` section for grids without a factory, describing it as an assertion; - state the untyped fallback `Record<string, unknown>` and the `interface`-typed variable
      caveat; - move the store example from `declare module` to the factory; - in the layers section, switch the kit example to `createDataGrid({ context })` and
      describe the merge as deep for plain objects; - shrink the ownership section to the shared `DataGridOptionsProvider` case; - in the Options table, change `GridContext` to the new type, and add a separate
      "Factory option" table for `createDataGrid`'s `context`.
      Verify: `pnpm --filter @ez-kit/docs test docs-option-names` passes after 4.3.
- [x] 4.3 In `apps/docs/test/docs-options/page-type-map.ts`, for `DocPage.StateContext`, add the
      new table (`roots: [GRID_TYPE.CreateDataGridOptions]`, `expectedCount: 1`) and update the
      `nonOptionTables` if the "Reading it" table changes shape. Verify: `docs-option-names` passes.
- [x] 4.4 Check `state/defaults.mdx`, `state/rendering.mdx` and the package `README.md` for
      mentions of `GridContext`, `declare module` and `defaults: { context }`, and fix them. Do a
      second pass for claims, not just identifiers ("a named key is replaced", "declare once").
      Verify: `grep -rn "GridContext\b\|interface GridContext\|declare module '@ez-kit/data-grid-react'" apps/docs packages/data-grid --include=*.ts* --include=*.md*`
      outside `dist` returns nothing, apart from historical archives.

## 5. Changeset and integration check

- [x] 5.1 Add `.changeset/data-grid-context-factory-typing.md` for `@ez-kit/data-grid-react`
      (minor). It covers: - removal of `GridContext`, and that leftover `declare module` silently stops typing; - before/after migration to `createDataGrid({ context })` and to
      `useGridContext.withTypes<T>()`; - the move of `context` out of the factory `defaults`; - the `Record<string, unknown>` fallback.
      No agent attribution. Verify: `pnpm lint` (including `check-changesets.mjs`) passes.
- [x] 5.2 Run the full gate sequentially: `pnpm build`, then `pnpm lint`, `pnpm typecheck`,
      `pnpm test`, `pnpm size`. Verify: all five pass, and `size-limit` for
      `@ez-kit/data-grid-react` stays within budget.

## Workflow follow-up

- Archive the change with `/opsx:archive` after the PR is merged into `develop`.
