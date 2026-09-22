---
'@ez-kit/data-grid-react': minor
---

The header's sort affordance is a real `<button>`, and the shadcn kit's sort arrow is clickable
again.

`[data-slot='sort-trigger']` was a `role='button'` div with a hand-written `Enter` / `Space`
handler and a predicate that dropped any click originating on an interactive descendant. The
predicate existed so that a control a consumer put in `column.header` would not fire the sort as
well — but it could not tell such a control from the kit's **own** sort arrow, which shadcn
rendered as a `Button` (`tabIndex={-1}`, no handler: a button in looks only). So every click on
the arrow was discarded, and the arrow sits at the header's centre, which is where a pointer
lands. HeroUI, whose indicator was always a bare icon, was never affected.

The predicate is gone. The affordance is a `<button type='button'>` when the column sorts and a
plain box when it does not, the click handler is `getToggleSortingHandler()` and nothing else, and
shadcn's `SortIndicator` is a `<span>`. The structural stylesheet resets the UA's button styling on
the slot, so both kits' headers look unchanged.

`Enter` and `Space` are still handled explicitly, and that is not an oversight: HeroUI's `Th` is
React Aria's, and React Aria's grid keyboard manager calls `preventDefault()` on the bubbling
keydown — a cancelled keydown activates nothing, so a native button would never see the click.
The handler runs at the target, where the event still arrives intact, and calls `preventDefault`
itself so that a kit which does **not** cancel does not sort twice per keypress. What it no longer
does is ask where the event started.

**Interactive content in `column.header` is no longer supported.** It renders inside the button,
and a nested `<button>` is invalid HTML. A header that needs a control composes
`<DataGrid.HeaderCell>` and places it beside `sortTrigger` rather than inside it — see
[Column headers](https://ez-kit-docs.vercel.app/docs/data-grid/layout/composition#column-headers).

`Alt+Arrow` column and row reordering are untouched: those are keyboard chords on the `<th>` /
`<tr>`, not clicks on a control, so they still ask whether focus sits in a text field that owns
the chord — the narrow predicate that remains.
