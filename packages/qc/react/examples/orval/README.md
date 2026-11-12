# Orval fetchers → Query → DataGrid

This repository example uses **Orval 8.47.0**, `client: 'fetch'`, and a local
OpenAPI 3.0.3 schema. Generated TypeScript is checked in; no hooks are generated.
Orval runs only during generation and is not a dependency of `@ez-kit/qc-react`.

From the repository root, after installing workspace dependencies:

```sh
pnpm --filter @ez-kit/qc-react example:generate
pnpm --filter @ez-kit/qc-react example:check
pnpm --filter @ez-kit/qc-react typecheck
pnpm --filter @ez-kit/qc-react test
```

The script downloads the pinned generator through `npm exec` (network access is
needed on the first run), then formats its output with the workspace Prettier.
`example:check` regenerates and fails if the checked-in client differs; it leaves
the new output available for review. Do not edit `generated/users.ts` manually.
The generated client is excluded from style linting but included in TypeScript
checks. The handwritten adapter, transport and component examples are linted.

## Responsibility boundaries

- `openapi.json`: endpoint paths, query parameters, request bodies and responses.
- `orval.config.ts`: fetch-only generation with a shared transport mutator.
- `transport.ts`: fetch execution, non-2xx rejection and empty 204 responses.
  JSON/text error payloads remain available for application error mapping.
  Generated response types are not runtime validation.
- `convention.ts`: reusable offset/limit, search and sort convention plus cursor
  preparation and response projection. Call `makeSource<Row>()` once per entity.
- `source.ts`: generated endpoint functions bound to the convention; specific
  create/update preparation stays here because editable fields are entity-specific.
- `grid.tsx`: component and hook entry paths under `QueryClientProvider`.

The API in this example accepts global search and sorting. Column filtering is
not enabled; an API supporting column filters needs that serialization added to
its convention and schema. The example's response envelopes are API conventions,
not a required qc-react format.

## Connect the generated functions

```ts
const usersSource = makeSource<User>()({
	key: ['users'],
	getAll: (args, { signal }) => getUsers(args, { signal }),
	getInfinite: (args, { signal }) => getUsersFeed(args, { signal }),
	delete: deleteUser,
	deleteMany: deleteUsers,
})
```

The read wrapper forwards TanStack Query's `AbortSignal` as fetch options. It is
not part of the cache key or business DTO. Mutations do not receive a modal's
cancellation signal, so closing a pending form does not abort persistence.

`prepareArgs` produces the argument expected by the fetcher, irrespective of its
HTTP destination. For update, the entity source creates `{ id, body }`, then a
small wrapper calls Orval's positional `updateUser(id, body)`. Orval places `id`
in the URL and serializes the body. Bulk deletion calls one generated endpoint
with `{ ids }`; it does not fall back to separate delete requests.

For infinite reads, `prepareArgs` produces collection criteria; `preparePageArgs`
adds the current cursor. Both modes share `['users']` as the base key and use
separate list/infinite cache families. Successful source mutations invalidate
both families by default. The generated client has no cache of its own.

## Both grid entry paths

`grid.tsx` builds `withQuery(createDataGrid(...))` with the shadcn kit. In an
application import `withQuery` and `createGridSourceFactory` from
`@ez-kit/qc-react/data-grid`; the example uses relative source imports so checks
exercise the current implementation without requiring a previous package build.

The component entry passes `dataSource={usersSource}` directly to `DataGrid` and
explicitly enables editing, creating and deletion. The hook entry passes the
same source to the connected `useDataGrid`, enables infinite pagination and
renders `<DataGrid table={table} />`. The table is connected once. Replace the
kit's `allComponents`/`cellTypes` imports with HeroUI to use that kit.

Mount `<Example />` for paged CRUD or `<Example entry="hook" />` for infinite
reads with editing. Include the selected kit's normal styles. This is an
integration recipe, not a standalone server: the host must implement the schema
at same-origin `/users` routes or adapt the shared transport to its API base URL,
authentication and response validation. IDs in this schema are URL-safe IDs.

`test/orval.test.ts` exercises the actual generated functions through a mocked
HTTP boundary, including query encoding, cursor pagination, Query signals,
path/body placement, bulk deletion, 204 responses and HTTP failures.
