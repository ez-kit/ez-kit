import { useGridComponents } from '../components-context'

import { DataGridFooterRow } from './footer-row'
import { useDataGridTable, useDataGridState } from './table-context'

import type { DataTable } from '@ez-kit/data-grid-core'
import type { HeaderGroup } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/**
 * What a `<DataGrid.Footer>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.Footer<Order>>` — and the render arguments are typed. See
 * {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridFooterRenderArgs<TRow extends object = any> = {
	table: DataTable<TRow>
	footerGroups: HeaderGroup<TRow>[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridFooterProps<TRow extends object = any> = {
	/**
	 * Stick the footer to the bottom of the scroll container for this footer only.
	 *
	 * Omit it — the default — and the flag is read from the grid's own `layout.stickyFooter`,
	 * so a hand-placed footer keeps whatever the grid asked for.
	 *
	 * Named `sticky`, not `stickyFooter`: the component already says "footer", the same way
	 * `<DataGrid.Header sticky>` does.
	 */
	sticky?: boolean
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
	children?: ReactNode | ((args: DataGridFooterRenderArgs<TRow>) => ReactNode)
}

/**
 * Table `<tfoot>`, built from each column's `footer`.
 *
 * The default layout mounts it for you as soon as one column declares a `footer` — see
 * `layout.footer`. Place it by hand only inside a custom `<DataGrid.Table>` body, where
 * `children` replace the header/body pair and nothing is mounted for you.
 *
 * Emits `data-slot="tfoot"` and, when sticky, `data-sticky="true"` — the same attribute
 * `<DataGrid.Header>` sets, so a kit paints both from one rule.
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Footer<TRow extends object = any>({ sticky, children }: DataGridFooterProps<TRow> = {}) {
	const table = useDataGridTable<TRow>()
	const isSticky = sticky ?? table.grid.layout.stickyFooter
	const { Tfoot } = useGridComponents().core

	// Narrow subscriptions: a footer reflects column layout and the rows it aggregates over,
	// nothing else. Editing or selection mutations leave all of these stable.
	useDataGridState((s) => s.columnVisibility)
	useDataGridState((s) => s.columnPinning)
	useDataGridState((s) => s.columnOrder)

	const footerGroups = table.getFooterGroups()

	const stickyAttr = isSticky ? { 'data-sticky': 'true' as const } : {}

	if (children !== undefined) {
		return (
			<Tfoot
				data-slot='tfoot'
				{...stickyAttr}
			>
				{typeof children === 'function' ? children({ table, footerGroups }) : children}
			</Tfoot>
		)
	}

	return (
		<Tfoot
			data-slot='tfoot'
			{...stickyAttr}
		>
			{footerGroups.map((footerGroup) => (
				<DataGridFooterRow
					key={footerGroup.id}
					footerGroup={footerGroup}
				/>
			))}
		</Tfoot>
	)
}
