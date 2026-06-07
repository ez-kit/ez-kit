# @ez-kit/zu-store

## 0.4.0

### Minor Changes

- 6bd6980: Add `createStoreCache` — an in-memory store cache that keeps `createContextStore`-style stores alive across `Provider` unmount/remount. Entries are keyed by `(path, name, id)`: the `path` is inherited from `<cache.Scope path={[...]}>` (nested scopes concatenate; a `path` prop on the `Provider` extends it), so reusable components stay collision-free across mount locations.

  Returns `{ Provider, Scope, useCache, defineStore }`. Each `defineStore(factory)` group exposes a keyed `Provider` (`id` + optional `path` / `defaultProps` / `gcTime` / `alwaysCache`), the usual read hooks (`useStore` / `useShallowStore` / `useContextStore` / `Item`), plus imperative `fromCache({ path?, id })`, reactive passive `useFromCache({ path?, id }, selector)`, and `remove({ path?, id })` — reads address the absolute path. The `Provider`'s `defaultProps` is required at the type level when `TDefaultProps` has required fields.

  `useCache()` exposes `keys(prefix?)` (flat `CacheRecord[]` snapshot) plus reactive `useKeys(prefix?)` and `useTree(prefix?)` hooks that re-render only on membership changes (not on internal entry-state changes), and `clear(prefix?)` for cross-group subtree eviction with a single atomic publish notification regardless of subtree size. A standalone pure `toTree(records)` utility renders any coordinate list as a nested object view.

  Reference-counted GC with lazy sweep, client-only/SSR-safe, dev-mode warnings on duplicate `defineStore` names and concurrent `cache.Provider` mounts, fully typed (no `unknown` casts in public hooks). `createContextStore` is left unchanged.

- Add createStoreCache utility

## 0.3.0

### Minor Changes

- Move zustand to peerDependencies and document installing it alongside @ez-kit/zu-store.

## 0.2.1

### Patch Changes

- add git to package.json

## 0.2.0

### Minor Changes

- New useStoreState hook, withHistory middleware

## 0.1.1

### Patch Changes

- Add MIT license metadata to all package manifests.

## 0.1.0

### Minor Changes

- 48c129e: Create createContextStore util for zustand
