---
'@ez-kit/zu-store': minor
'@ez-kit/valtio-kit': minor
---

**BREAKING:** `createContextStore` is now seeded through a single `defaultValue` envelope instead of spread init props.

- The factory receives `{ defaultValue }` (type it with the new exported `ContextStoreInit<T>` helper) instead of a flat init object.
- The `Provider` takes one `defaultValue` prop (required when the seed has required fields, optional otherwise) instead of loose props.

  ```diff
  - const counter = createContextStore((initProps: CounterInit) => …)
  + const counter = createContextStore(({ defaultValue }: ContextStoreInit<CounterInit>) => …)

  - <counter.Provider count={3} label="x">
  + <counter.Provider defaultValue={{ count: 3, label: 'x' }}>
  ```

**`@ez-kit/valtio-kit` only — BREAKING:** the `Item` render-prop child now receives `{ snap, store }` (read via `snap`, write via the raw `store` proxy) instead of just `snap`.

```diff
- <counter.Item>{(snap) => <span>{snap.count}</span>}</counter.Item>
+ <counter.Item>{({ snap, store }) => <span>{snap.count}</span>}</counter.Item>
```

**`@ez-kit/zu-store` `createCachedStore` (store-cache) — BREAKING:** the Provider's `defaultProps` prop and `TDefaultProps` generic are renamed to `defaultValue` / `TDefaultValue`, and the factory now receives the same `{ defaultValue }` envelope, matching `createContextStore`.

```diff
- createCachedStore((defaultProps: { filter?: string }) => …, { name: 'users' })
+ createCachedStore(({ defaultValue }: ContextStoreInit<{ filter?: string }>) => …, { name: 'users' })

- <usersTable.Provider id="users" defaultProps={{ filter: 'active' }} />
+ <usersTable.Provider id="users" defaultValue={{ filter: 'active' }} />
```
