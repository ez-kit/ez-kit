---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

**Breaking: the selection bar and the draft bar become one `<DataGrid.ActionBar />` with a live
section per concern.**

`DataGrid.SelectionBar` and `DataGrid.DraftBar` are removed. One slot replaces both:

```diff
-<DataGrid.DraftBar />
-<DataGrid.SelectionBar />
+<DataGrid.ActionBar />
```

They were documented as one bar with two contents and implemented as two components that each
drew a whole bar — its own sticky anchor, surface and shadow — kept apart by a `return null`
inside the selection one. That gate read `rowSelection` and nothing else, so a draft edit (a
sort, a column filter, a search term) never re-ran it: with rows selected, staging a sort
mounted **both** bars at the same sticky position, overlapping. A narrower subscription is not
the fix — two pieces of chrome pretending to be one bar can only agree while every gate hiding
one of them re-runs in lockstep with the other.

**Both sections are now live at once.** The selection used to stand down during a draft, on the
grounds that applying a query can drop the selected rows and leave a bulk action on a stale set.
That hazard is already handled a level down: the selection is valid against the _applied_ query,
which is what the user is looking at, and `table.draft.apply()` clears the row selection in the
same state change. So the bulk Delete stays enabled beside a pending draft and the count is
interactive, where it was a dead chip.

Renaming, for a custom bar:

| removed                                | write this instead                                                |
| -------------------------------------- | ----------------------------------------------------------------- |
| `<DataGrid.SelectionBar>{({ count })}` | `<DataGrid.ActionBar>{({ selection })}` → `selection.count`       |
| `<DataGrid.DraftBar>{({ pending })}`   | `<DataGrid.ActionBar>{({ draft })}` → `draft.pending`             |
| `SelectionBarProps` / `DraftBarProps`  | `ActionBarProps`                                                  |
| `DraftBarProps.selectedCount`          | `selection.count` — one count, owned by the section that shows it |

The render function receives `{ open, variant, selection, draft }`. **Both sections are optional
— guard on them**: `selection` is absent when selection is off, `bar: false`, or no selection
feature is registered; `draft` is absent when `draft` is off or the draft is clean. `open` stays
independent of either, so a bar that animates out still renders while it does.

For a UI kit, the component contract changes shape: `core.ActionBar` is required, and
`GridFeature.Selection` / `GridFeature.Draft` are gone — neither feature owns a kit component any
more, so the tier types `GridSelectionComponents` and `GridDraftComponents` go with them. A kit
written `satisfies FullGridComponents` gets a compile error rather than a runtime crash. The
heroui kit's `./selection` and `./draft` subpath exports are removed for the same reason.

Unchanged: `selection.bar` and everything under it, including `variant` — the config key never
moved, and it still says what the bar _looks_ like while the layout says where it goes.

The shadcn registry item served from this site loses one file: `components/ui/action-bar.tsx`, a
primitive nothing in that kit ever imported — not the old `SelectionBar`, not the `ActionBar` that
replaced it. Nothing breaks by its absence, and a project that already ran `npx shadcn add` keeps
its copy; re-running the command simply stops copying 644 lines of dead code, and stops declaring
the `action-bar-group` / `action-bar-item` slots that kit never renders. The HeroUI kit keeps its
own counterpart, which its bar genuinely uses.
