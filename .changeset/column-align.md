---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

Columns can say how they are aligned.

Until now they could not. A right-aligned numeric column meant `headerClassName: 'text-right'`
plus `cellClassName: 'text-right'` — the same intent spelled twice, in kit-specific Tailwind, on
every such column. `align` says it once:

```ts
{ accessorKey: 'total', align: 'end' }                          // header, cells and footer
{ accessorKey: 'total', align: { cell: 'end', header: 'start' } }  // the exception
```

`'start'` / `'center'` / `'end'`, not `'left'` / `'right'`: this axis flips with the text
direction, and the grid already treats RTL as first-class (`sizing.direction`). Column _pinning_
keeps `'left'` / `'right'` — a pinned column sticks to a viewport edge, which does not flip.

The React layer emits `data-align` on the header, body and footer cells, and the shared structural
stylesheet turns it into alignment. Kits inherit it without writing any CSS, and the react package
keeps its no-visual-styling rule: alignment is layout, and it must look the same in both kits.
