import { useGridComponents } from '../components-context'

import { flexRender } from './flex-render'
import { useDataGridInstance, useDataGridStore } from './table-context'

import type { DataTable } from '@ez-kit/data-grid-core'
import type { HeaderGroup } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/** What a `<DataGrid.Footer>` render function receives. */
export type DataGridFooterRenderArgs = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	table: DataTable<any>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	footerGroups: HeaderGroup<any>[]
}

export type DataGridFooterProps = {
	/**
	 * Custom footer content, rendered inside the kit's `<Tfoot>`.
	 *
	 * Omit it to render one row per footer group from each column's `footer`, in the same
	 * column order (and with the same pinning) as the header.
	 *
	 * @example — a totals row of your own
	 * ```tsx
	 * <DataGrid.Footer>
	 *   {({ table }) => (
	 *     <tr>
	 *       <td colSpan={table.getVisibleLeafColumns().length}>
	 *         {table.getRowModel().rows.length} rows
	 *       </td>
	 *     </tr>
	 *   )}
	 * </DataGrid.Footer>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridFooterRenderArgs) => ReactNode)
}

/**
 * Table `<tfoot>`, built from each column's `footer`.
 *
 * Not part of the default layout — a grid renders a footer only when one is placed inside a
 * custom `<DataGrid.Table>` body. `ColumnDef.footer` has always reached TanStack; until this
 * slot existed there was nothing that rendered it, so every totals row had to be hand-built
 * outside the table element.
 *
 * @example
 * ```tsx
 * <DataGrid.Table>
 *   <DataGrid.Header />
 *   <DataGrid.Body />
 *   <DataGrid.Footer />
 * </DataGrid.Table>
 * ```
 */
export function Footer({ children }: DataGridFooterProps = {}) {
	const instance = useDataGridInstance()
	const table = instance.table
	const { Tfoot, Tr, Td } = useGridComponents().core

	// Narrow subscriptions: a footer reflects column layout and the rows it aggregates over,
	// nothing else. Editing or selection mutations leave all of these stable.
	useDataGridStore((s) => s.columnVisibility)
	useDataGridStore((s) => s.columnPinning)
	useDataGridStore((s) => s.columnOrder)

	const footerGroups = table.getFooterGroups()

	if (children !== undefined) {
		return (
			<Tfoot data-slot='tfoot'>{typeof children === 'function' ? children({ table, footerGroups }) : children}</Tfoot>
		)
	}

	return (
		<Tfoot data-slot='tfoot'>
			{footerGroups.map((footerGroup) => (
				<Tr
					data-slot='tr'
					key={footerGroup.id}
				>
					{footerGroup.headers.map((header) => {
						const pinned = header.column.getIsPinned()
						return (
							<Td
								data-slot='td'
								key={header.id}
								colSpan={header.colSpan}
								{...(pinned ? { pinned, 'data-pinned': pinned } : {})}
								{...(header.column.columnDef.meta?.footerClassName !== undefined
									? { className: header.column.columnDef.meta.footerClassName }
									: {})}
							>
								{header.isPlaceholder ? null : flexRender(header.column.columnDef.footer, header.getContext())}
							</Td>
						)
					})}
				</Tr>
			))}
		</Tfoot>
	)
}
