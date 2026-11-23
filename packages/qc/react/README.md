# @ez-kit/qc-react

Connect an existing ez-kit DataGrid bundle to TanStack Query.

```ts
import { createDataGridSource, withQuery } from '@ez-kit/qc-react/data-grid'

const source = createDataGridSource({
	key: ['users'],
	collection: {
		fetcher: fetchUsers,
		prepareArgs: ({ pageIndex, pageSize }) => ({ offset: pageIndex * pageSize, limit: pageSize }),
		getItems: (page) => page.items,
		getTotal: (page) => page.total,
	},
})
const { DataGrid, useDataGrid } = withQuery(gridBundle)
```

Render `<DataGrid dataSource={source} columns={columns} />` under your application's
`QueryClientProvider`. The source receives the grid's applied criteria and pagination. Include an
`infinite` block in the collection to allow that mode and use `input.pageParam` in `prepareArgs`.
Both modes use the same resource key and cache their results separately.

Configure `create`, `update`, `delete` or `deleteMany` on the source and enable the corresponding
grid feature. Mutation callbacks and invalidation use the shared collection layer. Existing native
query options can be supplied through `createCollectionSource` from `@ez-kit/query-react/collection`.

[Connection guide](https://ez-kit-docs.vercel.app/docs/qc-react)
