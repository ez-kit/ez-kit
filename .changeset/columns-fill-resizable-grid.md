---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

Fill the grid's width with the columns that name no width, resizable or not

A column's width now says one of two things. A starting width — `width: 60` or
`width: { default: 60 }` — is the width the column renders at, exactly. A column that names none
fills the grid's free width, sharing it equally with the other filling columns, from its `min` (or
150px without one) up to its `max`:

```ts
{ accessorKey: 'id', width: 60 }              // exactly 60
{ accessorKey: 'name', width: { min: 120 } } // fills, never narrower than 120
{ accessorKey: 'email' }                       // fills
```

Before, a starting width was a floor that every centre column grew past, and turning `resizing`
on fixed every column instead, leaving the right of the grid empty. Now:

- Filling works the same with `resizing` on or off. Pinned and system columns and columns with
  `resizing: false` keep their width exactly.
- A drag fixes every column at the width it renders at, so it moves the one column being dragged
  and no neighbour. A double-click on a border hands that column back — to the width it names, or
  to filling when it names none. A press on the handle that never drags changes nothing.
- A drag starts from the width the column renders at. Under a controlled `columnSizing` the first
  drag of a filling column still starts from 150px, because the measured width reaches the table
  only on the next render.
- `width: 10` now means 10px: a starting width below TanStack's 20px default `minSize` lowers the
  minimum to match, unless `min` is written.

**Migration.** A grid whose columns all name a width no longer stretches to its container. Take
`default` off the column that should absorb the free width — keeping the old value as its `min`
if it should not get narrower — and it fills again.
