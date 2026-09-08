---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Rename an action entry's `onSelect` to `onAction`, and let an entry bring its own markup.

`rowActions.actions` / `selection.bar.actions` entries (and the `GridMenuItem` model kits render) now carry `onAction`. The same entry is a button in the selection bar and a menu entry under row actions, where it is chosen with Enter, Space or typeahead and no click happens — and React already gives `onSelect` to the DOM text-selection event, which is why both kits' menus call the one they mean `onAction`.

`ActionItem` also gained a second form: `{ id, component }` hands the entry over whole. The described form stays the one to reach for — it is what buys the kit's glyph, danger colour, disabled state and menu semantics — but an entry that shape cannot express (a picker, a split button, a counter) is no longer forced out into the bar's `start` / `end` slots. In the selection bar `component` replaces the entry's button; in a row-actions menu, which is a collection, it fills a menu entry the kit still wraps so keyboard navigation keeps working.
