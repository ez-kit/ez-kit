---
'@ez-kit/docs': minor
---

Document drag and drop.

Drag was built surface by surface with no page at all: its examples sat in the manifest, reachable
only by URL and referenced from no `.mdx` — `verify-manifest-coverage.mjs` reported every one of
them, and it does not run in CI so nothing failed. There is now a **Drag and drop** page covering the
three surfaces, how each kit switches the adapter on, the boundaries a drag honours, the keyboard
path and its announcements, RTL, and what is not built yet. All six examples are on it: `row-drag`,
`virtualized-row-drag`, `column-drag`, `column-panel-drag`, `keyboard-sensors` and
`column-drag-rtl`.

The three ordering pages gain a pointer to it rather than a copy of it, since drag adds no option of
its own — it is the fourth affordance over `ordering`, the one that moves something several places in
a single gesture where the menus and `Alt+Arrow` move it one step.

Two corrections ride along. `production.mdx` still said "drag reordering … not built yet". And
`row-ordering.mdx`'s **What cannot move** list had been collapsed into one run-on paragraph, taking
three of its five bullets and an example with it.

Kit parity gains the two HeroUI drag limits: a header column does not drag while the column panel is
open, and `Escape` during a panel drag can change the order without reporting it through
`ordering.column.onChange` — the second is a defect, and an application persisting the order from
that callback should know about it.

The three examples that count commits now label the counter instead of rendering a bare `0` above
the grid, which read as a glitch once they were on a page.
