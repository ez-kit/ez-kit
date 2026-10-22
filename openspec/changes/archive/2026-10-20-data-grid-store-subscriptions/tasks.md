# Tasks

## 1. Dependency

- [x] 1.1 Add `"@tanstack/react-store": "^0.11.1"` to `dependencies` of `packages/data-grid/react/react/package.json` and to every `size-limit` entry's `ignore` list there; run a plain `pnpm install` (never `pnpm up -r`) and verify `pnpm why @tanstack/store` shows only `0.11.1` on the grid side and the `pnpm-lock.yaml` diff touches only the new importer line
- [x] 1.2 Add `@tanstack/react-store` `^0.11.1` to `apps/docs` (for the docs example) and verify `pnpm why @tanstack/react-store` still lists one `0.11.1` instance

## 2. Selector hooks on `useSelector`

- [x] 2.1 Write failing tests in `use-data-grid-selector.test.tsx` for spec "Selectors may return derived objects" (fresh object renders without a loop; fresh object with `compare: shallow` ignores an unrelated slice) and for "Existing selector call sites keep their behaviour"; verify they fail for the right reason
- [x] 2.2 Rebuild `useDataGridSelector` and `useDataGridState` on `useSelector` with an optional `{ compare }` options parameter typed by the package's own options type (no `react-store` name in emitted `.d.ts`); verify 2.1 passes and `pnpm --filter @ez-kit/data-grid-react typecheck` is clean
- [x] 2.3 Rebuild `useGridContext` (both overloads) on `useSelector` through a memoised per-atom `SelectionSource` adapter, keeping `GridContextAtom`'s exported shape; add tests for the "Context slice read" scenario under both the render-phase (`useDataGrid`) and vanilla (`prepareDataGridTable`) bindings; verify they pass
- [x] 2.4 Re-export `shallow` from `src/index.ts`; update `public-api.test.ts` / `index.test.ts`, add a `apps/docs/test/tree-shaking.test.ts` case for `{ shallow }`, and verify both pass
- [x] 2.5 Rewrite the selector-contract docblocks in `use-data-grid-selector.ts`, `data-grid/table-context.tsx` and `grid-context.tsx` (drop "infinite render loop", describe `compare`); verify `grep -rn "infinite render loop\|re-render without end" packages/data-grid/react/react/src` returns nothing stale

## 3. Stable provider values

- [x] 3.1 Write the render-isolation test (design D4): a host holding `useState`, layout passed as `children`, cells as a registered cell type counting renders in an effect; assert a host re-render with unchanged config re-renders no cell; verify it FAILS on the current code because of `resolvedCellTypes`
- [x] 3.2 Memoise `resolvedCellTypes` in `DataGridControlled` over `[tableCellTypes, cellTypes]`; verify 3.1 passes
- [x] 3.3 Audit every provider listed in design D3 for per-render value rebuilds with unchanged inputs; fix each one found (or record in the test file why it is gated anyway); verify 3.1 still passes and add an assertion for any provider fixed
- [x] 3.4 Fix every instability found in 3.1–3.3 with `useMemo` / `useCallback` on values only, never `React.memo` (design D0); verify `git diff` adds no `memo(` / `React.memo` anywhere under `packages/data-grid/react/*/src`
- [x] 3.5 Add a failing assertion to the items-source tests that a re-render of the grid's host does not re-run a source's `useItems` hook, then remove both `memo`s from `items-source/host.tsx` per design D6 (`useMemo`'d `<ItemsSourceHost />` element in `DataGridControlled`, `useMemo`'d runner elements over `active` in `ActiveRunners`); verify the new assertion and every existing items-source test pass
- [x] 3.6 Extend the render-isolation test with scenarios "Context change from host state" and "Store update outside React state" (a `@tanstack/store` `Store` held in `context`), and run it under React 19 and `pnpm --filter @ez-kit/data-grid-react test:react18`; verify both pass

## 4. ESLint guard against `memo`

- [x] 4.1 Add the design D7 block to `eslint.config.mjs` (`no-restricted-imports` for `memo` from `react`, `no-restricted-properties` for `React.memo`, scoped to `packages/data-grid/react/*/src/**/*.{ts,tsx}` and `apps/docs/shared/data-grid/examples/**/*.tsx`, messages pointing at stores / stable values / composition); verify `pnpm lint` is clean after 3.5, and that temporarily adding `import { memo } from 'react'` and a `React.memo(...)` to a kit file each fails lint
- [x] 4.2 Verify the existing GridMessages `no-restricted-syntax` rule still fires (e.g. a temporary `<span>Hello</span>` in a `blocks/` file fails lint), proving the new block did not override it
- [x] 4.3 Record the rule in `AGENTS.md` under the data-grid architecture constraints (no `React.memo`; isolation through selectors, stable values and `children` composition; enforced by ESLint), so a later "add memo" proposal is answered there

## 5. Docs

- [x] 5.1 Add a "Values that change often" section to `apps/docs/content/docs/data-grid/state/context.mdx` (store in `context`, read with the store's own hook; `compare` on `useGridContext`) and replace the infinite-loop wording; verify `docs-option-names.test.ts` passes with its recorded counts updated if a table changed
- [x] 5.2 Write the example component `apps/docs/shared/data-grid/examples/components/render-isolation.tsx` (`export function RenderIsolationExample()`, host + `children` layout + store-backed permission toggled outside the grid, no internal comments), register it in `manifest.json` and `registry.ts`; verify it renders on both `/examples/shadcn/<slug>` and `/examples/heroui/<slug>` via `pnpm docs:dev`
- [x] 5.3 Create `apps/docs/content/docs/data-grid/state/rendering.mdx` (what re-renders on state / context / host change, the host + `children` pattern, hoisting `columns` / `cellTypes`, the example) and add `rendering` after `context` in `state/meta.json`; verify the page builds
- [x] 5.4 Add `StateRendering` to `DocPage` and a `PAGE_ENTRIES` entry in `apps/docs/test/docs-options/page-type-map.ts`; verify `pnpm --filter @ez-kit/docs test` passes (coverage walk, option names, e2e slots)

## 6. Release and integration

- [x] 6.1 Add a minor changeset for `@ez-kit/data-grid-react` only (not the shadcn kit); verify `pnpm lint` passes `check-changesets.mjs`
- [x] 6.2 Run the full gate sequentially (`build`, `lint`, `typecheck`, `test`, `size`); verify all green and that the `size-limit` figures for `@ez-kit/data-grid-react` stay within budget

## Workflow follow-up

- Archive the change after review and merge.
