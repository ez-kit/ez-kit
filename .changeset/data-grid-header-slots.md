---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
'@ez-kit/data-grid-native': minor
---

Finish the composition ladder in the header, and stop interactive header content from sorting.

**`DataGrid.HeaderRow` and `DataGrid.HeaderCell`.** `DataGrid.Header` took `children` and nothing
else, so giving one column a header of its own meant replacing the whole header and
re-implementing sorting, the column menu, resizing, the inline and popover filters, pinning and
the selection column — for every column. The body got `Row` / `Cell` for exactly this; the header
now has the matching pair.

```tsx
<DataGrid.Header>
	{({ headerGroups }) =>
		headerGroups.map((group) => (
			<DataGrid.HeaderRow
				key={group.id}
				headerGroup={group}
			>
				{({ headers }) =>
					headers.map((header) =>
						header.column.id === 'status' ? (
							<DataGrid.HeaderCell
								key={header.id}
								header={header}
							>
								…
							</DataGrid.HeaderCell>
						) : (
							<DataGrid.HeaderCell
								key={header.id}
								header={header}
							/>
						),
					)
				}
			</DataGrid.HeaderRow>
		))
	}
</DataGrid.Header>
```

`HeaderCell`'s render function hands back the default header's own parts — `label`, `sortTrigger`,
`menu`, `filter`, `resizer` — so a custom cell keeps the ones it still wants instead of rebuilding
them, and can place its own controls outside the sort affordance. They arrive as nodes rather than
as four more exported components.

**A button in `column.header` no longer sorts the column too.** The column's header content sits
inside the sort affordance, because clicking a column's name to sort it is how every table works —
but that meant any button, link or input placed there fired the sort as well, since the click
bubbled straight into the handler. Clicks (and Enter/Space) originating on an interactive
descendant are now ignored by the sort handler. Clicking the name still sorts.

**Fixed in the HeroUI kit:** its `Thead` found the row-header column by walking the rendered JSX
for a `data-column-id` prop, so it depended on the exact element shape the shared layer happened
to produce. It now reads the first visible non-system column from the table model instead — the
same column, but one a component boundary cannot hide.
