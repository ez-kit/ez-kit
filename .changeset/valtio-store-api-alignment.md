---
'@ez-kit/valtio-kit': minor
---

Align the store API with `@ez-kit/zu-store`: `useStore()` is now the **reactive read**.

**Breaking.** `useStore()` no longer returns the raw mutable Valtio proxy — it returns the
readonly, auto-tracked `Snapshot<TState>` (an alias of `useSnapshot()`, options included).
The raw proxy moved to the new `useContextStore()`, which is the write path / escape hatch and
does not subscribe the calling component.

```diff
- const state = store.useStore()
+ const state = store.useContextStore()
  state.count += 1
```

Reads that already used `useSnapshot()` are unaffected, and `Item`'s `{ snap, store }` render
argument keeps its meaning. Pre-1.0, so this ships as a `minor` bump.
