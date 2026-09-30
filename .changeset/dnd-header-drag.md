---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-heroui': minor
---

Column drag and drop — a column moves by its header handle.

The column axis' twin of row dragging, over the same `columnOrder` the column menu and `Alt+Arrow`
already write. A leaf header cell registers itself with the adapter bound through
`createDataGrid({ dnd })`, and the grid commits a drop through the core drop helper — one gesture,
one change, with the neighbours parting by transform and nothing written until release.

The handle is reachable two ways, and both are the same handle on the same column. Ready-made from
the header cell's render arguments, beside `sortTrigger`, `menu` and `resizer`:

```tsx
<DataGrid.HeaderCell header={header}>
	{({ dragHandle, sortTrigger, menu }) => (
		<DataGrid.HeaderMain>
			{dragHandle}
			{sortTrigger}
			{menu}
		</DataGrid.HeaderMain>
	)}
</DataGrid.HeaderCell>
```

or as a component inside a header cell body that reads `useDataGridHeaderCell()`, which is how a
kit's own grip-wearing version is placed — `<ColumnDragHandle />` from `@ez-kit/data-grid-heroui`.
It takes no `columnId`, unlike the row's handle: a header cell's body renders inside the cell that
publishes the drag, so there is nothing to look up.

The dragged header carries `data-column-dragging`, matching `data-row-dragging` and the
`data-column-*` namespace `data-column-id` already established.

A column that cannot be dragged — no adapter bound, column ordering off, a system column, an
`ordering: false` column, or a header that is not a leaf — renders no handle at all rather than one
that does nothing. A grid with no adapter renders exactly the DOM it did before. The resize handle
is untouched: a drag starts from the drag handle element and nothing else.

Boundaries are enforced where the one-step affordances enforce them, and now **before** the step
rather than after it. A leaf dragged at a column in another header group, across a pin band, or onto
a locked column does not move there: it travels as far as its own group allows and lands at that
edge, which is also what the user watched happen. The commit path's own guards stay where they were.

That is what the port's new `DndProviderProps.canDrop` is for, and it applies to **both** axes. An
adapter is handed the same question the commit asks, early enough to decline the hover — with
`@dnd-kit/react` that is `event.preventDefault()` in `onDragOver`, which the library documents by
construction: its `setDropTarget` returns `defaultPrevented`.

It is not a nicety. Refusing only at release left the drag library's own indices permuted with
nothing to put them back — a refusal writes no state, so no re-render restores them — which left the
header visibly reordered and made the **next** drag on that axis commit nothing. Measured in
`@dnd-kit/dom@0.1.21`, whose restore path runs only for a _cancelled_ operation, and a refused drop
is not a cancelled one. The port's docblock states this, so a kit writing its own adapter knows that
ignoring `canDrop` is incorrect rather than merely less helpful.

**Two more fixes ride along, both required for this surface to work at all.**

The kits' `Th` now forwards its ref. `ThProps` has declared it since the drag port landed, for
exactly this reason — a drag library is handed the element it moves through a ref — and both kits
were plain function components, which silently drop `ref` on React 18. `useColumnDrag()` is exported
beside `useRowDrag()` for a kit or an application writing a handle of its own.

The drag adapters now set the sortable's `group` from the axis. Without it every sortable in a grid
shared one index space, and a grid with both rows and columns draggable would have had **both** axes
stop working: the drag library's optimistic sorting requires each group's indices to be contiguous,
and two interleaved axes are not. This is a prerequisite rather than a refinement, and it is not the
composite group key an earlier design considered and dropped — it carries the axis and nothing else.

For the shadcn registry, the vendored `components/ui/table.tsx` gains a `forwardRef` on
`TableHead`, alongside the two the file already carries on `TableHeader` and `TableRow` and for the
same class of reason. It reaches consumers through `npx shadcn add`, so it is named here rather than
left to a diff.
