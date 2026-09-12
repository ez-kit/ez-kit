---
'@ez-kit/data-grid-react': patch
'@ez-kit/data-grid-heroui': patch
---

data-grid: auto-mount the filter panel under `filtering.variant: 'panel'`

`variant: 'panel'` was the one variant that did nothing on its own. It takes every
filter control out of the header, and the default layout mounted no panel — so a
grid that asked for the panel and did not hand-compose its children had no filter
UI at all, silently. The other filtering surfaces (the chips strip, the Clear-all
button) already auto-mount from their own config; this one now does too, between
the toolbar and the table.

Children remain the escape hatch for placing the panel elsewhere, and
`<DataGrid.FilterPanel />` still renders nothing when the grid has no filtered row
model or no filterable column.
