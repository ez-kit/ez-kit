import { useGridComponents } from '../components-context'

import { DataGridFooterCell } from './footer-cell'

import type { Header, HeaderGroup } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/**
 * What a `<DataGrid.FooterRow>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.FooterRow<Order>>` — and the render arguments are typed. See
 * {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridFooterRowRenderArgs<TRow extends object = any> = {
	footerGroup: HeaderGroup<TRow>
	/** The group's cells, in column order — already reflecting visibility and pinning. */
	headers: Header<TRow, unknown>[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridFooterRowProps<TRow extends object = any> = {
	/**
	 * The footer group this row renders, from `table.getFooterGroups()`.
	 *
	 * Named `footerGroup` for the thing it is, the way `<DataGrid.HeaderRow>` takes a
	 * `headerGroup` — TanStack builds both from the same `HeaderGroup` shape.
	 */
	footerGroup: HeaderGroup<TRow>
	/**
	 * Custom cells for this footer row, rendered inside the kit's `Tr`.
	 *
	 * Omit it for one {@link DataGridFooterCell} per column. Supply it to give one column a
	 * footer cell of its own while every other keeps the default — the thing a
	 * `<DataGrid.Footer>` render function alone could not do, since it hands back the footer
	 * groups and nothing to render them with.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.FooterRow footerGroup={group}>
	 *   {({ headers }) =>
	 *     headers.map((header) => <DataGrid.FooterCell key={header.id} header={header} />)
	 *   }
	 * </DataGrid.FooterRow>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridFooterRowRenderArgs<TRow>) => ReactNode)
}

/** One `<tr>` of the table footer. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataGridFooterRow<TRow extends object = any>({ footerGroup, children }: DataGridFooterRowProps<TRow>) {
	const { Tr } = useGridComponents().core
	const headers = footerGroup.headers

	return (
		<Tr data-slot='tr'>
			{children === undefined
				? headers.map((header) => (
						<DataGridFooterCell
							key={header.id}
							header={header}
						/>
					))
				: typeof children === 'function'
					? children({ footerGroup, headers })
					: children}
		</Tr>
	)
}
