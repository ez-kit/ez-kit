---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Add row reordering. `ordering: { row: true }` puts Move up / Move down in a row's action menu and answers `Alt+ArrowUp` / `Alt+ArrowDown`; the grid keeps the order and renders it. Supply `ordering: { row: { onChange } }` to own the order yourself — the grid then stores nothing and reports one `RowMove` per step. A bare `ordering: true` still means columns only.
