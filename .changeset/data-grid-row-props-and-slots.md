---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Let a grid style and compose individual rows and cells. Purely additive.

**`rowProps`** resolves DOM props per row and forwards them to the kit's `Tr`:

```tsx
useDataGrid({
	data,
	columns,
	rowProps: (row) => (row.original.status === 'failed' ? { className: 'bg-red-50' } : undefined),
})
```

"Highlight the failed rows" — the most ordinary request a table gets — had no route through the
API. Replacing the kit's `Tr` reaches every row and knows nothing about the data; a
`<DataGrid.Body>` render function reaches the data but gives up pinned rows, expanded panels, the
creating row, the fallback states, the infinite footer and the refetch overlay along with the
default body. Structural attributes (`data-slot`, `data-row-id`, `data-depth`, `data-pinned`,
`data-virtual`) are applied after the consumer's and win; `className` and `style` are merged.

**Column class names** — `headerClassName`, `cellClassName`, `footerClassName` on `ColumnDef`.
`cellClassName` also takes a per-cell function, so it can key off the value or the row:

```ts
{ accessorKey: 'balance', cellClassName: ({ value }) => (Number(value) < 0 ? 'text-red-600' : undefined) }
```

Three names rather than one `className`, because a single field would have to mean "header and
cells alike" — right-alignment wants both, a value-driven highlight only the cells.

**`<DataGrid.Row>` and `<DataGrid.Cell>` take children**, as `ReactNode` or a render function
(`{ row, cells }` and `{ cell, row, value }`). The composition ladder stopped at
`<DataGrid.Body>`: overriding anything below it meant rebuilding the row and cell shells by hand,
losing the pinning offsets, the structural attributes and the column classes the stylesheet
targets. Both slots keep their shell and replace only the content.

New exported types: `RowPropsResolver`, `LayoutConfig`, `DataGridRowRenderArgs`,
`DataGridCellRenderArgs`.
