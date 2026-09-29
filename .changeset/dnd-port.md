---
'@ez-kit/data-grid-react': minor
---

Add the drag-and-drop port: the `DndAdapter` contract a UI kit's adapter implements, the
`DragSpec` / `DragAxis` / `SortableItemHandle` / `DndDropEvent` vocabulary around it, a no-op
default, and `dnd` on `createDataGrid` — the only way a grid is given a drag implementation.

Nothing renders differently and no adapter ships yet. A grid whose bundle named no `dnd` produces
exactly the DOM it did before: `useDndEnabled()` is `false`, which is what a drag handle renders
behind, and `useSortableItem` hands back an inert handle. Each grid root publishes its own adapter
— or an explicit none — so a grid nested inside a drag-enabled one does not inherit it.

This package names no drag library and takes no new dependency; the mechanics arrive from a kit
subpath as an optional peer.

The port is not end-to-end yet: the grid root does not mount an adapter's `Provider` and nothing
calls `onDrop`, so an adapter written against this release has its hook called and its provider
ignored. The contract ships now so a kit's adapter can be written and typed against it.
