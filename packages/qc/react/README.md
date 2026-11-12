# @ez-kit/qc-react

Query Connector for React. The `/data-grid` entry connects existing grid bundles to
TanStack Query without adding a query dependency to the base grid.

React and TanStack Query are peers. The data-grid peer is required when using
`/data-grid` and must include the configuration-transform bridge (0.20 or newer);
no visual kit is imported by this package. The workspace supplies that bridge as part
of this change.

## Documentation

See the [connector guide and API](https://ez-kit-docs.vercel.app/docs/qc-react)
for interactive examples in both kits and the source/options reference.

## Connect a bundle

```tsx
import { createDataGrid } from '@ez-kit/data-grid-react'
import { withQuery } from '@ez-kit/qc-react/data-grid'

export const { DataGrid, useDataGrid, createColumns } = withQuery(
  createDataGrid({ components, features, cellTypes }),
)

// Inside the application's QueryClientProvider:
<DataGrid dataSource={usersSource} columns={columns} pagination={{ pageSize: 20 }} />

// Or create the table in a component. Passing it to DataGrid adds no second binding.
const table = useDataGrid({ dataSource: usersSource, columns })
return <DataGrid table={table}><DataGrid.Table /></DataGrid>
```

`withQuery` accepts the existing `DataGridBundle` and returns its helpers and compound
components with connected `DataGrid` and `useDataGrid` signatures. Their configuration
replaces `data` with `dataSource`; a supplied `table` cannot also receive a source.
Custom cells, per-instance cell extensions, context, column-config layers and feature
set overrides retain the bundle's types. Define bundles outside component renders.

Request parameters come from table state, with draft axes read from their applied
snapshot. Criteria changes request page zero immediately; successful fresh totals
correct out-of-range pages, while placeholder totals do not. Sorting and filtering
remain server-owned. Existing UI enablement and option-layer precedence are retained.

For infinite mode, provide `getInfinite` and set `pagination={{ mode: 'infinite' }}`.
Query owns accumulated pages; the grid's existing load-more channel handles forward
loading and retries. The connection can switch modes without replacing the table.

Actions need explicit enablement (`editing: true`, `creating: true`, or `deleting`
configuration). Source operations alone do not enable them. An explicit `onSave` or
`onDelete` replaces that action's automatic execution and invalidation. Enabled
bulk deletion requires `deleteMany` or its own `deleting.bulk.onDelete`; the connector
never loops over the single-delete operation. Successful built-in mutations invalidate
the source's list families without waiting for refetch. Native lifecycle callbacks
retain their usual awaited semantics.

The neutral grid seam is an optional second argument to a bundle's `useDataGrid`:
`transformConfig(mergedConfig) => config`. It runs after factory/provider/instance
options merge and before handler normalization. `withQuery` uses it to supply results
through the existing data/config publication path. This seam adds no Query dependency
to the base grid and does not maintain a second parameter store.

## Shared API conventions

Declare the convention once as a generic function. Specify the entity row type once;
the second call infers each mutation's arguments and result independently. Read
fetchers follow the API convention's request/response contract:

```ts
import { createGridSourceFactory } from '@ez-kit/qc-react/data-grid'

type Page<Row> = { items: Row[]; total: number }

function makeSource<Row extends { id: string }>() {
	return createGridSourceFactory({
		list: {
			prepareArgs: ({ pagination }) => ({
				offset: pagination.pageIndex * pagination.pageSize,
				limit: pagination.pageSize,
			}),
			getRows: (response: Page<Row>) => response.items,
			getRowCount: (response) => response.total,
		},
		mutations: {
			delete: { prepareArgs: ({ row }) => ({ id: row.id }) },
		},
	})
}

const usersSource = makeSource<User>()({
	key: ['users'],
	getAll: getUsers,
	delete: deleteUser,
})
```

The convention defines its own response envelope and row constraints. There is no
built-in `items`, `id`, or HTTP location convention. Mutation preparation receives
original entities; `rowId` is the table's identifier and can differ from an API ID.
An update context can have `row: undefined` if the edited row is no longer available.

Expanded operations accept `{ fetcher, prepareArgs, options, invalidate, transformError }`.
If shared preparation cannot satisfy a stricter fetcher argument, TypeScript requires
an operation-specific `prepareArgs`. Native mutation lifecycle options infer that
operation's result and variables. `queries.list(params)` exposes generated options
for ordinary TanStack consumers and prefetching into the same cache.

## Infinite request preparation

`prepareArgs(params)` prepares the collection criteria. These arguments identify the
cache entry: `[...key, 'infinite', args]`. `preparePageArgs({ args, pageParam })`
constructs the actual fetcher argument for each page, including the first one:

```ts
prepareArgs: ({ globalFilter, pageSize }) => ({
  body: { search: String(globalFilter ?? ''), limit: pageSize },
}),
preparePageArgs: ({ args, pageParam }) => ({
  body: { ...args.body, continuation: pageParam },
}),
```

The field `continuation` is an API-specific choice. The callback can place the cursor
anywhere in the DTO; the connector does not interpret paths or choose HTTP locations.
The generated client owns URL/body serialization. Return new arguments rather than
mutating `args`, which also participates in the cache key.

TanStack owns the cached `pages` and `pageParams`. Advancing the cursor does not
create another collection entry. Changing prepared filters or other collection
criteria does. Read fetchers receive `{ signal }` separately from business arguments;
a wrapper can adapt this to the generated client's transport signature.

### Modal lifetime

Built-in modals disable Save and Cancel during validation/submission. Closing the dialog
(including enabled Escape/backdrop dismissal) abandons the form session, but an already
dispatched connector mutation continues. Native callbacks and invalidation survive grid
unmount. A late success or transformed validation error cannot change a newer form.
Explicit custom handlers keep the grid’s cancellation signal contract.

Successful saves await user mutation callbacks, then close the form without awaiting
automatic refetch. Existing rows remain visible while refreshing; a refresh failure is
a list error and does not reopen the saved form.

## Cache scope and invalidation

Generated keys use `[...key, 'list', preparedArgs]` and
`[...key, 'infinite', collectionArgs]`. Include every request-affecting value in
those arguments or the base key. For tenant-scoped invalidation, use a base key
such as `['tenants', tenantId, 'users']`: mutations then invalidate only that
tenant's two list families. A tenant in prepared arguments also separates cache
entries, but a shared `['users']` base invalidates lists for every tenant.

Successful built-in mutations invalidate both list families, excluding details.
By TanStack's defaults, active queries refetch; inactive queries become stale.
Each entry accepts native `InvalidateQueryFilters`, including `exact`, `predicate`
and `refetchType`. For example:

```ts
invalidate: {
  additional: [
    { queryKey: ['users-count'], exact: true },
    { queryKey: ['dashboard'], refetchType: 'all' },
  ],
}
```

These are two independent filters. `queryKey: ['users-count', 'dashboard']`
is one composite key, not a request to invalidate both top-level keys.

Source policies apply to the default list families. Operation policies then apply
to the resolved source policy: omitted inherits, `false` disables, `additional`
appends and `replace` replaces everything. `defineGridDataSource` preserves native
keys and requires an explicit `invalidate` policy (use `false` to opt out).

Mutation failures do not launch automatic invalidation. User lifecycle retains
its native awaited behavior and optimistic context. Internal invalidation starts
after `onSuccess` settles, even if that callback throws; user callback failures
still follow TanStack's normal error behavior. `onSettled` is also awaited before
the save finishes. Automatic refresh itself is not awaited. A rejected refresh or
a throwing filter predicate cannot turn persistence into failure or prevent other
invalidation filters from running.

## Server validation

Map API errors at the grid boundary using `transformError`. Native `onError`
receives the original error; field handling receives the transformed error.
An operation's mapper overrides the inherited mapper. Unrecognized errors should
be returned unchanged:

```ts
import { ValidationError } from '@ez-kit/data-grid-react'

const source = makeSource<User>()({
	key: ['users'],
	getAll: getUsers,
	transformError: (error) => {
		if (error instanceof ApiValidationError) {
			return new ValidationError({
				errors: error.fields, // Record<string, string[]>, keyed by grid field ID
				formError: 'Please correct the highlighted fields.',
			})
		}
		return error
	},
	update: updateUser,
})
```

`ApiValidationError` is the application's API error class. No API error format is
assumed by the connector. The active form displays mapped errors; dismissed or
replaced form sessions ignore late results while native callbacks still run.

## Operation overrides and exceptional endpoints

A bare fetcher inherits its API convention. An expanded operation replaces only
the properties it supplies (`prepareArgs`, `getRows`, `getRowCount`, and, for
infinite reads, `preparePageArgs`, cursor callbacks and `initialPageParam`).
An `options` object replaces the inherited native options object as a whole;
callbacks are not implicitly combined. Omit `options` to inherit it. For example:

```ts
const source = makeSource<User>()({
	key: ['users'],
	getAll: {
		fetcher: getUsers,
		prepareArgs: ({ pagination }) => ({
			offset: pagination.pageIndex * pagination.pageSize,
			limit: pagination.pageSize,
		}),
		options: { staleTime: 30_000, retry: 1 },
	},
})
```

The read request and response types still belong to the declared convention.
For an endpoint with a different DTO/envelope or a `select` returning a different
shape, use the public `createListSource` / `createInfiniteSource` helpers and
assemble a `defineGridDataSource`. These helpers infer from that endpoint's fetcher
and keep Query's raw cached response separate from its selected projection:

```ts
import { createListSource, defineGridDataSource } from '@ez-kit/qc-react/data-grid'

// searchUsers accepts { body: { skip: number; take: number } } plus { signal },
// returning Promise<{ records: User[] }>.
const source = defineGridDataSource({
	getAll: createListSource({
		key: ['user-search'],
		fetcher: searchUsers,
		prepareArgs: ({ pagination }) => ({
			body: {
				skip: pagination.pageIndex * pagination.pageSize,
				take: pagination.pageSize,
			},
		}),
		options: { select: (response) => response.records },
		getRows: (rows) => rows,
	}),
	invalidate: { replace: [{ queryKey: ['user-search', 'list'] }] },
})
```

`createInfiniteSource` takes the same separate collection/page preparation used by
the factory, and supports independently typed page responses and selected pages.
Neither helper needs generated hooks or a UI kit.

## Paged lists and totals

For a typed `getUsers({ offset, limit }, { signal })` returning
`Promise<{ items: User[]; total?: number }>`, a complete paged source is:

```ts
import { createGridSourceFactory } from '@ez-kit/qc-react/data-grid'

type User = { id: string; name: string }
type UsersPage = { items: User[]; total?: number }

const makeUsersSource = createGridSourceFactory({
  list: {
    prepareArgs: ({ pagination }) => ({
      offset: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
    }),
    getRows: (page: UsersPage) => page.items,
    getRowCount: (page) => page.total,
  },
})
const usersSource = makeUsersSource({ key: ['users'], getAll: getUsers })

// DataGrid is the result of withQuery(createDataGrid(...)).
<DataGrid dataSource={usersSource} columns={columns} pagination={{ pageSize: 20 }} />
```

The grid sends page state to the fetcher and does not paginate, filter or sort the
returned page a second time. Include those other axes in `prepareArgs` when the
API supports them (otherwise the server cannot apply them).

Omit `getRowCount`, or return `undefined`, when the total is unknown. Unknown totals
keep the current page even if it is empty and expose the grid's unknown page count
(`-1`); they do not reuse a previously known count. Return `0` only for a known empty
collection. A fresh successful total corrects an out-of-range page to the last
existing page (zero for an empty collection) and requests that page. Placeholder
totals and stale cached totals during refetch cannot trigger that correction.
This also handles deleting the final row of the final page after invalidation.

## Generated fetchers with Orval

See the [reproducible Orval example](examples/orval/README.md) for a pinned
generator, OpenAPI schema, generated fetch-only client, shared API convention,
entity source and component/hook entry paths. Regeneration and the example
are covered by package scripts and TypeScript checks.
