---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-heroui': minor
---

Row drag and drop — the first drag affordance, end to end.

A row now registers itself with the drag adapter bound through `createDataGrid({ dnd })`, and the
grid mounts that adapter's provider and commits a drop through the ordering API. One gesture
produces exactly one change; the neighbours part by transform while the drag is in flight and no
order is written until release.

The handle is reachable two ways, and both are the same handle on the same row. Inside a column's
own cell renderer:

```tsx
{ id: 'drag', cell: { component: () => <DataGrid.RowDragHandle /> } }
```

or ready-made from the row's render arguments, beside `content` and the new `isDragging`:

```tsx
<DataGrid.Row row={row}>
	{({ dragHandle, content }) => (
		<>
			<td>{dragHandle}</td>
			{content}
		</>
	)}
</DataGrid.Row>
```

The dragged row carries `data-row-dragging`. The name is namespaced deliberately: React Aria's row
supports dragging natively and owns the plain `data-dragging`, overwriting anything passed to it.

A row that cannot be dragged — no adapter bound, row ordering off, a group row — renders no handle
at all rather than one that does nothing. A grid with no adapter renders exactly the DOM it did
before.

`@ez-kit/data-grid-core` gains one message key, `ordering.dragRow`, for the handle's accessible
name. `@ez-kit/data-grid-heroui` gains `RowDragHandle`, the shared control wearing the kit's grip.

A row's drag index is its position in the rows the body **renders** — the pinned top band, the
centre, then the pinned bottom band — rather than TanStack's `row.index`, which counts a row among
its _parent's_ children and so coincides with a rendered position only on page one of a flat,
unfiltered grid. That is why dragging works on page two, under a column filter and with tree rows:
the drag library requires each index space to be exactly `0..n-1` with no gap and no duplicate, and
bails out of the whole space otherwise — silently, the handle working and the pointer moving while
nothing displaces and nothing commits. Reading the rendered rows is also what keeps a row pinned
under `keepPinnedRows` draggable after a page change or a filter has taken it out of the row model.
A **virtualized** body is the one case this derivation cannot serve, and declares its own list
instead — see the note on dragging a row in a virtualized grid.
