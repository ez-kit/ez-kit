# Tasks

## 1. Package and executable type contract

- [x] 1.1 Scaffold `packages/qc/react` with `/data-grid` exports, peer dependencies, build/type/test/size configuration and workspace wiring; verify package build and an import without either visual kit, and ensure base grid imports do not pull Query.
- [x] 1.2 Implement source descriptor type fixtures for prepared arguments, row projection, native select, mutation variables/errors and constrained shared defaults; verify positive inference and negative compilation cases without public any-based erasure.
- [x] 1.3 Prototype `withQuery(bundle)` typing and the minimal neutral reactive bridge against the actual DataGridBundle; verify both kits, custom cells, context, column config, compound members and explicit-table usage with type tests. Record the resolved signature in package API docs before dependent implementation. Turn the design's end-to-end examples into type-checked fixtures, replacing schematic helpers with real typed definitions.

## 2. Sources and API-convention factories

- [x] 2.1 Implement options-based sources and fetcher normalization through `createGridSourceFactory`, including bare/expanded entity operations and operation overrides; verify default inheritance and override behavior in unit tests and document both source paths.
- [x] 2.2 Implement synchronous `prepareArgs`, normalized original-entity mutation contexts and transport adaptation for read signals; verify API IDs distinct from table IDs, missing update rows, differing generated-client signatures and signal exclusion from business args.
- [x] 2.3 Implement typed response projections and reusable source query-options access; verify ordinary prefetch shares the grid cache, native selected result types are retained and infinite page projection does not mutate cache data. Document the source query-options surface.
- [x] 2.4 Implement factory-generated list/infinite keys and preserved external-option keys; verify filters, sort, pagination and tenant separation, and require/document explicit invalidation scope for externally owned keys.

## 3. Connected grid reads and pagination

- [x] 3.1 Implement one shared connection used by inline dataSource and connected useDataGrid with an explicit table; verify one binding, stable table identity, retained JSX updates and publication of rows/totals/loading through supported channels.
- [x] 3.2 Subscribe to applied query axes and pagination without another parameter store; verify draft editing makes no request, Apply resets pagination without an intermediate wrong-page request, existing debounce is preserved and selection-only updates do not refetch.
- [x] 3.3 Implement paged request projection, manual server processing and fresh-total page correction; test deleting the last row, empty collections, unknown totals and placeholder totals. Add a documented paged example.
- [x] 3.4 Implement infinite binding and live pages/infinite switching with fixed hook behavior; test accumulated rows without duplicate append, inactive-mode suppression, query-key changes, next-page error/retry and concurrent-load protection. Add an infinite example.
- [x] 3.5 Wire initial/background/next-page status separately; verify stale rows survive background and next-page failures and retained grid children see loading/config changes without unrelated host rerenders.

## 4. Mutations, invalidation and errors

- [x] 4.1 Wire create/update/delete/deleteMany to existing callbacks only under explicit enablement, preserving explicit handler precedence; test disabled features, missing executors, no duplicate API calls and operation-specific type errors. Document enablement and overrides.
- [x] 4.2 Implement default list-family invalidation and source/operation false/additional/replace precedence; test native filter semantics, independent filter entries, active/inactive cache behavior and absence of invalidation on request failure.
- [x] 4.3 Compose native mutation lifecycle with protected non-blocking success invalidation; test returned optimistic context, awaited user callbacks, throwing user success callbacks, slow/failed refetch and completion after form/grid unmount. Document that automatic refetch is not awaited.
- [x] 4.4 Implement inherited and per-operation transformError at the grid boundary; test original errors in native onError, ValidationError field mapping, unknown-error preservation and failure isolation from closed/new form sessions. Add a server-validation recipe.

## 5. Explicit bulk execution in the base grid

- [x] 5.1 Remove the implicit sequential fallback from core deleting types/configuration/execution and add actionable missing-executor checks; update core tests for one bulk call, no single fallback, confirmation, rejection and success deselection.
- [x] 5.2 Wire connector deleteMany into the explicit bulk handler and migrate examples/tests that used bulk true with only onDelete; verify both kit selection bars and document the explicit-loop migration for applications that intentionally need it.
- [x] 5.3 Add breaking-change release notes/changesets for affected published grid contracts and the connector release; verify documented partial-success limitations and that no automatic per-row success protocol is implied.

## 6. Pending modal behavior

- [x] 6.1 Update built-in Save/Cancel disabling and configured close/Escape/backdrop behavior in both kits while preserving custom-handler signals; verify pending UI and duplicate-submit protection in component tests and document the FormModal session/transport distinction.
- [x] 6.2 Verify connector mutations continue independently after dismissal and cannot write into a newer form session; add runtime tests for old success/error, newly opened forms and connector unmount.
- [x] 6.3 Add browser coverage in both kits for pending close, successful close before refetch completion, grid fetching feedback and refetch error without reopening the saved form.

## 7. Integration documentation and release validation

- [x] 7.1 Deliver a reproducible example using one existing OpenAPI generator and typed fetchers without generated hooks; document generator/version, signal wrapper, API-convention factory, per-entity source and both component/hook entry paths; verify generation and example type checking.
- [x] 7.2 Add package README and docs navigation/API tables/examples with required repository registrations and guards; verify documented options against actual exported types and run examples in both kit modes.
- [x] 7.3 Record durable decisions D1-D8 in appropriately scoped ADRs and AGENTS links before archive, preserving accepted records unless explicitly superseded; verify the migration and documentation describe the final implemented API rather than sketches.
- [x] 7.4 Run targeted tests followed by repository-required build, lint, typecheck, test and size checks, plus affected browser suites and supported React-version checks; report actual commands/results and resolve failures before marking complete.

## Workflow follow-up

- Implementation and validation are complete with the explicitly accepted Google Fonts environment exception. See `validation.md`; the site production build is not claimed as passing.
- Archive after implementation and review, merging the capability deltas and verifying no cancellation/fallback claims remain inconsistent.
