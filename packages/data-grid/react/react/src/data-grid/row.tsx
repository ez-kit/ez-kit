import { useGridComponents } from '../components-context'
import { joinClassNames } from '../utils/class-names'

import { DataGridCell } from './cell'
import { useDataGridTable } from './table-context'

import type { PinSide } from './use-pinned-row-offsets'
import type { RowPropsResolver } from '../use-data-grid'
import type { Row } from '@tanstack/table-core'
import type { CSSProperties, ReactNode, Ref } from 'react'

/**
 * What a `<DataGrid.Row>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.Row<Order>>` — and the render arguments are typed: `row.original` is an `Order`.
 * See {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridRowRenderArgs<TRow extends object = any> = {
	row: Row<TRow>
	/** The row's visible cells, in column order — already filtered by column visibility and pinning. */
	cells: ReturnType<Row<TRow>['getVisibleCells']>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridRowProps<TRow extends object = any> = {
	row: Row<TRow>
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
	 */
	children?: ReactNode | ((args: DataGridRowRenderArgs<TRow>) => ReactNode)
}

/**
 * Renders a single table body row with all its cells.
 *
 * Emits structural data attributes:
 * - `data-slot="tr"` (identity)
 * - `data-row-id` (table row id)
 * - `data-depth` (sub-row depth for expansion)
 * - `data-pinned="top" | "bottom"` for pinned rows (offset from `--dg-row-pin-offset`)
 * - `data-virtual="row"` for virtualized rows (positioned via runtime `transform`)
 *
 * Consumer props from `rowProps` are applied first, so those structural attributes always win;
 * `className` is the exception and is merged rather than overwritten.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataGridRow<TRow extends object = any>({
	row,
	style,
	ref,
	'data-pinned': dataPinned,
	'data-virtual': dataVirtual,
	children,
}: DataGridRowProps<TRow>) {
	const { Tr } = useGridComponents().core
	const table = useDataGridTable<TRow>()
	// `table.grid` is row-erased, so the stored resolver is typed `Row<never>`; the row we hold
	// is the very one it was written against.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const resolveRowProps = table.grid.rowProps as RowPropsResolver<any> | undefined
	const { className: consumerClassName, style: consumerStyle, ...consumerProps } = resolveRowProps?.(row) ?? {}
	const cells = row.getVisibleCells()

	return (
		<Tr
			{...consumerProps}
			ref={ref}
			data-slot='tr'
			data-row-id={row.id}
			data-depth={row.depth > 0 ? row.depth : undefined}
			style={consumerStyle !== undefined || style !== undefined ? { ...consumerStyle, ...style } : undefined}
			className={joinClassNames(consumerClassName)}
			data-pinned={dataPinned}
			data-virtual={dataVirtual}
		>
			{children === undefined
				? cells.map((cell) => (
						<DataGridCell
							key={cell.id}
							cell={cell}
							row={row}
						/>
					))
				: typeof children === 'function'
					? children({ row, cells })
					: children}
		</Tr>
	)
}
