---
'@ez-kit/valtio-kit': minor
---

Add URL search-params synchronization (model B: Valtio is the source of truth, the URL is a mirror).

- `proxyWithSearchParams(initial, options)` — module-global, client-first store with an attached `$searchParams` control (`push`/`replace`).
- `createSearchParamsStore(factory, options)` — request-scoped, SSR-correct store that fuses `createContextStore` with the sync engine and seeds synchronously from the request URL.
- `StoreSearchParamsProvider` — single app-level coordinator and the only writer to the URL (coalesces all stores into one navigation, preserves foreign params).
- Param codecs: `paramString`, `paramNumber`, `paramBoolean`, `paramEnum`, `paramArray`, `paramJson`.
- Layouts: `flat()` and `json(key)` in core; `qs()` via `@ez-kit/valtio-kit/search-params/encoders/qs`.
- Router adapters: `reactRouterAdapter` and `nextAdapter` via `@ez-kit/valtio-kit/search-params/routers/*`.
- Zod validation: `zodParam` via `@ez-kit/valtio-kit/search-params/validators/zod`.

New subpath exports under `@ez-kit/valtio-kit/search-params/*`; `react-router`, `next`, `zod`, and `qs` are optional peer dependencies. No breaking changes to `createContextStore`.
