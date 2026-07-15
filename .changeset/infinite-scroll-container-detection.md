---
'@ez-kit/data-grid-react': minor
---

Fix infinite scroll's auto trigger in collection-rendering UI kits (HeroUI), and detect the
bottom edge by measuring the scroll container instead of observing a sentinel row.

The loader footer rendered a raw `<tr>` sentinel into `Tbody`. HeroUI renders `Tbody` as a
React Aria collection, which keeps only its own `Row` children and builds them in a pass
before the real DOM exists — so the collection dropped the whole footer, and the sentinel's
ref resolved to a collection node rather than an element. `IntersectionObserver.observe()`
threw and took the grid down with it; in `manual` mode the same drop silently removed the
"Load more" button. Detection now measures the scroll container, which this package owns, so
it no longer depends on how a kit renders rows. Infinite scroll also resolves that container
directly rather than through `resolveScrollElement()`, which finds the first _horizontal_
scroller (HeroUI's inner `ScrollContainer` — it grows with its content and never scrolls
vertically, so it read as "already at the bottom" forever and broke reset-to-top).

Two breaking changes:

- The `data-slot="load-more-sentinel"` element is gone. Remove any styling or queries that
  target it; `data-slot="load-more-row"` is unchanged.
- Auto detection now requires a container that actually scrolls vertically — give the grid a
  bounded height via `stickyHeader` or `--dg-table-max-height`. When the rows never overflow
  there is no edge to reach and nothing auto-loads; use `trigger: 'manual'` for that case.
