---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

**Breaking.** Split the pagination footer's presentation into the three axes it always had.
`pagination.variant` is gone, and with it the exported `PaginationVariant`. It conflated two
independent decisions — which controls render and what the label says — into one three-value
enum whose members named neither: `numbered` meant page links, `compact` meant edge jumps (the
_most_ controls, under a name promising the fewest), and `simple` meant nothing at all. The
fourth combination, page links **with** edge jumps, was unreachable, and the label form could
not be chosen at all: it was derived from the variant.

The footer is now configured by what it actually renders:

| was                   | now                                            |
| --------------------- | ---------------------------------------------- |
| `variant: 'numbered'` | the default — nothing to write                 |
| `variant: 'simple'`   | `{ links: false }`                             |
| `variant: 'compact'`  | `{ links: false, edges: true, label: 'page' }` |

- `pagination.links` (default `true`) — a link per page beside prev/next, windowed by
  `siblings` / `boundaries` as before, and still dropped when the page count is unknown.
- `pagination.edges` (default `false`) — jump-to-first / jump-to-last buttons.
- `pagination.label` now also takes the two built-in forms by name: `'range'` (the default,
  `1–10 of 50`) and `'page'` (`Page 2 of 5`), beside the `false` and renderer forms it already
  accepted. `'range'` still falls back to the page counter when the grid cannot be trusted to
  know the total — that rule is now a property of the label alone, not of a variant.

`PaginationProps` follows: kits receive `links` / `edges` instead of `variant`, and both mark
their footer with `data-links` / `data-edges` rather than `data-variant`. `buildPaginationLabel`
takes the form as its first argument (`buildPaginationLabel('range', model)`), and the model it
and a `pagination.label` renderer receive — now exported as `PaginationLabelModel`, replacing
`PaginationLabelInput` — no longer carries `variant`: a renderer decides its own wording.

Also in this change, from the work that preceded it: the label is resolved once in
`<DataGrid.Pagination>` and handed to kits as `PaginationProps.label`, so a kit deriving its own
label can no longer ignore `pagination.label`; both kits lay the footer out the same way (label
at the leading edge, page controls at the trailing one), and in heroui the label moved into the
`Pagination.Summary` slot meant for it.
