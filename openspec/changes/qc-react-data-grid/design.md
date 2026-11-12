# Design

## Context

See proposal.md for motivation. `use-data-grid.ts` owns a v9 TanStack Table and publishes data/configuration changes separately from table state. `useDataGridSelector` reads the table store; draft-enabled `onStateChange` already projects applied sorting/filtering/search. Arbitrary `table.setOptions` writes are not a supported reactive publication channel.

`create-data-grid.tsx` exposes a `DataGridBundle` parameterized by cell types, features, context and column config. The component supports inline config or an explicit table. Preserve these contracts and compound members. Existing query-react gates remain native-result presentation wrappers; this connector is not another gate.

Core deleting currently falls back from bulk to sequential single handlers. Core editing/creating invalidate form work on cancellation; modal cancellation is specified as cancellation of form work. Connected mutations need independent ownership so dismissal does not cancel server work or skip cache updates.

Read constraints: ADR 0001 (selector isolation), 0003 (feature composition), 0021 (package naming), 0022 (native Query ownership), 0026-composed-grid-reactivity, 0026-mutation-native-render-result and 0027-infinite-query-native-gate. No Query gate contract is superseded. Extend the package-family convention with `qc` = Query Connector; create ADRs for durable decisions before archive, not during planning.

## Goals / Non-Goals

**Goals:** one reusable API-convention factory, small per-entity sources, native options interoperability, two equivalent grid entry paths, and preserved inferred types. A library-neutral data/result boundary prevents base-grid dependence on query libraries.

**Non-Goals:** a universal cache abstraction, runtime switching between query libraries, hook code generation, new visual grid implementations, or a second table-state store. Scope exclusions are in proposal.md.

## Decisions

### D1 — Durable: package and dependency boundary

Ship `@ez-kit/qc-react/data-grid` from `packages/qc/react`. React and TanStack Query are peers; data-grid-react is an optional peer for the package, required when consuming this entry. Add a direct core dependency/peer only if implementation imports it, following repository dependency conventions. No dependency on query-react or either visual kit. Do not create qc-core until a second framework shares code. Future `/form` stays independent; no eager barrel should import unrelated integrations.

The base grid consumes rows, totals, loading and operation callbacks. Query options, keys, tags and invalidation belong to the library connector. RTK/SWR feasibility was assessed from documentation, not implemented; their future inputs need not resemble TanStack sources. Reject forcing RTK endpoints/tags into TanStack key/options semantics.

### D2 — Durable: options are the execution contract, fetchers are the convenience API

Expose a low-level `defineGridDataSource` for existing native option factories and `createGridSourceFactory` for reusable API conventions. Public spelling follows the accepted sketch: `getAll`, `getInfinite`, `create`, `update`, `delete`, `deleteMany`; `prepareArgs`, `preparePageArgs`, `getRows`, `getRowCount`, `getNextPageParam`, native `options`, and `transformError`.

A shared factory returns an entity-source constructor. Entity operations accept a bare fetcher using inherited conventions or an expanded descriptor with operation-specific overrides. This normalizes to the same typed options-based source consumed by the React connector. No implicit deep merging of callbacks; operation configuration overrides factory configuration, with lifecycle composition owned explicitly by the connector. Read overrides retain the API convention’s declared request/response contract. Public `createListSource` and `createInfiniteSource` helpers normalize exceptional endpoint DTOs and selected response shapes for `defineGridDataSource`, inferring their own fetcher types. An operation-level `options` object replaces the factory options object as a whole.

`prepareArgs` transforms grid parameters or operation context into the fetcher's business argument. No mandatory `{path, query, body}` envelope: a generated client owns HTTP layout. Use a normalized transport call `fetcher(args, { signal })` for reads, with one wrapper at the project adapter boundary for generators with different signatures. Mutation dismissal signals are not forwarded automatically. Prepared business arguments, not signals, participate in keys. Defaults reading `row.id` require a declared row constraint; never hide incompatible fetchers with public `any`.

Normalize mutation contexts to original entities: update receives `row`, `rowId`, `values`; delete receives an original `row`; bulk receives original `rows` and grid IDs. Retain the possible missing update row in types and require a guard or a factory policy that rejects before request. Row IDs are not assumed to be API IDs. `prepareArgs` remains synchronous; domain workflow effects belong in handlers/mutations.

Responses stay in the Query cache in their native form. `getRows` and totals project the observer result, including native `select` output. Infinite options must retain enough typed page structure to extract rows; constrain unsupported select shapes rather than silently erasing types. Factory-created options must be reusable for prefetch and ordinary queries through a typed source query-options surface (`source.queries.list(params)` / `infinite(params)`).

### D3 — Durable: one connected bundle, two entry paths

`withQuery(bundle)` returns the bundle surface with an extended DataGrid and useDataGrid, preserving helpers, providers, context readers and compound JSX members. Support inline `dataSource` or connected `useDataGrid({ dataSource, ... })` plus `<DataGrid table={table} />`; never bind a supplied table twice.

Use one query-binding implementation and a minimal library-neutral React bridge in data-grid-react if needed for ordering table creation, state subscription and external option publication. This seam must use the existing data/config publication mechanism rather than imperatively assigning unobserved options. Parameters remain table-owned; Query results remain Query-owned. Preserve stable table identity, static children updates and selector isolation.

Create stable hook paths for paged/infinite execution and optional mutations. Runtime page-mode switches must not conditionally change hook order or remount the table; inactive modes must not fetch. Native hooks remain the execution engine. Do not build a second cache/subscription implementation to solve hook ordering.

### D4 — Durable: typing and capabilities

Infer row type from response extraction and check columns against it, preserving bundle cell registries, feature typing, context and column-config layers. Infer mutation variables/results/errors from native options or fetchers, and check prepareArgs output against variables. Retain readonly return compatibility where appropriate and do not silently widen incompatible types.

Operations are capabilities, not enablement: editing/creating/deleting must be explicitly enabled (true or enabled config). Existing feature registration remains required; do not reinstate a global compile-time feature gate rejected by ADR 0003. An enabled operation needs a source executor or explicit handler. Catch statically knowable source/config mismatches in types and dynamic ones with actionable runtime errors. Explicit grid onSave/onDelete handlers replace auto wiring completely, including automatic invalidation for that action.

### D5 — Durable: parameters and pagination

Read pagination, sorting, columnFilters and globalFilter from selectors. For draft mode use applied query axes, sharing the existing projection semantics. Respect current input debounce. Reset to page zero atomically with changed applied criteria, avoiding a request combining new criteria and the old page. Do not reset while only draft inputs change.

Server-driven sources imply manual processing for the connected query axes to avoid double slicing/filtering. Preserve ordinary unconnected client-grid behavior. Correct an out-of-range page after fresh successful totals arrive (including deleting the final row); never clamp against placeholder/stale totals. Empty datasets settle on index zero. With no authoritative totals, do not guess the last page.

Infinite mode passes filters/sort/search/pageSize as collection arguments; pageParam belongs to the infinite query, not the collection key. Flatten cached pages for the grid without also appendData-ing them. Wire hasNextPage/loadMore and next-page pending/error separately from initial and background loading. A changed collection key uses its own cache or first page, never appending the prior collection. Keep existing rows on next-page failures and support retry without concurrent duplicate loads. Preserve pages/infinite mode switching on the same table.

### D6 — Durable: keys and invalidation

Fetcher sources need only a base key: `[...key, 'list', preparedArgs]` for ordinary lists and `[...key, 'infinite', collectionArgs]` for infinite collections. Include every request-affecting business argument (tenant included), excluding the per-page infinite cursor and transport signal. The same key means interchangeable cached data, not a unique grid instance. Existing options retain their own keys and need an explicit invalidation policy if they do not follow factory-owned key families; never rewrite keys or guess their parent prefixes.

On successful built-in mutations invalidate both list families. Undefined policy means defaults; false disables; `{ additional: InvalidateQueryFilters[] }` adds to defaults; `{ replace: InvalidateQueryFilters[] }` replaces them. Additional/replace are mutually exclusive. Resolve operation override before source policy; additional at operation level augments the resolved source rules, replace/false overrides them. Each filter object matches a separate query family; array elements inside queryKey form one composite key.

Automatic invalidation does not delay mutation completion or form closing. Observe its promise without unhandled rejections; refetch failure remains query/loading failure, not failed persistence. Preserve native user callbacks and their awaited semantics. Internal success invalidation must still run if user onSuccess throws after the server succeeded. Prefer composing the hook-level success callback with a finally-protected, non-blocking invalidation launch; preserve all native callback arguments and returned optimistic context. Built-in pending work must retain these callbacks after its form dismisses/unmounts, not depend on per-call callbacks that can disappear with an observer.

### D7 — Durable: errors and background mutations

`transformError` is inherited from the factory/source and replaceable per operation. Native mutation lifecycle receives the original error; only the error delivered to grid form handling is transformed, commonly into existing ValidationError. Preserve unknown errors by default. Never insert late validation errors into a closed or newer form session.

Save and Cancel buttons are disabled during pending validation/submission. Modal close, and Escape/backdrop where configured, abandon form work while the already-dispatched connected mutation continues. The connector does not couple form cancellation signals to HTTP mutation cancellation. Reads use native Query signals. Keep existing explicit custom-handler signal contracts; do not promise server rollback on any abort.

After successful persistence and native user lifecycle completion, finish the form without awaiting automatic list refetch. Existing rows and isFetching provide feedback in the grid. If the form was dismissed, success still invalidates and errors still reach configured mutation onError. No automatic optimistic updates are added.

### D8 — Durable: explicit bulk deletion

Remove the sequential fallback from core `deleteRows`. A bulk operation is one explicit handler; connected deleteMany installs it. Enabled bulk without a handler is invalid, even when a single-delete handler exists. Keep confirmation and success deselection. A rejected bulk operation does not claim all selected rows succeeded. Partial-success API envelopes need an explicit project adapter; first scope does not invent per-row result semantics. Applications wanting a loop must author it and own partial failures.

## End-to-end API examples

These examples capture the agreed consumer experience. Source factories and withQuery now have executable type/runtime fixtures, including both kits. The generated-client walkthrough is implemented with Orval 8.47.0 in `packages/qc/react/examples/orval`. API-specific helper functions below belong to the application. The package README and docs API tables describe the implemented exports.

### 1. Generated client and transport boundary

Assume an API returns `Page<User>` and its generated client has these representative signatures:

```ts
type User = { id: string; name: string; email: string; version: number }
type Page<T> = { items: T[]; totalCount: number; nextCursor: string | null }
type ReadTransport = { signal?: AbortSignal }

// Representative generated signatures, not connector-defined HTTP conventions.
declare function getUsers(
  args: { query: { offset: number; limit: number; sort: string; filters: string; search: string } },
  transport?: ReadTransport,
): Promise<Page<User>>

declare function updateUser(args: {
  path: { id: string }
  body: Partial<Pick<User, 'name' | 'email'>> & { version: number }
}): Promise<User>
```

`path.id` means a URL parameter only because this generated client defines it that way. A client accepting `{ userId, data }` instead gets a corresponding prepareArgs; no connector code changes. A client with different transport conventions is wrapped once at the application's client boundary:

```ts
const getUsers = (args: GeneratedListArgs, transport: ReadTransport) =>
  generated.getUsers({ ...args, signal: transport.signal })
```

No generated React hooks are required. Read signals come from Query. Form dismissal signals are not automatically forwarded to mutation fetchers.

### 2. Shared API-convention factory

```tsx
// shared/api/grid-source.ts
import { createGridSourceFactory } from '@ez-kit/qc-react/data-grid'

type Page<Row> = { items: Row[]; totalCount: number; nextCursor: string | null }

export function createApiGridSource<Row extends { id: string }>() {
  return createGridSourceFactory({
  list: {
    prepareArgs: ({ pagination, sorting, columnFilters, globalFilter }) => ({
      query: {
        offset: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
        sort: serializeSorting(sorting),
        filters: serializeFilters(columnFilters),
        search: normalizeSearch(globalFilter),
      },
    }),
    getRows: (response: Page<Row>) => response.items,
    getRowCount: response => response.totalCount,
  },

  infinite: {
    initialPageParam: null as string | null,
    prepareArgs: ({ pageSize, sorting, columnFilters, globalFilter }) => ({
      query: {
        limit: pageSize,
        sort: serializeSorting(sorting),
        filters: serializeFilters(columnFilters),
        search: normalizeSearch(globalFilter),
      },
    }),
    getRows: (response: Page<Row>) => response.items,
    preparePageArgs: ({ args, pageParam }) => ({
      ...args,
      query: { ...args.query, cursor: pageParam },
    }),
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  },

  mutations: {
    create: {
      prepareArgs: ({ values }) => ({ body: values }),
    },
    update: {
      prepareArgs: ({ row, values }) => {
        if (!row) throw new Error('The edited row is no longer available')
        return { path: { id: row.id }, body: values }
      },
    },
    delete: {
      prepareArgs: ({ row }) => ({ path: { id: row.id } }),
    },
    deleteMany: {
      prepareArgs: ({ rows }) => ({ body: { ids: rows.map(row => row.id) } }),
    },
  },

  transformError: toGridError,
  })
}
```

The application declares the API convention once as a generic function. Each entity supplies its row type once through `createApiGridSource<User>()`; the returned function infers fetcher arguments, mutation results and lifecycle contexts from its configuration. The row constraint makes shared access to `id` safe. A stricter fetcher requires its own prepareArgs if the default arguments are not assignable to its input, as below.

### 3. Entity configuration and a strict update override

```tsx
// entities/users/data-source.ts
import { createApiGridSource } from '@/shared/api/grid-source'
import {
  getUsers, getUsersInfinite, createUser,
  updateUser, deleteUser, deleteUsers,
} from './generated-api'

export const usersSource = createApiGridSource<User>()({
  key: ['users'],
  getAll: getUsers,
  getInfinite: getUsersInfinite,
  create: createUser,
  delete: deleteUser,
  deleteMany: deleteUsers,

  update: {
    fetcher: updateUser,
    prepareArgs: ({ row, values }) => {
      if (!row) throw new Error('The edited row is no longer available')
      return {
        path: { id: row.id },
        body: { name: values.name, email: values.email, version: row.version },
      }
    },
    options: {
      onSuccess: () => toast.success('Saved'),
      onError: error => reportApiError(error),
    },
  },
})
```

The implementation type fixture must account for exact optional properties when building patch bodies (omit absent properties rather than assigning undefined if required by the client). Bare fetchers use shared defaults. Expanded operation descriptors override preparation or native options without rewriting the connector. `options` retains the native query/mutation meaning; it cannot override factory-owned queryKey/queryFn/mutationFn accidentally.

The factory automatically produces keys such as:

```ts
['users', 'list', { query: { offset: 0, limit: 20, /* criteria */ } }]
['users', 'list', { query: { offset: 20, limit: 20, /* criteria */ } }]
['users', 'infinite', { /* collection arguments, excluding page cursor */ }]
```

`users` is a business resource, not a component ID. Successful built-in create/update/delete/deleteMany invalidates users/list and users/infinite without any explicit policy. The source must account for tenant and other request-affecting scope in its arguments or base key.

### 4. Connect the existing grid bundle once

```tsx
// shared/ui/data-grid.ts
import { withQuery } from '@ez-kit/qc-react/data-grid'
import { gridBundle } from './grid-bundle'

export const {
  DataGrid,
  useDataGrid,
  createColumns,
  useGridContext,
} = withQuery(gridBundle)
```

`gridBundle` is the existing application's `createDataGrid({ components, features, cellTypes, ... })` result. It already chooses shadcn/heroui/custom presentation. The connector does not create a new visual kit. Keep the application's existing providers and stylesheet setup. A native QueryClientProvider must be mounted above connected consumers; the connector does not create an isolated client per grid.

### 5. Inline source, explicit actions and composed children

```tsx
import { DataGrid, createColumns } from '@/shared/ui/data-grid'
import { usersSource } from '@/entities/users/data-source'

const columns = createColumns<User>([
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
])

export function UsersPage() {
  return (
    <DataGrid
      dataSource={usersSource}
      columns={columns}
      getRowId={user => user.id}
      pagination={{ pageSize: 20 }}
      sorting
      filtering
      editing={{ mode: 'modal' }}
      creating={{ mode: 'modal' }}
      deleting={{ bulk: true }}
    />
  )
}
```

Omitting editing does not enable it just because update exists. Existing bundle feature registration still applies. The automatic list mode supplies server/manual processing. Existing composed children, for example `<DataGrid.Table />`, remain available; layouts can still use the bundle's other compound components without a second query connection.

### 6. Explicit table and infinite mode

```tsx
const table = useDataGrid({
  dataSource: usersSource,
  columns,
  getRowId: user => user.id,
  pagination: { pageSize: 20 },
  editing: true,
})

return <DataGrid table={table} />
```

No second dataSource is passed with an already-connected table. For infinite loading:

```tsx
<DataGrid
  dataSource={usersSource}
  columns={columns}
  getRowId={user => user.id}
  pagination={{ mode: 'infinite', pageSize: 50 }}
  sorting
  filtering
/>
```

The source supplies getInfinite; Query owns pages/pageParams. The connector forwards accumulated rows and load-more status, rather than asking application code to append rows. With draft enabled, pending filter edits do not change requests; applying them switches to the applied collection.

### 7. Invalidation defaults and explicit overrides

These are alternative configurations, not fields to use together:

```tsx
// Omitted invalidate: automatic list + infinite invalidation.

invalidate: false

invalidate: {
  additional: [
    { queryKey: ['users-count'] },
    { queryKey: ['dashboard'], exact: true },
  ],
}

invalidate: {
  replace: [{ queryKey: ['custom-resource'] }],
}
```

At operation level:

```tsx
update: {
  fetcher: updateUser,
  prepareArgs: prepareUserUpdate,
  invalidate: { additional: [{ queryKey: ['audit-summary'] }] },
}
```

Source additional rules extend defaults; operation additional rules extend the resolved source rules. Replacement replaces that set, and false disables it. Two filter objects mean two targets; `queryKey: ['users-count', 'dashboard']` is one composite prefix, not both independent keys. Automatic invalidation runs in the background; an awaited user onSuccess retains native semantics.

### 8. Native options integration preserves existing cache keys

```tsx
import { defineGridDataSource } from '@ez-kit/qc-react/data-grid'

const usersSource = defineGridDataSource({
  getAll: {
    query: params => usersQueries.list(prepareUsersRequest(params)),
    getRows: response => response.items,
    getRowCount: response => response.totalCount,
  },
  getInfinite: {
    query: params => usersQueries.infinite(prepareUsersCollection(params)),
    getRows: page => page.items,
  },
  update: {
    mutation: updateUserOptions(),
    prepareArgs: prepareUserUpdate,
  },
  invalidate: {
    replace: [
      { queryKey: ['api', 'users-list'] },
      { queryKey: ['api', 'users-infinite'] },
    ],
  },
})
```

Here `usersQueries` and `updateUserOptions` are existing project/native factories. `query` on getInfinite returns native infinite options including initialPageParam and getNextPageParam. Its getRows projects each page from the typed page collection. Their keys remain intact; the connector does not append its own list/infinite segments. This is the lower-level path, not a second React execution engine.

For factory-owned queries, the reusable surface is:

```tsx
await queryClient.prefetchQuery(usersSource.queries.list(gridParams))
// A normal component can use the same options and cache:
const result = useQuery(usersSource.queries.list(gridParams))
```

The last snippet assumes a factory-created usersSource, not a promise that arbitrary external options follow generated key conventions.

### 9. Explicit grid handlers replace automatic mutation wiring

```tsx
<DataGrid
  dataSource={usersSource}
  columns={columns}
  editing={{
    onSave: async ctx => {
      await saveThroughCustomWorkflow(ctx)
      await refreshCustomWorkflowData()
    },
  }}
/>
```

Only this onSave runs. Source update and connector invalidation for that action do not run in addition. The same applies to deleting.onDelete and deleting.bulk.onDelete. For ordinary toasts or analytics, use native mutation lifecycle instead of replacing the whole handler.

### 10. Validation and modal lifetime

```tsx
import { ValidationError } from '@ez-kit/data-grid-core'

function toGridError(error: unknown) {
  if (isApiValidationError(error)) {
    return new ValidationError({
      errors: error.fieldErrors,
      formError: error.message,
    })
  }
  return error
}
```

The application owns isApiValidationError and its typed API shape. Native mutation onError sees the original API error; only the grid-facing rejection is transformed. An operation can replace the shared transformError.

```text
Save --> request pending --> Save/Cancel disabled
                         --> close control can dismiss the form
request succeeds --> active form finishes
                 --> list invalidation starts in background
                 --> grid keeps rows and shows fetching state
```

A late result cannot reopen the dismissed form, close a newer one, or attach old field errors to it. A refetch failure is a list error, not a failed save.

### 11. Bulk migration for an unconnected grid

```tsx
// Before: implicit loop, removed by this change.
deleting: { onDelete: deleteOne, bulk: true }

// After: explicitly supply the batch operation.
deleting: {
  onDelete: deleteOne,
  bulk: {
    onDelete: async ({ rows }) => {
      await deleteUsers({ body: { ids: rows.map(row => row.original.id) } })
    },
  },
}
```

This base-grid callback still receives TanStack row objects; source prepareArgs receives normalized original entities. Connected users instead configure deleteMany and opt into `deleting={{ bulk: true }}`. Missing batch execution is an error, not a fallback. An application-authored loop is possible but owns partial success and cache reconciliation.

## Risks / Trade-offs

- Generic factory inference across generated clients → first implementation task is executable type fixtures for both kits and differing signatures; no public casts that erase constraints.
- Table/query circular initialization and reactive totals → prototype a minimal shared React seam and test retained JSX, initial fetch and configuration replacement before broad implementation.
- Closing/unmounting a mutation observer loses callbacks → use persistent native mutation lifecycle callbacks and test successful invalidation after form and grid unmount.
- Background invalidation temporarily displays old rows → use existing fetching UI; this is the agreed behavior, not an optimistic update.
- RTK/SWR differ in cache and hook ownership → keep only the result boundary neutral; no compatibility claims for adapters not shipped.
- User lifecycle can throw after server success → protect internal invalidation and do not misclassify the persistence outcome in connector-owned logic.

## Migration Plan

1. Add connector package and narrow neutral bridge without changing unconnected read behavior.
2. Replace implicit bulk loops with explicit-handler configuration checks; migrate package tests, docs examples and registry consumers' instructions. Changesets must mark affected published grid contracts as breaking.
3. Update both kits' pending modal controls; clarify form-session cancellation versus connected server-mutation lifetime in the existing modal spec/docs.
4. Publish connector documentation and a reproducible generated-client example (typed fetchers, no generated hooks required). The example uses Orval 8.47.0 with its fetch client and a shared transport mutator; the pinned generation/check scripts, OpenAPI input, generated output and checked component/hook recipes live in `packages/qc/react/examples/orval`.
5. Run targeted type/runtime/browser checks then repository-required validation. Record durable ADRs and AGENTS links before archiving; preserve existing ADRs unless explicitly superseded.
6. Revert the coordinated release changes if necessary; no persisted-data migration is introduced. Do not remove individual package exports independently of their consumers.

## Open Questions

Only implementation-level details remain: the smallest neutral bridge signature; exact generic helper spelling needed for factory constraints; and the generated-client fixture tool/version. Resolve through the explicitly scoped type/runtime spikes without changing the specified behavior. If the accepted bundle API cannot preserve types or mode switching, report the concrete constraint before changing that API.

### Resolved implementation finding: infinite collection arguments

The first implementation pass found an unresolved public-contract detail in D6. The accepted infinite prepareArgs receives pageParam and returns an arbitrary client argument. The connector cannot structurally remove that cursor from an arbitrary return value (it can live in a URL, body, nested array or encoded string) while preserving all request-affecting collection arguments. Using only raw grid state would miss external tenant/context values introduced during preparation.

Confirmed by the user: prepareArgs builds collection arguments without a page cursor; a separate preparePageArgs combines those arguments with pageParam for the actual request. Keys use only the collection arguments. Both callbacks can be shared once in the API-convention factory. Use this two-callback contract for implementation; pageParamPath was explicitly rejected. The alternative is an explicit collection-key projection, which requires the application to duplicate and keep request identity in sync.

### Implementation finding: shared generic factory inference (resolved)

The user accepted an explicit row type once per entity. API conventions are declared
as `function createApiGridSource<Row extends Entity>() { return createGridSourceFactory({ ... }) }`.
Entity configuration calls `createApiGridSource<User>()({ ... })`. The two calls separate
explicit row specialization from inference of each operation's arguments, results,
errors and optimistic context; supplying one type argument must not fix the remaining
operation parameters to defaults. Constraints and response envelopes are owned by the
application's convention, not hard-coded into the connector. The executable fixture
uses the same convention for User and Project and rejects incompatible preparation.

### Implemented connection seam

`withQuery(bundle)` preserves the original helpers and compound members. Its connected
config replaces data with dataSource; its controlled component path accepts table and
never creates another binding. The existing bundle hook now accepts an optional
`DataGridConfigTransform<Features, Row>` as its second argument. The transform receives
fully merged factory/provider/instance options before write-handler normalization.
This keeps defaults and explicit feature disablement intact without importing Query
into data-grid-react. The connector subscribes to table-owned applied axes, executes
fixed query/mutation hooks and feeds a stable result projection through the original
hook's configuration/publication path before children commit. No imperatively assigned
unpublished table options or second parameter store are involved.

### Resolved paging bounds

`getRowCount` may return `undefined` for a response without a known total. The connector then publishes unknown page count without retaining a previous total. Bounds correction waits until the current list request is successful, is not fetching, and is not placeholder data; stale cached totals cannot reset a restored page while its refetch is pending.
