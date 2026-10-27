---
'@ez-kit/data-grid-core': patch
---

System columns no longer show a resize handle. With `resizing` on, the drag grip column
(`__drag__`), the expander (`__expand__`) and the row actions column (`__actions__`) each drew a
handle that let a user drag them wider. A system column takes its width from its
`SystemColumnDef.width` and has no `resizing` option of its own, so the handle offered something
the column was never meant to do. All four system columns are now built with
`enableResizing: false`, which also covers the selection column.
