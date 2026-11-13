# @ez-kit/query-react

A declarative gate for [TanStack Query](https://tanstack.com/query) in React. `<Query>` calls
`useQuery` itself and renders your data once it is there, or a `loading`, `idle` or `error`
fallback until then. Only the gate subscribes to the query, so its parent and siblings do not
re-render when the query loads, refetches or fails.

Headless: no markup, no styles.

## Install

```bash
pnpm add @ez-kit/query-react @tanstack/react-query
```

`react` (≥ 18) and `@tanstack/react-query` (v5) are peer dependencies. The gate runs under your
own `QueryClientProvider`.

## The gate

```tsx
import { queryOptions } from '@tanstack/react-query'
import { Query } from '@ez-kit/query-react'

const deviceQueries = {
	list: () => queryOptions({ queryKey: ['devices'], queryFn: fetchDevices }),
}

function Devices() {
	return (
		<Query
			query={deviceQueries.list()}
			loading={<Spinner />}
			error={(error, q) => (
				<Retry
					message={error.message}
					onRetry={() => q.refetch()}
				/>
			)}
		>
			{(devices, q) => (
				<DeviceList
					devices={devices}
					refreshing={q.isFetching}
				/>
			)}
		</Query>
	)
}
```

- **`query`** — the options `useQuery` takes, usually from `queryOptions(...)`. `select` goes
  inside it. Every type is inferred from it.
- **`children(data, q)`** — rendered whenever the query has data, including during a background
  refetch, with placeholder data, and after a failed background refetch (the error is in
  `q.error`). `data` is never `undefined`; `q` is the `useQuery` result, unchanged.
- **`loading`** — the first load, while there is no data yet. Defaults to nothing.
- **`idle`** — the query is disabled (`enabled: false` or `skipToken`) and has no data. Defaults
  to nothing.
- **`error(error, q)`** — the query failed and has no data. Without a fallback the error is
  thrown, so the nearest error boundary catches it; resetting that boundary refetches the query.

## Shared fallbacks

```tsx
import { QueryProvider } from '@ez-kit/query-react'

const spinner = <Spinner />

<QueryProvider loading={spinner} error={(error) => <ErrorCard error={error} />}>
	<App />
</QueryProvider>
```

`QueryProvider` sets the defaults for every `<Query>` below it. A prop on `<Query>` overrides
it, a nested provider overrides the keys it sets and inherits the rest, and each fallback is
picked on its own. The provider is optional.

## Mutations

`Mutation` keeps a `useMutation` subscription next to its action. It takes native options and
passes the unchanged result to `children(m)` in every state; it adds no markup or fallbacks.

```tsx
import { Mutation } from '@ez-kit/query-react'

;<Mutation mutation={{ mutationFn: deleteDevice }}>
	{(m) => (
		<>
			<button
				disabled={m.isPending}
				onClick={() => m.mutate({ id: device.id })}
			>
				{m.isPending ? 'Deleting…' : 'Delete'}
			</button>
			{m.isError && <p role='alert'>{m.error.message}</p>}
		</>
	)}
</Mutation>
```

Types are inferred from `mutation`, including options from TanStack's `mutationOptions(...)`.
Use native callbacks for invalidation or optimistic updates. `mutateAsync`, `reset` and all other
result fields keep their native behavior. Errors stay in `m.error` unless native `throwOnError`
options or client defaults request an error boundary. `QueryProvider` does not affect mutations.

## Infinite queries

`InfiniteQuery` accepts `useInfiniteQuery` options, including options from
`infiniteQueryOptions(...)`, and uses the same `loading`, `idle` and `error` fallbacks as `Query`.
`QueryProvider` supplies shared fallbacks to both gates.

```tsx
import { InfiniteQuery } from '@ez-kit/query-react'

;<InfiniteQuery
	query={deviceQueries.infinite()}
	loading={<Spinner />}
>
	{(data, q) => (
		<>
			{data.pages.flatMap((page) => page.items.map((device) => <p key={device.id}>{device.name}</p>))}
			{q.isFetchNextPageError && <p role='alert'>{q.error.message}</p>}
			<button
				disabled={!q.hasNextPage || q.isFetching}
				onClick={() => void q.fetchNextPage()}
			>
				Load more
			</button>
		</>
	)}
</InfiniteQuery>
```

The data argument is never `undefined` and follows `select` if one is set. The native infinite
query result, including previous/next page methods, is passed unchanged. Loaded data stays on
screen while another page loads or fails. Use a distinct cache key from a regular query.

## Recipes

- [Mutation workflows](https://ez-kit-docs.vercel.app/docs/query-react/mutation-workflows): live
  invalidation, server field errors, optimistic updates and rollback examples.
- [SSR and prefetch](https://ez-kit-docs.vercel.app/docs/query-react/ssr-prefetch): request-scoped
  server clients, dehydration/hydration and warming the browser cache before navigation.

## Documentation

https://ez-kit-docs.vercel.app/docs/query-react

## Collection queries

Import `createCollectionSource`, `createCollectionSourceFactory` and `useCollectionQuery` from
`@ez-kit/query-react/collection` for ordinary CRUD lists or UI connectors. This entry has no
DataGrid dependency and uses the existing `QueryClientProvider`.

```tsx
const source = createCollectionSource({
	key: ['users'],
	getAll: {
		prepareArgs: (params: { search: string; offset: number; limit: number }) => params,
		fetcher: fetchUsers,
		getItems: (response) => response.items,
		getTotal: (response) => response.total,
	},
	update: {
		prepareArgs: (input: { id: string; name: string }) => ({
			path: { id: input.id },
			body: { name: input.name },
		}),
		fetcher: updateUser,
	},
})
const users = useCollectionQuery({ source, mode: 'pages', params })
await users.update.mutateAsync({ id: '42', name: 'Alice' })
```

Parameters are arbitrary and externally owned. Changing filters and resetting pagination should
be one state update in the owning component/store. The hook never changes params. It returns
`items`, optional `total`, the native active `query`, and native results for configured `create`,
`update`, `delete` and `deleteMany` operations. There is no `execute`, no implicit bulk loop and no
automatic optimistic update. Each operation has independent input, DTO, result and error types.

Fetcher mutation preparation runs inside `mutationFn`: lifecycle callbacks receive the original
input, `onMutate` runs first, and preparation failures/retries use the native mutation lifecycle.
Keep preparation pure because retry repeats it. `mutateAsync` returns the fetcher's result;
handle its rejection in application event handlers. Native option descriptors preserve their
original variables: reads use `query`/`getItems`/`getTotal`, mutations use `mutation`.

Sources require at least one read. Infinite-only sources define `getInfinite`, with collection
`prepareArgs`, `preparePageArgs({ args, pageParam })`, `initialPageParam`, `getNextPageParam` and
`getItems`. Use `mode: 'infinite'` and native `query.fetchNextPage()`/pagination flags. Loaded pages
project into items without replacing cache data; infinite total is undefined. Read fetchers
receive `{ signal }` separately from business arguments.

Generated sources key ordinary and infinite reads separately and invalidate both families on
successful mutations. Refresh is not awaited; user lifecycle promises are. `invalidate` supports
`false`, `additional` or `replace` at source and operation levels. Native keys are not rewritten;
native sources require explicit invalidation scope. The source's `queries.list` and
`queries.infinite` expose options for native prefetch/read consumers. Include tenant and other
response-affecting inputs in the base key or prepared arguments.

`createCollectionSourceFactory` shares list/infinite preparation and projections and mutation
preparation across entity sources. Bare fetchers inherit defaults; expanded descriptors override
them. Supplied options replace the options object. Explicit entity specialization in an
application factory is supported when generic inference needs it.

See the docs Collections page for a complete ItemGroup CRUD example and the qc-react connector
for adapting the same source to a DataGrid.

Fetcher mutations default `mutationKey` to `[...baseKey, operationName]`. Include tenant ownership
in the base key when switching between tenant-specific sources: a mutation already dispatched for
one tenant keeps that scope when the hook switches to a differently keyed source. Explicit mutation
keys override this default. Native mutation descriptors preserve supplied keys and TanStack's normal
observer behavior; changing callbacks under the same key does not create an isolated operation scope.
