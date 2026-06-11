---
'@ez-kit/valtio-kit': minor
---

Add URL search-params synchronization (Valtio is the source of truth, the URL is a mirror), declared by class field decorators or a typed accessor builder over a path-based, identity-preserving engine.

- `@searchParam()` — Stage 3 field decorator; bind a class proxy with `withSearchParams(proxy(new Store()))`. Composition and inheritance are auto-discovered; nested paths and prototype-chained fields come along.
- `withSearchParamsFields(proxy, (field) => [field((s) => s.a.b, parser?), …], options?)` — accessor front for plain proxies (no decorator transpilation required).
- Path-based engine: fields are addressed by path and only the leaf is assigned on a URL pull, preserving nested-proxy/class-instance identity and computed getters.
- Auto-resolved parsers from runtime values (`string`/`number`/`boolean`/`bigint`/`Date`/array); everything else requires an explicit parser. Bind-time validation fails fast on unreachable paths, getter-only leaves, and parsers on class-instance nodes.
- Parser contract `Param<T>` with `stringify`/`parse` (+ optional `equals`). Built-ins: `paramString`, `paramNumber`, `paramBoolean`, `paramBigInt`, `paramDate`, `paramEnum`, `paramArray`, `paramJson`; `zodParam` via `@ez-kit/valtio-kit/search-params/validators/zod`.
- Key placement: joined-path keys by default, `{ key }` to rename the leaf, `{ absolute }` to pin a top-level key.
- Layouts: `flat()` (default) and `json(key)` in core; `qs()` via `@ez-kit/valtio-kit/search-params/encoders/qs`.
- `createSearchParamsStore(factory, config)` — request-scoped, SSR-correct store (decorator discovery or accessor `fields` builder), seeded synchronously from the request URL.
- `StoreSearchParamsProvider` — single app-level coordinator; router adapters `reactRouterAdapter` / `nextAdapter` via `@ez-kit/valtio-kit/search-params/routers/*`.

Requires Stage 3 decorators (`experimentalDecorators` off) and `Symbol.metadata` when using `@searchParam`. `react-router`, `next`, `zod`, and `qs` remain optional peers. No changes to `createContextStore`.
