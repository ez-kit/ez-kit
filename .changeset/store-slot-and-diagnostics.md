---
'@ez-kit/store-persist': minor
'@ez-kit/store-core': minor
'@ez-kit/zu-store': minor
'@ez-kit/va-store': minor
---

Align the two store bindings ahead of 1.0, and give every package one message format.

`@ez-kit/zu-store` gains the `Store` slot `@ez-kit/va-store` already had — a write-only render prop
that hands over the raw store handle without subscribing, on both `createContextStore` and a
`createCachedStore` group. `Subscribe` now passes that handle to its children as a second argument
in both places, so a render prop that reads _and_ writes needs no hook beside it. Both are additive;
existing render props ignore the extra argument.

Two names are unified across the bindings, so the same concept is spelled the same way in both.
`@ez-kit/va-store`'s `Subscribe` render prop now takes its two arguments **positionally** —
`{(snap, store) => …}` instead of `{({ snap, store }) => …}` — matching `zu-store`'s
`{(state, store) => …}`, on both `createContextStore` and a `createCachedStore` group; the
`SubscribeRenderArg` / `CachedSubscribeRenderArg` types that existed only to name that object are
gone. And `@ez-kit/zu-store`'s `HistoryState<T>` is renamed **`StoreHistory<T>`**, the name
`va-store` already used for the same thing — the public `store.history` surface.

Every user-facing error and warning across the four packages now starts with its package tag —
`[zu-store]`, `[va-store]`, `[store-core]`, `[store-persist]` — with the tag held in one constant per
package instead of being spelled out at each call site. Two message texts changed as a result:
`zu-store`'s missing-Provider error now names the store, as `va-store`'s already did
(`[zu-store] Missing Provider for filters`), and the exported `MISSING_CACHE_PROVIDER` constant reads
`[zu-store] Missing <CacheProvider>` / `[va-store] Missing <CacheProvider>`. Match on the tag, not on
the sentence — the new **Stability** docs page says so explicitly, alongside which import paths
semver covers.

The `./persist/internals` subpath is **removed** from both bindings. It re-exported the engine's own
assembly primitives — the pieces a binding is built from — and binding a new state manager is not a
supported extension point yet, so it committed us to 22 engine-level names with no documented
consumer. Writing a **custom source adapter** is unaffected and stays fully public: implement
`SourcePort` and ship it as an `AmbientAdapter` or `RenderScopedAdapter`, with every type for it on
the binding's `persist` entry.

Also: `keywords`, `bugs` and `engines` on all four published packages, and an enforced 80% coverage
floor via a new `test:coverage` script.
