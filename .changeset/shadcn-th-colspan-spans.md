---
'@ez-kit/data-grid-shadcn': patch
---

Make a grouped header (`columns[].columns`) span its children instead of sitting over the first
one.

The table renders as `display: block` with a `grid-template-columns` track list, so the HTML
`colspan` attribute is inert: it was set on the `<th>` and changed nothing. A two-group grid
measured 292px per group header — one track — so `Employment` sat over `Department` while `Joined`
and `Salary` had no group above them at all. A header row that mislabels the columns to its right
is worse than no group row.

`Th` is now a `blocks/core` wrapper that emits `grid-column: span N` when `colSpan > 1`, the
grid-layout spelling of the same intent, mirroring what `Td` already does for full-width body rows.
Auto-placement picks the start, so each group lands exactly over its leaves.

Grouped headers still throw in the heroui kit (see #218); this fixes the shadcn half.
