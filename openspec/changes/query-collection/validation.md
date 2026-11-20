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

## Source transitions and compatibility audit fixes — 2026-11-16

Closed all six confirmed third-audit defects:

- Reject a save validated under a different mutation owner before dispatch; preserve same-key
  observer semantics and explicit editing cancellation.
- Deduplicate infinite page requests by the effective query hash, allowing a new selection to
  load while an old request remains pending.
- Isolate inactive internal observers from application query defaults without replacing the
  application's QueryClient.
- Infer native projection inputs from query options, not from projection callback annotations.
- Require a compatible total getter when conditional selection widens the shared getter's input,
  including optional shared getters.
- Set both peer floors to TanStack Query 5.105.3 and add an exact-version consumer fixture against
  built public declarations with skipLibCheck disabled. It covers native queries, collection
  sources, grid integration, and the Query, InfiniteQuery and Mutation components.

Verification passed:

- Sequential library build (16 tasks), full lint (33), typecheck (33), test (32), and size (32).
- Query React: 92 tests; qc-react: 93; docs: 313.
- React 18: Query React 92 passed; qc-react 87 passed with six existing HeroUI skips.
- Exact minimum-version consumer lint and typecheck, including public component declarations.
- Strict OpenSpec validation and git diff whitespace checks.
- Sizes: query gate 450 B / 550 B; collection 1.71 kB / 2 kB; qc-react 2.91 kB / 3.4 kB.
  Budgets retain approximately 15% headroom after about 50 B and 150 B of respective growth.

Docs production build remains excluded under the accepted Google Fonts restriction. Browser
scenarios were not rerun for this follow-up; targeted runtime tests cover source changes during
validation, independent infinite page requests, and global-default isolation. Previous browser
evidence remains historical.

## Consumer query policy and quiet validation cancellation — 2026-11-17

Connected grids and hooks now forward restricted queryOptions through the existing collection
observer whitelist for ordinary and infinite reads. Runtime tests override disabled source policy,
check staleTime, and attempt to replace the key, fetcher and projection from untyped input.
Type fixtures cover hook/JSX options, safe callback contextual typing, prohibited identity/selection
overrides and rejection of options on an already-controlled table.

Creating/editing cancelValidation preserves form values and open state, cancels form/field/check
validation, and leaves dispatched saves alone. Both connected form modes cancel pending validation
on ownership changes, while same-key updates retain native behavior. Fourteen core regression cases
cover valid/invalid/throwing late validators, a new attempt before old work settles, standalone
checks, and pending saves. Six connector scope cases cover changed, unchanged and explicitly
cancelled ownership for both form modes. A pre-dispatch ownership guard remains in place.

Verification passed:

- Sequential library build (16 tasks), full lint (33), typecheck (33), test (32), and size (32).
- Data-grid core: 1,091 tests; shared React grid: 1,827; qc-react: 98; docs: 313.
- qc-react on React 18: 92 passed with six existing HeroUI skips.
- Public declaration consumers, strict OpenSpec validation and git diff whitespace checks.
- Connector size: 3.01 kB / 3.4 kB; existing budgets remain sufficient.

External page resets remain project-owned; no resetKey or automatic modal dismissal was added.
Docs production build remains excluded under the accepted Google Fonts restriction. Browser suites
were not rerun for this follow-up; targeted core/hook tests exercise cancellation and consumer
policy, and previous browser evidence remains historical.

## Fourth audit fixes — 2026-11-18

Closed the five reproduced defects:

- Mounted connected-grid tests drive useInfiniteScroll, not only raw onLoadMore. A's pending
  request cannot block B; late A success/error cannot clear B's pending status or publish an error.
  The neutral React loader shares a per-loadMoreKey scope across detection sites.
- Stale cached totals with refetchOnMount false and either enabled value preserve the restored
  page. Untrusted totals are withheld from the base grid's independent shrink clamp too. Existing
  fresh-response, placeholder and staleTime-zero correction scenarios continue to pass.
- A shared consumer conformance fixture rejects fabricated selected shapes in collection,
  standalone grid list/infinite and native grid helpers; it also checks conditional selectors and
  row-count input compatibility while retaining valid selection inference.
- Layout-effect and child-effect commits execute after observer publication. Cancellation before
  queued dispatch calls no fetcher, while existing dispatched-mutation/session tests still pass.
- Plain structural collection sources accept complete native observer options: literal disabled
  policy can be overridden, callback data remains typed, and invalid/source-owned overrides fail
  type checks. A runtime test enables a literal-disabled source through consumer policy.

Verification passed:

- Sequential library build (16 tasks), full lint (33), typecheck (33), test (32), and size (32).
- Shared React grid: 1,827 tests; Query React: 94; qc-react: 107; docs: 313.
- React 18: shared grid 1,827; Query React 94; qc-react 101 passed with six existing HeroUI skips.
- Public declarations/minimum-version consumer, strict OpenSpec validation and whitespace checks.
- Sizes: shared React grid main entry 38.5 kB / 43.5 kB; collection 1.71 kB / 2 kB;
  qc-react 3.18 kB / 3.4 kB. Existing budgets pass without increases.

No validateValues cancellation-result or shared read-error generic contract was changed; those
remain separate API discussions. Docs production build remains excluded under the accepted Google
Fonts restriction. Browser suites were not rerun for this follow-up; mounted real loader and
form-hook regressions cover the confirmed UI paths. Previous browser evidence remains historical.

## Explicit validation results — 2026-11-19

Resolved the read-only validation-result contract with `ValidationCheckResult`: valid, invalid
(with normalized errors/formError), or cancelled. Core editing/creating and the React modal bridge
share it. Schema validators and state-writing validate() retain their existing return types.
Cancellation settles immediately even when the validator ignores its signal; late resolutions and
rejections cannot affect a reopened form. Concurrent external checks remain application-ordered.

Verification passed:

- Affected checks: 35 tasks; sequential final library build, lint, typecheck, test and size gates.
- Core: 1,115 tests (24 new check regressions); shared React grid: 1,829 (two new modal regressions).
- qc-react: 107; Query React: 94; docs: 313. Public declaration/minimum-version checks passed.
- Shared React grid on React 18: 1,829 tests passed.
- Strict OpenSpec validation and whitespace checks passed; no size budget increases.

Documentation includes the external-form status branching recipe and migration guidance; a minor
changeset records the breaking check result. Shared read-error generics remain a separate discussion.
Docs production build remains excluded under the accepted Google Fonts restriction. Browser suites
were not rerun for this follow-up; the new React modal tests exercise the forwarding contract.

## Fifth audit fixes — 2026-11-19

Mounted tests cover tenant transitions with reused row IDs, stale drafts, staged confirmation
and placeholder rows, and a successful old bulk mutation with new-tenant selection. Layout-effect
tests cancel single and bulk deletes before dispatch. React tests cover both immediate and confirmed
delete failure and retry. Query policy tests exercise cached disabled infinite data and inherited
notification restrictions. Consumer fixtures check structural projections in the hook, JSX and the
collection adapter, explicit pagination mode and infinite factory defaults.

Verification passed:

- Sequential library builds (16 tasks), lint (33), typecheck (33), test (32) and size (32).
- Data-grid core: 1,115 tests; shared React grid: 1,831; Query React: 94; qc-react: 114; docs: 313.
- React 18: shared grid 1,831 passed and qc-react 108 passed with six existing HeroUI skips.
- Minimum TanStack Query consumer fixture, strict OpenSpec and whitespace checks.
- Shared React grid main entry: 38.54 kB / 43.5 kB. Connector own code grew from 3.18 kB to
  3.43 kB. The 3.9 kB limit restores the repository's approximately 15% budget headroom.

Docs production build remains excluded locally under the accepted Google Fonts restriction.
Bulk selection across unloaded pages and a public manual refetch remain separate design topics.

## Sixth audit fixes — 2026-11-20

The regression suite covers stable server record IDs, cross-scope placeholder suppression before
projection, controlled reset acknowledgement, same-scope capability changes, cache key collisions
with URLSearchParams, independent delete targets, and the disabled bulk button. Consumer fixtures
check optional selectors, explicit row generics and list-only factory access.

Verification passed:

- Sequential library builds (16 tasks), lint (33), typecheck (33), test (32) and size (32).
- Data-grid core: 1,116 tests; shared React grid: 1,832; Query React: 95; qc-react: 118; docs: 313.
- React 18: shared grid 1,832; Query React 95; qc-react 112 passed with six existing HeroUI skips.
- Minimum TanStack Query consumer fixture, strict OpenSpec and whitespace checks.
- Query collection: 1.90 kB / 2 kB; qc-react: 3.80 kB / 3.9 kB. Core's features entry measures
  6.61 kB. Its 7.6 kB limit restores the repository's approximately 15% budget headroom.

Docs production build remains excluded locally under the accepted Google Fonts restriction.
