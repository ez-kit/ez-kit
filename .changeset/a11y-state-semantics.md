---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': patch
---

Tell the accessibility tree what the grid's state is

Layer B of the #227 audit. The grid sorted, selected, expanded and paged without saying so:
`aria-sort`, `aria-selected`, `aria-expanded`, `aria-rowcount`, `aria-rowindex`, `aria-busy` and
live regions were absent from **both** kits, which made it a hole in the shared react layer rather than a shadcn gap. A screen
reader was told a paginated or virtualized grid holds exactly the rows in the DOM, a sort or a
selection changed nothing it could hear, and a tree row's open state was carried by the chevron's
label alone.

All of it is written by `@ez-kit/data-grid-react`, for the reason `aria-label` on the table is:
a reader's account of a sort or a row total is a property of the grid, not of how one kit draws it.
Both kits gained the lot at once, and so does any kit built on the contract.

- **`aria-sort`** on a header cell that can sort. An unsortable column gets no attribute rather
  than `'none'`, which means "sortable, not sorted" and would otherwise announce every grid as
  sortable.
- **`aria-selected`** on a row that can be selected, gated on `enableRowSelection` so a grid with
  no selection stays quiet. **`aria-multiselectable`** on the table — only where the package owns
  `role="grid"`, since it is not an allowed attribute on `role="table"` and a React Aria kit
  answers for its own collection.
- **`aria-expanded`** on a row that can expand — a tree parent, or a row with a sub-content
  panel. It belongs on the row rather than on the chevron: a reader arriving at the row is told it
  can be opened before finding the control that opens it, and a kit that draws no chevron still
  announces the state. The chevron keeps its own label, which is not redundant — the button says
  what activating it _does_, the row says what it currently _is_. A row that never opens gets no
  attribute rather than `false`, for the reason `aria-sort` is not written as `'none'`.
- **`aria-rowcount` / `aria-rowindex`**, and only when the DOM holds less than the whole row set:
  ARIA is explicit that a complete table needs neither. A manual grid given neither `rowCount` nor
  `pageCount` reports `-1`, ARIA's own sentinel, rather than a number invented from the page.
- **`aria-busy`** while pending or refetching. This costs `DataGridTable` a subscription it did not
  have, so a refetch now re-renders the table element twice per request — the attribute belongs on
  the table and nothing below it can put it there.
- **One live region**: a polite `role="status"` reporting how many rows the current query matches,
  from the new `messages.grid.rowCount` key. Deliberately the only announcement — a region that
  narrated sorting and pagination as well would talk over the control still being operated.

The heroui kit needed one addition of its own, and it is not a workaround for a mistake here:
React Aria builds its DOM props with `filterDOMProps`, which keeps only `aria-label`,
`aria-labelledby`, `aria-describedby` and `aria-details` of the aria family, so every attribute
above was discarded before the element existed. A `ref` is no way round it either — `Column` and
`Row` are collection elements, rendered once to build the collection and again as DOM, and a ref
handed to one never reaches the node (measured: the table's does, theirs do not). The values now
travel as `data-aria-*`, which React Aria forwards, and one `MutationObserver` on the `<table>`
copies them onto the real attributes.

The new message key is additive; `PartialGridMessages` types any subset, so an existing dictionary
keeps working, and a dictionary that replaces `grid` wholesale will want it.
`aria-state.test.tsx` covers what the shared layer writes, and
`apps/docs/e2e/packages/data-grid/a11y/state-semantics.spec.ts` covers what survives each kit —
which axe cannot, since it checks that an attribute is _allowed_, never that it is _there_. A new
`accessibility.mdx` documents the lot.
