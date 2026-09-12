---
'@ez-kit/data-grid-react': minor
---

Rename `selection.bar.clear` to `onClear` and make it a notification. The bar now always resets the selection itself and then calls the handler, instead of handing the reset over to it — a handler that forgot to call `clearSelection()` silently broke the × button, and the distinction rested entirely on the option lacking an `on` prefix. `selectedRows` is still the set as it stood before the reset, which is the reason to reach for this over `selection.onChange`. To gate the clear itself, draw the bar with `<DataGrid.SelectionBar>` and its render args.
