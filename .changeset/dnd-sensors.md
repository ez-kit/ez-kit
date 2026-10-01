---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Name the drag sensors instead of inheriting them, and stop `Alt+Arrow` moving a held item twice

A keyboard drag has worked since the pointer drag did — `@dnd-kit/dom`'s default preset already
mounted a keyboard sensor, so the gesture was there and undocumented. What changes is that both
sensors are now named and passed explicitly: listing them at all is opting out of that preset, so the
keyboard path no longer rests on an upstream default a minor release is free to move. Nothing about
the keyboard sensor is configured; omitting it from the array would have deleted it, which is the one
hazard in this block and is what the kits' unit tests now assert against.

The keys are the library's, verified against its frozen defaults and now documented: focus the handle,
`Space` or `Enter` to pick up, the arrows to move, `Space` or `Enter` to drop, `Escape` to cancel.
`Tab` ends the drag and **commits** at the position the arrows reached — the library's documented
behaviour, deliberately not overridden. Activation is handle-only in both paths, because the library
compares the event target to the handle, which is what structurally keeps a pick-up away from the sort
trigger and the selection checkbox beside it.

Two behaviour changes come with the explicit sensors.

**A mouse drag from a handle now needs a small movement before it starts.** Upstream left the mouse
entirely unconstrained when the target is the handle — no distance and no delay — and since the
activator here is always a handle, that branch covered every mouse drag this grid has ever started: a
plain click that twitched a pixel was a drag. The mouse now takes the same distance the library
applies to every pointer it does constrain, and still no delay. Touch keeps its press-and-hold delay
and tolerance verbatim, as does the pen branch. Every threshold is a named constant in each kit's
`dnd.tsx` rather than a figure retuned here.

**A fix:** `Alt+Arrow` used to move a row — or a column — **twice** per press while that same item was
being dragged with the keyboard, once through the grid's own reorder shortcut and once through the
drag. Both handlers now stand down for the item being held, and a different row's `Alt+Arrow` still
works meanwhile.

Nothing is removed and no option is added. Two kit differences are documented rather than fixed, both
React Aria's: `Alt+Arrow` row reordering does not reach the HeroUI kit ([#223](https://github.com/ez-kit/ez-kit/issues/223)),
and on `Tab` mid-drag the shadcn kit keeps focus on the handle while HeroUI's focus leaves the table.
A drag in flight is still not announced to a screen reader; the **Drag and drop** page says so beside
the new keyboard section.
