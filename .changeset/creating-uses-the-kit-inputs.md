---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': patch
---

fix(data-grid): give a create form the same inputs an edit form gets

The shared `text`, `number` and `boolean` cell types registered `creating` with the very same
component as `editing`. Redundant on its own — a create form already resolves `creating ?? editing`
— but a UI kit spreads those base types and overrides only `editing`, so the inherited `creating`
kept winning in create mode. The three most common columns therefore rendered the DI primitives in
a draft row or create modal while the edit row rendered the kit's own field: on HeroUI a bare
`<input>` instead of `TextField`, a plain checkbox instead of the `Switch`. The slot is gone from
all three; kits register `editing` and both forms use it.

The HeroUI kit also stretches an input rendered directly into a cell — the fallback for a column
with no `cell.type`, in an editing cell or the creating row. Outside HeroUI's `TextField` an
`<input>` keeps its intrinsic ~180px width, which under-fills a wide column and, since cells do
not clip, spills over the neighbouring one.
