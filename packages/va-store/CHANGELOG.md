# @ez-kit/va-store

## 0.2.0

### Minor Changes

- c73fef9: Re-export `shallowEqual` and the `ControlledConfig` / `ControlledFieldConfig` types from both store packages.

  They are declared in `@ez-kit/store-core`, which is an ordinary dependency of these packages rather than a peer, so
  under pnpm's strict `node_modules` layout a consumer who installed only `@ez-kit/zu-store` (or `@ez-kit/va-store`)
  could not import them. That blocked the recommended fix for a controlled field whose value gets a fresh reference every
  render — `controlled: { users: { equals: shallowEqual } }` — and left the public `controlled` option with a type the
  consumer could not name. Both are now importable straight from the store package:

  ```ts
  import { createContextStore, shallowEqual } from '@ez-kit/zu-store'
  import type { ControlledConfig } from '@ez-kit/zu-store'
  ```

  Additive — `@ez-kit/store-core` keeps exporting them under the same names.

- c73fef9: Add controlled `value` support alongside `defaultValue`. `Provider` now accepts an optional `value` (a `Partial<TState>` slice owned by the parent) and `onValueChange` (the callback fed by the store's own writes), so a store field can be mirrored to and from external state instead of only being seeded once. Both are additive — no breaking changes.

  `defaultValue` still seeds the store once on creation; `value` then wins for the keys it lists, applied synchronously so the first frame is already correct (no seed flash, and SSR-safe since it does not rely on an effect). Later prop changes sync into the store via `useLayoutEffect`, compared key by key — `Object.is` by default, or a custom `equals` when declared — never by the `value` object's own reference. Only the keys that actually changed are written, through a custom `set` when declared or a direct write otherwise. A field written locally without a matching `onValueChange` intentionally drifts from `value` until the next prop change — mirror mode, not `<input value>`-style enforcement. `onValueChange` emits only the keys present in the current `value`, and never re-emits a change the Provider itself just applied from a prop sync (anti-echo).

  New in `@ez-kit/store-core`: `ControlledConfig`/`ControlledFieldConfig` (the per-key `equals`/`set` override type), `shallowEqual` (a ready-made `equals` for values that get a fresh reference every render, e.g. `value={{ users: transform(dto) }}`), `getChangedControlledEntries`, and `pickControlledKeys`.

  `createContextStore` (`@ez-kit/zu-store`) and `createStore`/`createContextStore` (`@ez-kit/va-store`) both take a new `controlled` option — a map of per-key `{ equals?, set? }` overrides — with identical prop and option names across the two packages.

### Patch Changes

- 8c384e1: Packaging hygiene across the three store packages.
  - Ship a `LICENSE` file with each package. Only the data-grid packages carried one; these three published without it.
  - Replace the placeholder `description` ("A reusable utility package for ez-kit.") on `@ez-kit/zu-store` and `@ez-kit/store-core` — it was what the npm page showed.
  - Add a README to `@ez-kit/store-core`, which published with an empty page.
  - Tighten the `size-limit` budgets, which were set so loosely they could not fail. The root entries allowed 50 kB against real sizes of 3.4 kB (zu-store) and 4.6 kB (va-store); every entry is now budgeted at roughly its actual size plus 40%, so a doubling gets caught while ordinary edits do not trip CI.

  **Breaking (`@ez-kit/store-core`):** the `@ez-kit/store-core/persist` subpath is removed. It exported a single reserved type (`InstanceAdapter`) with no runtime behind it, was referenced nowhere, and only served to publish an empty contract. It will come back when the persist core actually moves into store-core.

- 127139c: Mark the React entrypoints as client modules so the packages can be imported from a Next.js App Router server component.

  Every entry that touches React now ships a `'use client'` directive: `@ez-kit/zu-store`, `@ez-kit/va-store`, `@ez-kit/va-store/persist`, `@ez-kit/va-store/persist/url/react-router` and `@ez-kit/store-core/cache`. Without it, importing any of them from a server component failed with `createContext is not a function`.

  Entries that contain no React are deliberately left unmarked, so they stay usable on the server: `@ez-kit/store-core`, `@ez-kit/va-store/persist/internals`, `@ez-kit/va-store/persist/storage`, `@ez-kit/va-store/persist/url` and `@ez-kit/va-store/persist/validators/zod`.

  **Breaking (`@ez-kit/store-core`):** `ServicesProvider` and `useServices` moved from the package root to the new `@ez-kit/store-core/react` subpath. The root entry mixed a React provider with pure helpers (`serializeStoreId`, `serviceKey`, `createServiceRegistry`), so marking it as a client module would have made those helpers unusable in server code. Update imports:

  ```diff
  -import { createServiceRegistry, ServicesProvider } from '@ez-kit/store-core'
  +import { createServiceRegistry } from '@ez-kit/store-core'
  +import { ServicesProvider } from '@ez-kit/store-core/react'
  ```

  Consumers of `@ez-kit/va-store` are unaffected — `StoreProvider` and the persist plugin resolve the services registry internally.

- e93fa7d: `useStoreState`: memoise the setter. It was rebuilt on every render, so it invalidated any effect that listed it as a dependency and re-rendered memoised children it was passed to. It is now wrapped in `useCallback([store, key])`, and the update patches the single key directly (Zustand merges shallowly) instead of spreading the previous state.

  `createStore`: name the store in the missing-Provider error. A store created as `createStore(factory, { name: 'filters' })` reported `Missing Provider for createContextStore`, which points at the wrong factory and gives no hint which store is unprovided. The message now uses the store's own name — `Missing Provider for filters`. Stores created through `createContextStore` are unaffected (the message stays `Missing Provider for createContextStore`); a `createStore` call with no `name` now reports the default, `Missing Provider for store`.

- Updated dependencies [c73fef9]
- Updated dependencies [8c384e1]
- Updated dependencies [127139c]
  - @ez-kit/store-core@0.3.0

## 0.1.0

### Minor Changes

- a7fbfac: Initial release of `@ez-kit/va-store` — a Valtio-backed React context store, sibling to
  `@ez-kit/zu-store`.
  - `createContextStore(factory)` returns `{ Provider, useSnapshot, useContextStore, Item }`:
    `useSnapshot()` is the readonly auto-tracked read path, `useContextStore()` is the raw mutable
    proxy (mutate directly, e.g. `state.count++`) and does not subscribe the calling component. Both
    are seeded through a single `defaultValue` envelope (`ContextStoreInit<T>`), and `Item` receives
    `{ snap, store }`.
  - `createStore(factory, { plugins })` is the plugin-capable base factory; `createStoreCache` /
    `createCachedStore` add a keyed instance cache in which a hit returns the same live proxy, so
    in-progress mutations survive unmount/remount within `gcTime`.
  - `StoreProvider({ persist?, cache? })` is the app-level composition root.
  - The `persist` subsystem (`@ez-kit/va-store/persist`) is a source-agnostic two-way sync engine —
    the proxy is the synchronous source of truth, the substrate a throttled, rehydratable mirror.
    Adapters ship behind peer-gated subpaths: `/persist/url` (+ `/url/react-router`, `/url/next`),
    `/persist/storage` (`localStorage` / `sessionStorage` / IndexedDB with cross-tab sync and
    `version`/`migrate`), and `/persist/validators/zod`.

### Patch Changes

- Updated dependencies [96231cd]
  - @ez-kit/store-core@0.2.1
