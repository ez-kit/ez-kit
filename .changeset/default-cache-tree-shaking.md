---
'@ez-kit/zu-store': patch
'@ez-kit/va-store': patch
---

Let the default store cache tree-shake out of bundles that do not use it.

`default-cache.ts` built its module-level instance with a bare `createStoreCache()` call and
destructured the five members off it. Both a top-level call and a top-level property read count as
possible side effects, so a bundler kept all of it — and with it `createCacheReact` and the whole
`store-core/cache` graph — in every bundle that imported anything from the package root. An app
importing only `createContextStore` paid ~2 KB gzipped for a cache it never mounted.

The call now carries `/* @__PURE__ */` and each member is read inside a `@__PURE__`-annotated IIFE,
which defers the read into a function body. Measured with esbuild (minified, gzipped, peers
external), a `createContextStore`-only entry drops from 3 640 B to 1 529 B for `zu-store` and from
3 466 B to 1 403 B for `va-store`; Rollup drops the cache graph too. Importing the full surface
costs the same as before, and no export changes name, type or behaviour.
