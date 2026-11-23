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
- `source.ts` binds the generated endpoints with `createDataGridSource`. The shared read
  supplies a typed offset or cursor in `prepareArgs` and forwards cancellation to Orval.
- `grid.tsx` shows the component and hook entry paths. Its ordinary list observes the same
  source with `useCollectionQuery`.

The Orval client places fields into URL parameters, paths and bodies. The source handles
collection configuration and mutation arguments. Read keys share a resource prefix, and a
successful operation refreshes the matching page and infinite families.

Mount the examples under `QueryClientProvider` with a UI kit. The host must implement the
OpenAPI routes at the same origin or adapt the shared transport to its API base URL.
