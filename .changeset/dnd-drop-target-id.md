---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

A completed drop names the item it landed on by **id**. `DndDropEvent` carries `targetId: string`
where it carried `targetIndex: number`, and nothing on the drag port is a position any more.

An index is only meaningful while the list it counts in holds still, and a virtualized body's does
not. There the index space is the rendered window, and a drag's own auto-scroll changes it mid-gesture
— rows unmount, rows mount, and every survivor is renumbered — so the same number denotes a different
row from one frame to the next. Instrumented on a 10 000-row grid, dragging one row far down with the
library's auto-scroll: across three runs the index the drop carried was 3–4 higher than the row the
pointer was actually over, because the library's space had grown by however many rows had scrolled
past, and the grid committed a row three or four places beyond the one released on. The id was right
in all three runs, and the drift is unbounded in the length of the scroll rather than off by a fixed
amount.

The grid therefore resolves nothing: both ends of a drop go straight to `dropRow` / `dropColumn`,
which take ids and resolve them against the table's own model. The rendered-row list a row registers
its index in now has exactly one reader, the registration side, so there is no second reader for it to
fall out of step with. The step that stood between a drop and those calls — turning the landing
index back into the row at that place — is gone with the index it served.

The id cannot simply be read off the drag library at release, and an adapter is where that is dealt
with. A sortable displaces its neighbours optimistically while the drag is in flight, and
`@dnd-kit/dom`'s `OptimisticSortingPlugin` finishes every displacement by setting the operation's drop
target to the **source** — so after anything has moved, the library reports the dragged item as its own
target. Each kit's adapter instead remembers the last target the pointer was over that the grid
allowed, which it already computes on every frame to answer `canDrop`, and reports that.

"Did the item move at all" is answered by an id too. An adapter records the source's **neighbour** when
the drag starts — the item before it, or the item after it when the source is first, plus which of the
two it is — and compares that with the neighbour it has at release: same neighbour, no move, no commit.
This replaced comparing the sortable's current index with its index at pickup, which was unsound for
the same reason the landing index was. Those two numbers are measured against different lists once a
window has scrolled: one is frozen at drag start, while React rewrites the other from the current
window on every frame, with no guard for a drag in flight. It silently refused real drops — dragging
the first visible row far down, or the last one far up, lands it back at the position it started from
while the row has moved hundreds of places. The neighbour's id does not coincide that way.

Writing an adapter against this is less work than against the old contract, not more: the drag library
hands over the ids, where a landing index had to be derived and then matched against a list the
adapter could not see. Nothing released carried the index form; the port and both kits' adapters are
unreleased, so no consumer has an adapter to update.
