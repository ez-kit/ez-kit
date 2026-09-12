---
'@ez-kit/docs': patch
---

docs: browser specs for pagination

`e2e/packages/data-grid/pagination/` — the footer's three display axes (`links`, `edges`,
`label`) and the page-size selector's two placements, written once and run against both kits.
Every press reads the rows back, so a control that renders but moves nothing fails.
