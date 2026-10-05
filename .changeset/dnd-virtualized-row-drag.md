---
'@ez-kit/data-grid-react': minor
---

A row can now be dragged in a **virtualized** grid.

The row axis was the one surface a windowed body shut out: it rendered a slice while every rendered
row registered its position in the _whole_ row model, so the zeroth sortable of a window starting at
row 5 claimed index `5`. The library behind the adapter requires each group's space to be exactly
`0..n-1` and returns on the first frame otherwise — silently. The handle worked, the pointer moved,
nothing displaced and nothing committed.

A virtualized body now **declares** the rows it renders, and a row takes its drag index from that
declaration rather than deriving one from the table. Everything else — the built-in non-virtual body,
a hand-written one — keeps the derivation, which is what it renders.

The second defect only appeared once the first was fixed, and it failed invisibly. The dragged row
unmounted as soon as the window scrolled past it, putting a hole in the space it had just left; from
then on the element under the pointer was the drag library's own clone rather than the grid's row, so
the gesture looked alive while the drop landed the row at the **top** of the grid. (It resolved the
source to `-1` and clamped it to zero — the shape of the contract at the time, recorded as the
history of this fix: a drop now names the item it landed on by id, and the port carries no index at
all.) The row now records itself as the active drag and the body builds
its list as the window _plus_ the held row, so holding a row keeps both its registration and the
space's density.

The row virtualizer is also keyed by row id rather than by window position. A commit rewrites the
order underneath it, and a positional key would hand one row's measured height and element to
whichever row later took its slot.

No new option, on the grid or on the drag port: a virtualized grid drags with the same handle in the
same column as any other. There is a **Virtualized row drag** example on the drag and drop page.

One limit ships with it, stated here so that it is not read as a regression later. In a virtualized
body a drag of exactly **one** place commits only while the release lands in the upper part of the
target row; lower down, the drag library displaces the neighbour and un-displaces it again, so the
rows are physically back where they started and the grid correctly reports no move — silently, since
there is nothing to report. Aiming higher, or dragging more than one row, commits at every position,
and a non-virtual body is unaffected throughout. The lost displacement is `@dnd-kit/dom`'s own; both
local workarounds were measured and neither changes the outcome, so this waits on upstream.
