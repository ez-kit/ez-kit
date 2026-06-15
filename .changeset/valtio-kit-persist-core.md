---
'@ez-kit/valtio-kit': minor
---

Add a source-agnostic **persist** core (Valtio is the source of truth, the substrate is a mirror) and re-express URL search-params sync as an adapter on top of it. Replaces the previous `@ez-kit/valtio-kit/search-params` surface.

- Source-agnostic engine speaking a single `Keyed = Map<string, string>` interchange: codecs run inside the core, so any adapter only ever sees pre-stringified values. The engine never imports React, `URLSearchParams`, or a storage API.
- `SourcePort` (`get` / `set` / optional `subscribe`) is the one extension seam every adapter satisfies — synchronous (URL, storage) or async (`Promise`-returning) substrates.
- Decorator + accessor fronts: base `persistField({ source, key?, parser?, meta? })`; `persistUrl()` / `urlField()` are thin URL wrappers. A field may carry one annotation per source (one binding/engine each).
- Request-scoped, SSR-correct store factories: `createPersistStore(factory)` (decorator discovery) and `createPersistFields(factory, fields)` (accessor builder), seeded synchronously from the substrate.
- `PersistProvider adapters` mounts a render-scoped source adapter; router adapters `reactRouterAdapter` / `nextAdapter` ship via `@ez-kit/valtio-kit/persist/url/react-router` and `.../persist/url/next`.
- Key naming (`key` / `absolute` / `prefix`) moved onto the descriptor/core; the URL port is stateless and preserves foreign params.
- Codecs unchanged (`paramString`, `paramNumber`, `paramBoolean`, `paramBigInt`, `paramDate`, `paramEnum`, `paramArray`, `paramJson`); `zodParam` via `@ez-kit/valtio-kit/persist/validators/zod`.

**BREAKING (unreleased):** the `@ez-kit/valtio-kit/search-params` subpath, the `layout` strategy objects (`flat`/`json`/`nested`), and the `qs` encoder/peer are removed. `react-router`, `next`, and `zod` remain optional peers.

New entrypoints: `@ez-kit/valtio-kit/persist`, `/persist/url`, `/persist/url/react-router`, `/persist/url/next`, `/persist/validators/zod`.
