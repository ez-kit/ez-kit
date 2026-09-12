---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': patch
'@ez-kit/docs': patch
---

data-grid: a selected row says so, and the selection bar has one name

**`data-row-selected="true"` on a selected row.** Nothing marked selection on the `<tr>`, so a
selected row was indistinguishable from any other in the DOM — and invisible on screen: the
shadcn primitive's `data-[state=selected]:bg-muted` had no attribute to match, so picking a row
changed nothing but the checkbox. Both kits' stylesheets now paint `[data-row-selected='true']`,
pinned cells included.

The row derives the flag through `row.getIsSelected()` (a parent counts as selected through its
children) behind a boolean selector, so only the row whose selectedness flipped re-renders —
the body still does not subscribe to `rowSelection`.

The name avoids `data-selected` deliberately: React Aria's `Row` writes that attribute itself,
as a literal after spreading incoming props, from a selection manager the grid does not drive —
so anything passed down is erased in any RAC-based kit, heroui included.

**`data-slot="selection-bar"` in both kits.** heroui's floating variant delegated to its generic
`ActionBar` and came out as `data-slot="action-bar"`, while shadcn — and heroui's own inline
variant — emitted `selection-bar`. The floating bar now carries the same name, with
`data-state="open"` telling whether it is up (shadcn keeps it mounted and faded; heroui
unmounts it). The inner `action-bar-*` parts keep their names.
