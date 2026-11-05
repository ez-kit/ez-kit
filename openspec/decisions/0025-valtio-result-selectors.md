# 0025. Valtio selectors compare snapshot results

- Status: Accepted
- Recorded: 2026-11-05

## Decision

`@ez-kit/va-store` offers standalone `useSelector(proxy, selector, options?)` and the same hook bound to context and cached stores. Selectors read readonly snapshots and compare results with `Object.is`, overridable through `isEqual`. `Subscribe` accepts `selector` and `isEqual`, passing `(selected, rawProxy)` to children; without a selector it retains Valtio's automatic property tracking. `Store` and `useStore` remain subscription-free write surfaces.

## Context, rationale and rejected alternatives

Automatic property tracking cannot suppress a render when an accessed property changes but its derived result stays equal: a count changing from 1 to 2 still means `count > 0`. Explicit result selectors cover this case without changing existing snapshot readers.

The subscription uses `subscribe` and `useSyncExternalStore`, following [Valtio discussion 587](https://github.com/pmndrs/valtio/discussions/587). Reading immutable snapshots lets a selected nested object reflect mutations through a changed reference. Returning the live proxy could hide those mutations under `Object.is`. Per-snapshot result caching permits selectors that allocate objects or arrays; custom equality preserves equivalent results across snapshots and inline selector changes. Each selector's cache is isolated from interrupted renders, and the subscription callback stays stable for the lifetime of its proxy. No derived store or mandatory `useCallback` is needed.

`packages/va-store/src/use-selector/use-selector.test.tsx` covers the shared hook, both store bindings, result equality, prop/proxy changes, server rendering, and switching `Subscribe` between selected and auto-tracked reads.
