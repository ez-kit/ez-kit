---
'@ez-kit/va-store': minor
---

Add `withHistory` and `useHistory` — an undo/redo/goto capability for any Valtio proxy, built on the
same manager-agnostic `@ez-kit/store-core/history` engine `@ez-kit/zu-store`'s `withHistory` uses:

```tsx
import { createContextStore, useHistory, withHistory } from '@ez-kit/va-store'
import { proxy } from 'valtio'

const store = createContextStore(() => withHistory(proxy({ count: 0 })))

function Toolbar() {
	const { undo, redo, canUndo, canRedo } = useHistory(store.useStore())
	// …
}
```

`withHistory` composes with `withPersist` by nesting — `withPersist(withHistory(proxy({ … })))` — as
capabilities attached to the same proxy (see the `@ez-kit/store-core`/`@ez-kit/va-store` capability
changeset in this release). `store.history` is enumerable and `ref()`-wrapped, so `snapshot()` exposes
the same live object rather than a deep-cloned copy, and its `toJSON()` returns `undefined` so it never
reaches `JSON.stringify(store)`.

Calling `withHistory` flips on Valtio's `unstable_enableOp` globally for the process (needed for
`shouldRecord` and `sync: true`'s per-operation granularity) — harmless for `subscribe()` callers that
ignore their `ops` argument, but process-wide once any store calls it.

See [History](https://ez-kit-docs.vercel.app/docs/va-store/history) for the full option table, the
honest cost of using history (deep clone on record; `ref`/class-typed values don't time-travel), and
the `defaultPaused` + `useHydrated` recipe for combining it with `withPersist`.
