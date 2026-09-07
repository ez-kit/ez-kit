---
'@ez-kit/store-core': minor
'@ez-kit/va-store': minor
---

**Breaking:** the `plugins` option is removed from `createContextStore` and `CachedStoreOptions` (so
`createCachedStore` no longer takes it either). A capability is now attached to the store instance
itself, inside the factory, instead of passed as an array to the store options:

```tsx
// Before
createContextStore(() => proxy(new Filters()), { plugins: [persist()] })

// After
createContextStore(() => pipe(proxy(new Filters()), withPersist()))
```

`@ez-kit/store-core` exports the new seam: `attachCapability(target, plugin)` registers a
`StorePlugin` on the instance, under a non-enumerable, own-only property — invisible to
`Object.keys`, a spread, `JSON.stringify`, and prototype inheritance — and `capabilitiesOf(target)`
reads the list back, in **attachment order** (the innermost wrapper first). `createContextStore` and
`createCachedStore` run every attached plugin's `setup` in that order on mount and the returned
cleanups in reverse order on unmount, exactly as the old `plugins` option did. Attaching the same
capability name twice (`pipe(store, withHistory(), withHistory())`) now throws instead of silently
double-registering.

`@ez-kit/va-store`'s `persist()` plugin is replaced by `withPersist(options?)`, a factory-position
wrapper that mutates and returns the proxy it is applied to: `pipe(proxy({ … }), withPersist({ fields }))`.
It composes with the new `withHistory` capability in the same chain — `pipe(proxy({ … }), withHistory(), withPersist())`.
`persist()` itself still exists (it's what `withPersist` attaches under the hood) for anyone building
a capability chain of their own, but `withPersist` is the documented entry point.

See [Capabilities](https://ez-kit-docs.vercel.app/docs/va-store/capabilities) for the full shape and
how to write your own.
