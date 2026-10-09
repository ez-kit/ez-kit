---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Narrate a keyboard drag from the message catalogue instead of letting the drag library do it in English

The drag was already being announced, badly, and nobody asked for it. `@dnd-kit/dom`'s accessibility
plugin is in the default preset and neither kit opted out, so both have been writing a
`role="status" aria-live="polite"` region into `document.body` all along — with sentences built from
the only thing its callbacks receive, a record id: _"Picked up draggable item 7."_ A user reordering a
column heard the column's internal id, and heard it in English whatever the app's locale. So this is
not new output; it is taking ownership of output that was already there.

The sentences now come from `messages.ordering`, the group whose docblock had reserved itself for
exactly this. `draggable` is what a screen reader calls a handle in place of its role, `instructions`
is how to drive one from the keyboard, and eight keys — `rowPickedUp` / `rowMovedTo` / `rowDropped` /
`rowCancelled` and their `column*` counterparts — are the announcements. Each is a **whole sentence
from a named context**, never a stem the grid completes: word order differs between languages, and
"row 3" is itself a phrase, which is why the row and column forms are separate keys rather than one key
taking a name assembled above the catalogue.

They name what a user can follow. A column by its header text, or by its column id when the header is
a React element — stated rather than silently flattened, because turning arbitrary JSX into a string
means rendering it out of tree. A row by its place among the rows the body is rendering. Both count
from one, since the number is read aloud.

**A move is announced as the position you settle on.** The library coalesces its move announcements —
each arrow press records the latest sentence and the region is written once the keys go quiet for a
moment — so four quick taps of `ArrowDown` read as the fourth position rather than as all four. The
callback fires every time; the region does not. That is the right output rather than a gap, since a
region narrating each intermediate step of a key repeat would cut every sentence off with the next.
The pick-up, the drop and the cancellation are not coalesced.

**Announcements are the keyboard path's.** A pointer drag is already visible to whoever is making it,
and narrating every move of a mouse would talk over the gesture. A callback returning nothing is how
the grid says so.

The grid builds the sentences and the port carries them: `DndProviderProps` gains an optional
`announcements` bag, typed in the port's own event vocabulary, and each kit hands it to whatever its
library announces through. **Optional, and an existing custom adapter that ignores it still compiles
and still commits exactly what it did** — the cost of not forwarding it is paid in silence. A kit's
adapter learns nothing about tables, which is the whole reason the seam is in the port: resolving an id
to a heading or a position needs the table and the dictionary, and an adapter has neither.

Three things to know before upgrading.

**`ordering.instructions` is read once, at mount, and does not follow a later language change.** The
library builds that node from the string it was handed at construction and never rewrites it, so an app
that switches locale without a reload re-translates the handle's name and all eight announcements and
leaves the keyboard instructions in the language the page started in; remounting the grid picks the new
sentence up. **Localization** says so where the group is listed.

**The HeroUI kit does not get `aria-roledescription` on its handles.** React Aria's button forwards an
allow-list of ARIA attributes and that one is not on it, so there a reader says the library's English
`draggable` rather than the dictionary's value; the shadcn kit's does carry it. Forcing it would mean an
imperative `ref` write in a slot every button in that kit renders, which is out of proportion to one
attribute. Both halves are pinned by tests rather than asserted here, and the difference is in
**Kit parity**.

**The shadcn registry's drag item declares `@dnd-kit/dom` beside `@dnd-kit/react`.** The plugin
classes live only there — `@dnd-kit/react` re-exports the manager and the sensors and nothing else —
and pnpm's isolated layout cannot resolve a transitive dependency a package has not declared, so it
is named rather than inherited. It downloads nothing new, being already in every tree that has
`@dnd-kit/react`. The plain grid item carries neither name, and on the npm path both stay
**optional** peers.

The new keys are additive and `PartialGridMessages` types any subset, so an existing dictionary keeps
working; one that replaces `ordering` wholesale rather than per entry will want them. The grid's own
`grid.rowCount` region is untouched and remains the only thing the grid announces about its contents —
the drag's region is a sibling of it, created per grid, so several grids on a page never announce each
other's drags.

**A real screen reader was not run.** What is verified, in both kits, is that the right sentence
reaches a correctly shaped live region at the right moment. Whether it reads well through NVDA or
VoiceOver is untested, and the **Drag and drop** page says so rather than implying a check that did not
happen.
