# Proposal

## Why

Applications currently repeat the wiring between grid state, server requests, loading, pagination and mutation handlers. Provide a reusable Query Connector that preserves existing grid composition and TanStack Query behavior while making a new entity mostly a configuration task.

## What Changes

- Add `@ez-kit/qc-react/data-grid` in `packages/qc/react`, with TanStack Query as the first backend and no query-library dependency in the base grid.
- Add typed source factories: shared API conventions, entity fetchers, `prepareArgs`, response projections, native options and error transformation. Accept existing native options without rewriting their keys.
- Connect an existing grid bundle; support both `DataGrid dataSource={source}` and the connected `useDataGrid({ dataSource })` followed by `DataGrid table={table}`.
- Support paged and infinite lists, applied draft state, create/update/delete/deleteMany, explicit feature enablement and callback overrides.
- Generate list/infinite cache keys from one base key for fetcher sources; invalidate both list families after successful mutations in the background, with disable/additional/replace overrides.
- **BREAKING**: remove the base grid's implicit bulk-to-single delete loop. Enabled bulk deletion requires its own handler; the connector supplies `deleteMany` when present.
- Disable modal Save/Cancel during submission while allowing configured dismissal. Connector mutations continue after dismissal; late results cannot affect another form session.
- Add documentation, a generated-client integration example, type checks and behavior coverage for both UI kits. No implementation code is part of this planning change.

## Capabilities

### New Capabilities

- `query-grid-connector`: typed sources, bundle connection, state/data projection, cache policy and mutation lifecycle.
- `data-grid-bulk-deletion`: explicit bulk execution without implicit per-row fallback.

### Modified Capabilities

- `data-grid-form-modal`: pending button and dismissal behavior, including isolation from late completion.

## Impact

New package peers include React and TanStack Query; the grid peer is optional at package level and required for the `/data-grid` entry. No runtime dependency on `query-react` or a particular UI kit is required. Base core deletion types/execution, React mutation configuration and both kits' modal controls need coordinated changes and release notes. Existing loading, infinite, validation, column/context typing and render-isolation contracts remain constraints.

First scope excludes form integration, updateMany UI, SWR/RTK adapters, other frameworks, a new OpenAPI generator, automatic optimistic updates, all-matching selection and server grouping/aggregation. A partial-success bulk response format is not introduced; projects must explicitly adapt such APIs.

## Review examples

See [Design — End-to-end API examples](design.md#end-to-end-api-examples) for the API-convention factory, entity source, bundle connection, component/hook usage, infinite queries, invalidation overrides, native options, errors and bulk migration. These are proposed consumer fixtures, not existing exports.
