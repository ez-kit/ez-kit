---
'@ez-kit/data-grid-react': patch
'@ez-kit/data-grid-heroui': patch
---

Make the expanded sub-content panel reachable in both kits.

The panel row carried two defects that cancelled each other out of sight:

- It rendered `<Tr data-expanded='true'>` without passing `data-slot`, so the kit's own default
  won (`data-slot="table-row"` / `table-cell"` under shadcn) and the panel became the one row in
  the body that `[data-slot="tr"]` did not match.
- `data-expanded` is a name React Aria reserves on its rows and strips from whatever a kit passes,
  so under heroui the attribute never reached the DOM at all — and since **both** kits style the
  panel through `tr[data-expanded]`, the heroui panel has been rendering with none of its own
  styling: no block layout, no tinted background, no padding.

The panel now emits `data-slot="tr"` / `data-slot="td"` like every other row and cell in the body,
and is marked `data-expanded-row="true"`. Both stylesheets follow. This is the same trap that
turned `data-selected` into `data-row-selected`, and the new name follows the creating draft row's
`data-creating-row`.

**Breaking for anyone styling or querying `tr[data-expanded]`** — which, under heroui, was never
matching anything.
