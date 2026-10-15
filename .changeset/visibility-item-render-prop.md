---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

**`<DataGrid.VisibilityItem>` takes a render function, for a column panel whose rows a collection
renders.** A panel built on react-aria's `GridList` or `ListBox` cannot put a wrapper around a row,
because the collection renders the row element itself, so the only way to make its rows draggable
was to call `useSortableItem` directly and copy the item's internals. With a function child the
item renders nothing and hands back `itemProps` — the drag's ref, `data-slot`, `data-column-id` and,
while dragging, `data-column-dragging` — to spread onto the row, and `handleProps` for the grip,
which is `null` whenever the row cannot be dragged. Which rows take part, at which index and whether
a column is locked are still decided by the item. JSX children keep today's behaviour.

**`useColumnDragKeyboardGuard()`** (from the package root and `@ez-kit/data-grid-react/kit`) returns
a ref for such a collection. A keyboard drag uses the arrows and `Space`, which the collection also
acts on: without the guard one `ArrowDown` moved a row two places, and the `Space` that drops it
could toggle a column's visibility.

**A locked column is no longer marked as a drag activator.** The drag library's accessibility
plugin marked every registered item that has no grip — including a column declared
`ordering: false` — with `role`, `tabindex`, `aria-roledescription`, `aria-describedby`,
`aria-pressed`, `aria-grabbed` and `aria-disabled`. A locked header cell and a locked panel row
became a `button` and a tab stop for a drag that cannot happen. Both kits' drag adapters now give a
locked item an inert handle, so none of it reaches the page; its place in the order is unchanged.

**The HeroUI column panel is a `GridList`.** Its rows are grid rows whose selection is the column's
visibility, with the grip, the checkbox and the move pair inside the row, and no wrapper elements
around it. The panel is one tab stop: the arrows move between rows and `ArrowRight` steps into a
row's controls. The `column-visibility-item`, `column-drag-handle` and `column-visibility-move-*`
slots are unchanged; styles written against the previous dialog-of-checkboxes markup rather than
against those slots need updating. The plain Columns toggle stays a menu.
