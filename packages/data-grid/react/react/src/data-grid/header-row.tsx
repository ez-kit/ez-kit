import { useGridComponents } from '../components-context'

import { DataGridHeaderCell } from './header-cell'

import type { Header, HeaderGroup } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/**
 * What a `<DataGrid.HeaderRow>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.HeaderRow<Order>>` — and the render arguments are typed. See
 * {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridHeaderRowRenderArgs<TRow extends object = any> = {
	headerGroup: HeaderGroup<TRow>
	/** The group's headers, in column order — already reflecting visibility and pinning. */
	headers: Header<TRow, unknown>[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridHeaderRowProps<TRow extends object = any> = {
	headerGroup: HeaderGroup<TRow>
	/**
	 * Custom cells for this header row, rendered inside the kit's `Tr`.
	 *
	 * Omit it for one {@link DataGridHeaderCell} per header. Supply it to give one column a cell
	 * of its own while every other keeps the default — the thing a `<DataGrid.Header>` render
	 * function alone could not do, since it hands back the header groups and nothing to render
	 * them with.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.HeaderRow headerGroup={group}>
	 *   {({ headers }) =>
	 *     headers.map((header) => <DataGrid.HeaderCell key={header.id} header={header} />)
	 *   }
	 * </DataGrid.HeaderRow>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridHeaderRowRenderArgs<TRow>) => ReactNode)
}

/** One `<tr>` of the table header. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataGridHeaderRow<TRow extends object = any>({ headerGroup, children }: DataGridHeaderRowProps<TRow>) {
	const { Tr } = useGridComponents().core
	const headers = headerGroup.headers

	return (
		<Tr data-slot='tr'>
			{children === undefined
				? headers.map((header) => (
						<DataGridHeaderCell
							key={header.id}
							header={header}
						/>
					))
				: typeof children === 'function'
					? children({ headerGroup, headers })
					: children}
		</Tr>
	)
}
