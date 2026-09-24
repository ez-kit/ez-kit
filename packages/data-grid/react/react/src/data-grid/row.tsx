import { RowMoveDirection } from '@ez-kit/data-grid-core'
import { forwardRef } from 'react'

import { useGridComponents } from '../components-context'
import { joinClassNames } from '../utils/class-names'
import { isTextEntryTarget } from '../utils/text-entry-target'

import { DataGridCell } from './cell'
import { RowProvider } from './composition-context'
import { useDataGridState, useDataGridTable } from './table-context'

import type { ErasedRow, GridFeatures } from '../types'
import type { PinSide } from './use-pinned-row-offsets'
import type { RowPropsResolver } from '../use-data-grid'
import type { Row } from '@tanstack/table-core'
import type { CSSProperties, KeyboardEvent, ReactElement, ReactNode, Ref } from 'react'

/**
 * What a `<DataGrid.Row>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.Row<Order>>` — and the render arguments are typed: `row.original` is an `Order`.
 * See {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
export type DataGridRowRenderArgs<TRow extends object = ErasedRow> = {
	row: Row<GridFeatures, TRow>
	/** The row's visible cells, in column order — already filtered by column visibility and pinning. */
	cells: ReturnType<Row<GridFeatures, TRow>['getVisibleCells']>
	/**
	 * The row's default cells — one `<DataGrid.Cell>` per entry of `cells`, keyed.
	 *
	 * So a custom row can add to the row rather than rebuild it: prepend a drag handle, append a
	 * spacer, wrap the lot. Mapping `cells` yourself stays the way to change what a *particular*
	 * cell renders; this is for the rows that only wanted something beside the defaults.
	 */
	content: ReactNode
}

export type DataGridRowProps<TRow extends object = ErasedRow> = {
	row: Row<GridFeatures, TRow>
	style?: CSSProperties
	/** Forwarded to the kit's `Tr`; pinned rows are measured through it (see `usePinnedRowOffsets`). */
	ref?: Ref<HTMLTableRowElement>
	'data-pinned'?: PinSide
	'data-virtual'?: 'row'
	/**
	 * Custom cell content for this row, rendered inside the kit's `Tr` — so the row keeps its
	 * structural attributes, its pinning offset and its virtualization transform.
	 *
	 * Omit it for the built-in cells. Supply it to reorder, group or replace them without giving
	 * up the row itself, which a `<DataGrid.Body>` render function would have forced.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.Row row={row}>
	 *   {({ cells }) => cells.map((cell) => <DataGrid.Cell key={cell.id} cell={cell} row={row} />)}
	 * </DataGrid.Row>
	 * ```
	 *
	 * @example — keep the default cells and add to them
	 * ```tsx
	 * <DataGrid.Row row={row}>
	 *   {({ content }) => <>{content}<td data-slot='td' /></>}
	 * </DataGrid.Row>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridRowRenderArgs<TRow>) => ReactNode)
}

/**
 * The row's default cells, and the caller's `children` laid over them — the row-level twin of
 * `renderCellContent`.
 *
 * A static `children` returns before the cells are built, because it provably cannot place them.
 * A render function does not: it may, so the default is built and handed over, which costs an
 * array of React elements and no DOM if it turns out to drop them.
 */
function renderRowContent<TRow extends object>(
	children: DataGridRowProps<TRow>['children'],
	row: Row<GridFeatures, TRow>,
	cells: DataGridRowRenderArgs<TRow>['cells'],
): ReactNode {
	/**
	 * `content` behind a cached getter, which is what preserves the skip above now that a static
	 * child *can* reach it — through `useDataGridRow()`. The work went from "never done for a
	 * static child" to "done if that child asks", and a render function pays exactly what it did
	 * before. The cache is per call, so a body reading `content` twice builds one array.
	 */
	let built: ReactNode
	let isBuilt = false
	const args: DataGridRowRenderArgs<TRow> = {
		row,
		cells,
		get content() {
			if (!isBuilt) {
				built = cells.map((cell) => (
					<DataGridCell
						key={cell.id}
						cell={cell}
						row={row}
					/>
				))
				isBuilt = true
			}
			return built
		},
	}

	const content = children === undefined ? args.content : typeof children === 'function' ? children(args) : children

	return <RowProvider value={args}>{content}</RowProvider>
}

/**
 * Renders a single table body row with all its cells.
 *
 * Emits structural data attributes:
 * - `data-slot="tr"` (identity)
 * - `data-row-id` (table row id)
 * - `data-row-selected="true"` while the row is selected
 * - `data-depth` (sub-row depth for expansion)
 * - `data-pinned="top" | "bottom"` for pinned rows (offset from `--dg-row-pin-offset`)
 * - `data-virtual="row"` for virtualized rows (positioned via runtime `transform`)
 * - `data-movable="true"` while row reordering is on
 *
 * Consumer props from `rowProps` are applied first, so those structural attributes always win;
 * `className` is the exception and is merged rather than overwritten.
 */
// `forwardRef`, not a `ref` prop: React 19 passes `ref` through props, React 18 strips it before
// the component sees it, and this package supports both. The generic is restored by the cast
// below — `forwardRef` erases type parameters, and `<DataGrid.Row<Order>>` has to keep working.

function DataGridRowImpl<TRow extends object = ErasedRow>(
	{ row, style, 'data-pinned': dataPinned, 'data-virtual': dataVirtual, children }: Omit<DataGridRowProps<TRow>, 'ref'>,
	ref: Ref<HTMLTableRowElement>,
) {
	const { Tr } = useGridComponents().core
	const table = useDataGridTable<TRow>()
	// A crossing back out of the erased world, and the mirror of the one `useDataGrid` makes
	// when it stores this resolver. `table.grid` is row-erased (see `ErasedRow`), so the stored
	// resolver is typed against `never`; the row we hold here is the very one the consumer wrote
	// it against, so re-instantiating it at `TRow` restores the type it had before erasure.
	const resolveRowProps = table.grid.rowProps as RowPropsResolver<TRow> | undefined
	// Selection state is derived, not read: a parent row counts as selected through its
	// children, which only TanStack knows. The selector therefore ignores its argument and
	// re-derives on every store change — it returns a boolean, so `useSyncExternalStore` bails
	// out unless *this* row's selectedness actually flipped, and the body (which deliberately
	// does not subscribe to `rowSelection`) keeps its narrow re-render.
	//
	// The attribute is `data-row-selected`, not the obvious `data-selected`, because React Aria
	// reserves that one: its `Row` writes `data-selected={state.isSelected || undefined}` as a
	// literal *after* spreading incoming props, so a kit built on RAC (heroui) always erases a
	// value passed from here — RAC's selection manager is idle, since the grid's selection lives
	// in TanStack. `data-row-*` is this layer's own namespace and nothing overwrites it.
	// Optional-called: this runs for every row of every grid, and the method only exists once
	// `rowSelectionFeature` is registered — so a grid with selection off could not render a row.
	// The system-column read in `cell.tsx` is genuinely conditional and needs no guard; this one
	// is not, which is why a sweep that looked at the selection path missed it.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isSelected = useDataGridState(() => row.getIsSelected?.() ?? false)

	const canMove = table.grid.ordering.row
	/**
	 * `Alt+ArrowUp` / `Alt+ArrowDown` move the row one step.
	 *
	 * On the `<tr>`, reached by bubbling from whatever inside the row has focus — the selection
	 * checkbox, an inline action button, the overflow trigger. Same arrangement the header uses,
	 * where the handler sits on the `<th>` and is reached from the sort affordance's
	 * `tabIndex={0}`: no roving tabindex and no focus model of the grid's own.
	 *
	 * The menu entries are the discoverable affordance, but both kits' menus close on select, so
	 * a row travelling five places would mean five open-click cycles. This is the repeatable
	 * path, and the keyboard equivalent WCAG 2.1.1 asks of a drag handle anyway.
	 *
	 * Note it reaches the row only in a kit whose `Tr` forwards `onKeyDown`. React Aria's `Row`
	 * does not — the same upstream constraint that keeps `Alt+Arrow` column reordering out of
	 * the heroui kit (#223) — so there the menu entries are the whole affordance.
	 */
	const onRowKeyDown = canMove
		? (e: KeyboardEvent<HTMLTableRowElement>) => {
				if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
				// Only a control that owns `Alt+Arrow` keeps it — a text field moving by word, a
				// native select opening. A checkbox or a button does not, and a row has nothing
				// else to focus, so a predicate counting those would refuse every event here.
				if (isTextEntryTarget(e)) return
				const direction = e.key === 'ArrowUp' ? RowMoveDirection.Up : RowMoveDirection.Down
				if (!table.ordering.canMoveRow(row.id, direction)) return
				e.preventDefault()
				table.ordering.moveRow(row.id, direction)
			}
		: undefined
	const { className: consumerClassName, style: consumerStyle, ...consumerProps } = resolveRowProps?.(row) ?? {}
	const cells = row.getVisibleCells()

	return (
		<Tr
			{...consumerProps}
			ref={ref}
			data-slot='tr'
			data-row-id={row.id}
			data-row-selected={isSelected ? 'true' : undefined}
			data-depth={row.depth > 0 ? row.depth : undefined}
			style={consumerStyle !== undefined || style !== undefined ? { ...consumerStyle, ...style } : undefined}
			className={joinClassNames(consumerClassName)}
			data-pinned={dataPinned}
			data-virtual={dataVirtual}
			{...(onRowKeyDown ? { onKeyDown: onRowKeyDown } : {})}
			{...(canMove ? { 'data-movable': 'true' } : {})}
		>
			{renderRowContent(children, row, cells)}
		</Tr>
	)
}

/**
 * `forwardRef` erases the generic, so the exotic component is cast back to the generic call
 * signature it was written with. `DataGridRowProps` keeps `ref` in props — that is how a React 19
 * consumer reads it, and a React 18 one passes `ref` the same way at the call site.
 */
export const DataGridRow = forwardRef(DataGridRowImpl) as <TRow extends object = ErasedRow>(
	props: DataGridRowProps<TRow>,
) => ReactElement | null
