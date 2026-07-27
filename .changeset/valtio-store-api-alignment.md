---
'@ez-kit/valtio-kit': minor
---

Split the store surface into one read hook and one write hook: `useSnapshot()` reads,
`useContextStore()` writes. `useStore()` is **removed**.

**Breaking.** `useStore()` used to return the raw mutable Valtio proxy. It is gone — there is no
alias for `useSnapshot()`, so there is exactly one way to read and one way to write. The raw proxy
moved to the new `useContextStore()`, which is the write path / escape hatch and does not subscribe
the calling component.

```diff
- const state = store.useStore()
+ const state = store.useContextStore()
  state.count += 1
```

```diff
- const snap = store.useStore()
+ const snap = store.useSnapshot()
```

Reads that already used `useSnapshot()` are unaffected, and `Item`'s `{ snap, store }` render
argument keeps its meaning. Pre-1.0, so this ships as a `minor` bump.
