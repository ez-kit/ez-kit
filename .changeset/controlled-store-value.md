---
'@ez-kit/store-core': minor
'@ez-kit/zu-store': minor
'@ez-kit/va-store': minor
---

Add controlled `value` support alongside `defaultValue`. `Provider` now accepts an optional `value` (a `Partial<TState>` slice owned by the parent) and `onValueChange` (the callback fed by the store's own writes), so a store field can be mirrored to and from external state instead of only being seeded once. Both are additive — no breaking changes.

`defaultValue` still seeds the store once on creation; `value` then wins for the keys it lists, applied synchronously so the first frame is already correct (no seed flash, and SSR-safe since it does not rely on an effect). Later prop changes sync into the store via `useLayoutEffect`, compared key by key — `Object.is` by default, or a custom `equals` when declared — never by the `value` object's own reference. Only the keys that actually changed are written, through a custom `set` when declared or a direct write otherwise. A field written locally without a matching `onValueChange` intentionally drifts from `value` until the next prop change — mirror mode, not `<input value>`-style enforcement. `onValueChange` emits only the keys present in the current `value`, and never re-emits a change the Provider itself just applied from a prop sync (anti-echo).

New in `@ez-kit/store-core`: `ControlledConfig`/`ControlledFieldConfig` (the per-key `equals`/`set` override type), `shallowEqual` (a ready-made `equals` for values that get a fresh reference every render, e.g. `value={{ users: transform(dto) }}`), `getChangedControlledEntries`, and `pickControlledKeys`.

`createContextStore` (`@ez-kit/zu-store`) and `createStore`/`createContextStore` (`@ez-kit/va-store`) both take a new `controlled` option — a map of per-key `{ equals?, set? }` overrides — with identical prop and option names across the two packages.
