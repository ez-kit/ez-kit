---
'@ez-kit/data-grid-core': patch
---

Fix `ColumnDef.footer`'s JSDoc: it is not part of the default layout, but you do not read it
yourself either — `<DataGrid.Footer />` renders it inside a custom `<DataGrid.Table>` body,
handling colSpan, pinning, alignment and `footerClassName`. Also corrects `ColumnDef.align`'s
reference to the RTL option, which is `resizing.direction`, not `sizing.direction`.
