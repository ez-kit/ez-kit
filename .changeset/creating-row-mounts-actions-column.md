---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

fix(data-grid): give an inline creating row somewhere to put its save / cancel

Those two buttons render in the `__actions__` column, which was mounted only for `editing`,
`deleting`, row `pinning` or custom row actions. A grid whose only row-level feature was `creating`
therefore opened a draft row that could never be committed — the flow worked solely alongside a
second feature that happened to bring the column with it.

Where the pair goes now depends on whether that column exists for its own reasons:

- It does (`editing` / `deleting` / row `pinning` / `rowActions.actions`) — the pair renders there,
  as before, and the column reserves the same width an inline editing row does.
- `creating.mode: 'pin-row'` — the column is mounted for it. The pinned draft row is permanent, so
  the cell always holds its save button.
- `creating.mode: 'row'` alone — **no** column. It would stand empty until someone pressed the
  create trigger, and mounting it on open would take its fixed width off the `1fr` tracks, jumping
  every column on each open and again on each close. The toolbar's create trigger becomes the
  Save / Cancel pair instead, which reflows nothing and sits right above the draft row.

`creating.mode: 'modal'` keeps its own dialog footer and mounts no column, as before — and its
create trigger stays a trigger, since swapping it would show a second Cancel / Save pair behind the
open dialog.

The draft row now also answers to **Enter** (commit) and **Escape** (abandon), the pair a cell edit
already took — so the buttons are never the only way to finish the row. A pinned draft row ignores
Escape: it has no closed state to return to.
