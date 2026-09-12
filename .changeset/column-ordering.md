---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Column reordering: `ordering`.

```tsx
<DataGrid
	data={data}
	columns={columns}
	ordering
/>
```

Grouped per axis like `pinning`, because reordering rows is a different feature over a different
slice: `ordering.column` is the one that exists today, and `ordering: true` means "every axis this
grid supports". A row axis could only ever arrive with a handler of its own — the grid does not own
the data — so a grid written today cannot silently gain row dragging in a later minor.

The header menu grows a _Move left_ / _Move right_ pair, always listed and disabled at the ends so
the menu does not rearrange itself under the pointer, and `Alt+ArrowLeft` / `Alt+ArrowRight` move
the focused column without reopening it (shadcn kit for now — HeroUI's React Aria collection
replaces the handler the grid puts on the column header).

A step swaps the column with its **visible** neighbour, so a hidden column keeps its place and
comes back to it. Moves stay inside the pin band and inside the header group: crossing a band would
read as a pin, and leaving a group would split its parent header. System columns and
`ordering: false` columns do not move and cannot be stepped over. `onChange` reports the complete
order — a partial `columnOrder` reads to TanStack as "these first, then the rest as declared".

`columnOrder` joins the persisted view state, beside `columnVisibility` and `columnPinning`.

Also fixed, and the reason the feature is worth having at all: the header, the body and the table
shell never subscribed to `columnOrder`, so a programmatic `setColumnOrder` changed the state and
repainted nothing.
