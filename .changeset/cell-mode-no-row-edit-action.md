---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

fix(data-grid): stop `editing.mode: 'cell'` from drawing a row-edit affordance

The row actions column offered its Edit pencil in cell mode, where it called the row flow and
opened no cell at all — the only visible effect was the column swapping itself for a Save /
Cancel pair that committed a form nobody filled in. Cell mode now adds neither: with nothing
else switched on, the actions column no longer appears.

The keyboard replaces them, since a cell edit has no buttons of its own: the opened cell takes the
focus, **Enter** commits it and **Escape** abandons it. Previously blur was the only way out, and
blur commits, so a mis-typed value could not be abandoned at all.

Leaving the cell is now what commits, and it is read from the pointer and from focus landing
elsewhere rather than from the input's `blur`. React-aria's grid moves focus from the input to the
cell on pointer-down, so a blur fired _inside_ the cell before a press completed: a boolean column's
switch committed and closed without ever toggling.
