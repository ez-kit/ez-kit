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

## Documentation

https://ez-kit-docs.vercel.app/docs/query-react
