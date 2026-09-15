---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

data-grid: offer column reordering from the Columns toggle

`ordering: { column: { visibilityMenu: true } }` turns the toolbar's Columns toggle into a column
panel: each row keeps its visibility checkbox and gains the same two one-step moves the header
menu offers. Opt-in and off by default — that control is a visibility control in every grid
written so far.

Turning it on widens the list to **every** non-system column, so that it reads as the column order
itself. A column locked with `visibility: false` is listed with its checkbox disabled; it can still
be moved, and nothing is offered that could hide it. A step in the panel lands on the row next to
it, hidden rows included, rather than passing over hidden columns the way the header's step does:
both are the same rule — a step moves a column past what the user can see — read from two
surfaces.

`canMoveColumn` and `moveColumn` take that as a new optional `ColumnMoveScope` argument, defaulting
to `'visible'`, so existing callers are unchanged. `VisibilityColumnItem` gains `canHide` and an
optional `ordering` pair, and `messages.visibility` gains `moveStart` / `moveEnd`.
