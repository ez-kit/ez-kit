---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

**Breaking:** `size` / `minSize` / `maxSize` on a column collapse into one `width`.

Three fields for one property of a column, and all three named in TanStack's vocabulary rather
than the grid's — they were the last raw pass-throughs left on a public column def. `width` says
what it is, in the same scalar-or-object shape `align` and `pinning` use:

```ts
{ accessorKey: 'name', width: 200 }                              // was size: 200
{ accessorKey: 'name', width: { default: 200, min: 80, max: 400 } }  // was size/minSize/maxSize
```

Whether the user may _change_ a width stays `resizing: false`, deliberately not a field inside
`width`: it belongs in the row of per-column feature switches next to `sorting`, `filtering` and
`visibility`, and moving it would make column resizing the one feature spelled somewhere else.

Migration: `size: n` → `width: n`; a column carrying bounds → `width: { default, min, max }`.
