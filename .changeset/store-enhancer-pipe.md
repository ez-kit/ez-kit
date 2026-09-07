---
'@ez-kit/store-core': minor
'@ez-kit/va-store': minor
---

Add `pipe` and the `StoreEnhancer<In, Out>` type, and make every `with*` wrapper curried. A
capability chain is now written in attachment order instead of inside out:

```tsx
// Before
createContextStore(() => withPersist(withHistory(proxy({ q: '' }), { defaultPaused: true }), { fields }))

// After
createContextStore(() => pipe(proxy({ q: '' }), withHistory({ defaultPaused: true }), withPersist({ fields })))
```

`pipe(base, ...enhancers)` is `enhancers.reduce((target, enhance) => enhance(target), base)` with
overloads that carry the widened type through each step, so the chain's result type still names every
capability it picked up. Reading it top to bottom now matches the order the Provider replays each
capability's `setup` in, which is the order the persist + history recipe depends on.

`withHistory(target, options?)` and `withPersist(target, options?)` are therefore replaced by
`withHistory(options?)` and `withPersist(options?)`, which return the enhancer. Currying is what types
the options: the enhancer's state type comes from the value `pipe` feeds it, so
`withHistory({ shouldRecord: (prev, next) => prev.q !== next.q })` types both parameters as the store's
own state without an annotation. An enhancer applied outside `pipe` has nothing to infer from, so name
the state there: `withHistory<Filters>()(proxy({ q: '' }))`.

Both wrappers still mutate the proxy they are applied to and return the same identity, and nothing is
attached until the enhancer runs — a named enhancer (`const historic = withHistory<Filters>({ limit: 50 })`)
can seed several stores, each with its own stack.
