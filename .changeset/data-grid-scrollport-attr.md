---
'@ez-kit/data-grid-react': minor
'@ez-kit/docs': patch
---

data-grid: one name for the element that scrolls — `data-scrollport`

Each kit builds its scrollport differently: shadcn scrolls the shared `table-scroll` div,
HeroUI its own nested `table-scroll-container`, a virtualized grid a third element again — and
the horizontal and vertical scrollports are not always the same element. Nothing named the
winner, so CSS, tests and consumers had to guess per kit, and the obvious guess is wrong:
shadcn's `table-container` reports overflowing metrics while its computed `overflow` is
`visible`, so it scrolls nothing.

The react layer already resolves both axes — for pin shadows and for infinite-scroll edge
detection — and now stamps what it resolved: `data-scrollport="x"`, `"y"`, or `"x y"` when one
element owns both. Select with `[data-scrollport~='x']`. Existing `data-slot` names are
unchanged.
