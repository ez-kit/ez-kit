---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Mount custom renderers instead of calling them.

`flexRender` invoked a renderer as `Comp(props)`. This package reimplements it because it depends
on `@tanstack/table-core` alone, and the reimplementation dropped the one thing that matters:
`@tanstack/react-table`'s own `flexRender` does `createElement(Comp, props)` and recognises the
exotic wrappers via `$$typeof`.

Calling a renderer gives it no fiber of its own, so its hooks land on the caller's. In
`renderFilterInput` the branch taken depends on the selected operator, so switching operators
reordered the hooks of whatever the previous branch had rendered and crashed the caller. It also
meant `memo(...)` and `forwardRef(...)` — objects, not functions — were rejected outright, no cell
could sit under its own error boundary, and none could be memoised.

Every renderer is now mounted: `cell.component`, `filtering.component`, `editing.component`,
`creating.component`, and all four registry slots (`view` / `edit` / `creating` / `filter`). They
may use hooks, be wrapped in `memo` / `forwardRef` / `lazy`, and appear in React DevTools.

`CellTypeDefinition`'s four slots are typed `ComponentType<Props>` rather than
`(props) => ReactNode`, so the exotic wrappers pass the type check as well as the runtime one.
Every plain function component still fits.

One thing to know: a renderer's identity is now its component type, so a renderer rebuilt on every
render remounts on every render — visible as a lost input focus. Column definitions already had to
be stable for TanStack's sake; this makes an unstable one show up instead of merely wasting work.
Build them with `createColumns` outside the component, or memoise them.
