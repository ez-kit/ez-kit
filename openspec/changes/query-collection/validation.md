# Validation

Validated on 2026-11-13 with pnpm 10.34.9 (invoked through npx), Node 24.22.1 and the workspace's installed dependencies.

## Repository checks

The required gate ran sequentially:

1. `pnpm exec turbo run build --filter=!@ez-kit/docs`: passed, 16 tasks.
2. `pnpm lint`: passed, 32 tasks.
3. `pnpm typecheck`: passed, 32 tasks, including registered Query error types and compiled Orval examples.
4. `pnpm test`: passed, 32 tasks. Query React: 76 tests; qc-react: 85; docs: 313.
5. `pnpm exec turbo run size --filter=!@ez-kit/docs`: passed after correcting qc-react's size configuration to exclude its new runtime dependency, as required by AGENTS.md. Its original 3 kB budget is unchanged.

`pnpm verify:affected` passed before the full gate (24 tasks). Two final collection regression cases were added afterwards and passed targeted lint, typecheck and tests, then the full gate above.

Measured sizes: Query gate entry 450 B / 550 B; collection entry 1.38 kB / 1.6 kB; qc-react own code 2.69 kB / 3 kB. The new collection budget provides approximately 15% headroom. Query gate isolation remains unchanged.

## Compatibility and browser checks

- `pnpm --filter @ez-kit/query-react test:react18`: 74 passed. This ran before the two final signal/cache and convention-override cases; those additions passed with current React in the full gate. No runtime implementation changed between these test additions.
- `pnpm --filter @ez-kit/qc-react test:react18`: 79 passed, six existing HeroUI cases skipped because that kit requires React 19.
- Playwright: 12 passed across `e2e/docs/qc-react.spec.ts`, `e2e/docs/query-collection.spec.ts` and both kits' query-source/query-modal scenarios. A temporary configuration used Next dev on port 3108 and `/usr/bin/chromium` with `--no-sandbox`; it was removed after the run.
- Browser coverage includes ordinary-list search/page reset, create/update/delete/deleteMany, last-page correction, infinite loading and pending/dismissed modal mutation sessions.
- `pnpm --filter @ez-kit/qc-react example:check`: passed; Orval 8.47.0 regenerated identical fetchers. The shared collection recipe compiles for both list and grid consumers.
- Direct Node import of the built collection entry passed without importing a grid package.

## Contract-specific coverage

Runtime/type fixtures cover arbitrary params, independent mutation inputs/results/context, optional operations and reads, selected responses/pages, native exact query keys, cache sharing, signal forwarding, source capability changes, same-source grid adaptation and original business identifiers. Mutation tests cover preparation failures/retries, callback variables, invalidation after unmount and pending mutations across distinct tenant base keys. Explicit/native mutation keys retain TanStack behavior; arbitrary same-key callback replacement is not frozen.

## Environment limitation

The docs production build was excluded from build/size because Google Fonts downloads are blocked in this environment. This is the existing user-accepted limitation, not a passing production-build result. Browser checks used Next dev with fallback fonts. Docs lint, typecheck, unit tests and the selected browser scenarios passed.

`openspec validate query-collection --strict` and `git diff --check` passed. All 21 tracked implementation tasks are complete.

## Contract follow-up — 2026-11-14

Corrected five contract gaps: grid fetcher mutation identity across tenant changes,
QueryClient success callback defaults, optional capabilities, complete source/factory
configuration, and compatible row projections at the grid adapter boundary.

- `pnpm verify:affected`: 24 tasks passed.
- Sequential library build, full lint, full typecheck, full tests and library size checks passed using the same commands and docs-production exclusion recorded above.
- Current React: query-react 80 tests, qc-react 89 tests, docs 313 tests passed.
- `pnpm --filter @ez-kit/query-react test:react18`: 80 passed.
- `pnpm --filter @ez-kit/qc-react test:react18`: 83 passed, six existing HeroUI skips.
- Mutation regressions exercise source changes during success, error and retry, explicit key overrides, global/keyed/local success callback precedence and awaited callbacks before invalidation.
- Type regressions reject unsafe conditional-operation access, unsupported conditional reads, missing keys/invalidation/preparation, and incompatible list/infinite rows. Positive fixtures retain async fetcher/signal inference and complete per-entity reads without shared defaults.
- Sizes: query gate 450 B / 550 B; collection 1.37 kB / 1.6 kB; qc-react 2.76 kB / 3 kB.

No new browser run was needed for this contract-only follow-up; the preceding browser evidence applies to the unchanged user flows. Per-consumer observer overrides and shape-changing shared-factory select remain outside this follow-up.

## Observer options and shared selections — 2026-11-16

Implemented the two flexibility follow-ups deferred by the previous audit fix:

- Per-consumer loading/refetch settings override only the active read's source defaults. Runtime
  whitelisting rejects replacement of cache identity and selection even from untyped callers.
- Entity operations in the shared factory infer selected list data and infinite pages independently
  of raw responses. Explicit getItems is required when select is supplied, inherited getTotal is
  dropped, and projection annotations cannot invent a selected shape without select.

Validation:

- Affected gate: 24/24 tasks passed before the final negative-type cases and documentation links.
- Final sequential library build, full lint, typecheck, test and library size gates passed.
- Query React: 83 tests; qc-react: 89; docs: 313. New cases cover both observer modes, source
  option precedence, protected identity, raw cache responses and next-page fetching after select.
- React 18: Query React 83 passed; qc-react 83 passed with six existing HeroUI skips.
- Type fixtures cover selected item inference, callback response/error types, forbidden hook
  overrides, missing projections (including conditional selections), and incompatible projection inputs.
- Collection entry is 1.56 kB minified/Brotli (previously 1.37 kB). Its budget is 1.8 kB to retain
  approximately 15% headroom under repository policy. Query gate remains 450 B; qc-react remains 2.76 kB.
- Strict OpenSpec validation passed. No generated Orval transport changed.

Docs production build remains excluded under the accepted Google Fonts restriction. Browser
scenarios were not rerun for this hook/type follow-up; previous browser evidence remains historical.
The added documentation is covered by docs lint, typecheck and tests.

## Ownership and projection audit fixes — 2026-11-16

Closed the five defects confirmed by the second architecture/runtime/type audit:

- Generated writes alongside native reads require a base key in both types and runtime checks.
  A scoped retry test verifies that A's failed write retries A, never B, and invokes A's callbacks
  and explicitly configured native invalidation.
- Temporarily absent operations retain their last committed descriptor and invalidation rules.
  Success and retry tests cover generated operations and native operations without mutation keys.
- Standalone fetcher projections cannot infer a selected shape from their own annotations.
- Standalone and shared-factory reads require a guaranteed selector if raw data cannot satisfy the
  projection input. Negative fixtures cover conditional selectors for ordinary and infinite reads;
  a positive fixture accepts a projection handling an explicit raw/selected union.
- Grid adaptation checks object items before comparing row compatibility. Negative fixtures cover
  primitive-only lists/infinite sources and mixed object-list/primitive-infinite sources.

Verification passed:

- Affected lint/typecheck/test gate: 24/24 tasks.
- Sequential final library build, full lint, typecheck, test and library size gates.
- Query React: 89 tests; qc-react: 89; docs: 313.
- React 18: Query React 89 passed; qc-react 83 passed with six existing HeroUI skips.
- Strict OpenSpec validation and git diff whitespace checks.
- Sizes: query gate 450 B / 550 B; collection 1.66 kB / 1.9 kB; qc-react 2.76 kB / 3 kB.
  The collection budget retains approximately 15% headroom after about 100 B of runtime growth.

Docs production build remains excluded under the accepted Google Fonts restriction. Browser
scenarios were not rerun for these lifecycle/type fixes; targeted runtime tests exercise the
confirmed failure paths, and prior browser evidence remains historical.
