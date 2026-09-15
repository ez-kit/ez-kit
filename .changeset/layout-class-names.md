---
'@ez-kit/data-grid-react': minor
---

feat: `layout.classNames` for the grid shell's two boxes

The wrapper and the scrollport are the only elements this package renders itself, and until now
the only way to class them was a stylesheet rule on their `data-slot` — which a kit can write (the
shadcn kit frames the grid exactly that way), but which necessarily applies to every grid at once.
`layout.classNames.wrapper` / `layout.classNames.scroll` add the per-grid channel: a kit states its
frame once through `createDataGrid({ defaults })`, and a single grid adds to it from the call site.

Classes **accumulate** across layers rather than replace, which is the one option that behaves that
way — a kit frame and an app addition are both wanted, and neither layer can restate what it did
not write. Nothing de-conflicts them; this package knows nothing about Tailwind, so a consumer that
needs `border-0` to beat `border` runs its own value through `cn()` first.

Class only: positioning, overflow and the height custom properties stay in
`@ez-kit/data-grid-react/styles.css`, and the look stays with the kit.
