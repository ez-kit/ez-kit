---
'@ez-kit/data-grid-heroui': minor
---

Add `@ez-kit/data-grid-heroui/dnd`, exporting `adapter` — the kit's drag-and-drop adapter, built on
`@dnd-kit/react`. Pass it to `createDataGrid({ dnd: adapter })` to give a composed grid drag
mechanics.

`@dnd-kit/react` is an **optional** peer: a consumer who never imports the subpath installs nothing
new, and nothing the kit root exports reaches the drag library — the root's bundle size is
unchanged, and a test asserts both halves rather than assuming them.

Nothing renders differently yet. The grid does not mount the adapter's provider and no drop is
committed until the drag surfaces land, so an adapter passed today is carried and not yet driven.
