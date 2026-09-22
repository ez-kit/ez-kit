---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

The grid now renders a root element around everything it draws — toolbar, filter panel, chips,
table, bottom bar and the action bars — stamped `data-slot='grid-root'`.

Until now a grid was a run of siblings in its parent's flow, so a parent that lays its own children
out (`display: flex`, `grid`, a `gap`) laid out the grid's pieces instead of the grid. **This adds
one `div` to every grid's DOM**, which changes nothing for a block parent and is the fix for every
other one.

It comes with the two ways to reach it. `layout.classNames.root` classes it, joining across the
option layers like `wrapper` and `scroll` — which is where a card's frame around the bars belongs,
since it is the only box that encloses them. `core.Root` replaces the element, in the optional
tier beside `TableWrapper` / `TableScroll`, so a kit that registers nothing keeps the plain `div`.
