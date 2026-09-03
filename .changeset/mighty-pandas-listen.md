---
'@ez-kit/zu-store': minor
---

Add a `shallow` prop to `Subscribe`, on both `createContextStore` and `createStoreCache` groups.

`Subscribe` read through `useSelector`, so its `selector` was always compared with `Object.is` and had no shallow counterpart — a selector that builds an object or array (`(s) => ({ a: s.a, b: s.b })`) threw `Maximum update depth exceeded` on mount, with `useShallowSelector` in a surrounding component the only way out. `shallow` makes `Subscribe` compare the selection shallowly, exactly as `useShallowSelector` does:

```tsx
<counterStore.Subscribe
	selector={(s) => ({ count: s.count, label: s.label })}
	shallow
>
	{({ count, label }) => <span>{`${String(count)} · ${label}`}</span>}
</counterStore.Subscribe>
```

The prop defaults to `false`, so existing `Subscribe` usage is unchanged. It selects one of two internal components — one reading through `useSelector`, one through `useShallowSelector` — so toggling it on a mounted `Subscribe` remounts the render-prop subtree. `shallow` describes the selector, which is written once per call site, so that is not a state a real tree passes through.
