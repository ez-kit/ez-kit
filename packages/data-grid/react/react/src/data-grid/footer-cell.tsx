import { useGridComponents } from '../components-context'

import { getAlignAttrs } from './align-attrs'
import { flexRender } from './flex-render'

import type { Header } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/**
 * What a `<DataGrid.FooterCell>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.FooterCell<Order>>` — and the render arguments are typed. See
 * {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridFooterCellRenderArgs<TRow extends object = any> = {
	header: Header<TRow, unknown>
	/** The column's own `footer` content, already rendered. `null` for a placeholder cell. */
	content: ReactNode
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridFooterCellProps<TRow extends object = any> = {
	/**
	 * The footer group entry this cell renders. Footer cells come from `table.getFooterGroups()`,
	 * the same `Header` objects the header rows use — hence the prop name.
	 */
	header: Header<TRow, unknown>
	/**
	 * Custom content for this one footer cell, rendered inside the kit's `Td` — so the cell keeps
	 * its `colSpan`, its pinning offset, its `data-align` and its `footerClassName`.
	 *
	 * Omit it for the column's own `footer`. The render-function form hands that content back
	 * ({@link DataGridFooterCellRenderArgs}) so a custom cell can wrap rather than replace it.
	 */
	children?: ReactNode | ((args: DataGridFooterCellRenderArgs<TRow>) => ReactNode)
}

/**
 * One `<td>` of the table footer.
 *
 * Emits `data-slot="td"`, plus `data-pinned="left" | "right"` for a pinned column and
 * `data-align` from the column's `align.footer` — the same chrome the default `<tfoot>` applies,
 * which is the whole point of having this component rather than a hand-written `<td>`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataGridFooterCell<TRow extends object = any>({ header, children }: DataGridFooterCellProps<TRow>) {
	const { Td } = useGridComponents().core
	const pinned = header.column.getIsPinned()
	const meta = header.column.columnDef.meta
	const content = header.isPlaceholder ? null : flexRender(header.column.columnDef.footer, header.getContext())

	return (
		<Td
			data-slot='td'
			colSpan={header.colSpan}
			{...(pinned ? { pinned, 'data-pinned': pinned } : {})}
			{...getAlignAttrs(meta, 'footer')}
			{...(meta?.footerClassName !== undefined ? { className: meta.footerClassName } : {})}
		>
			{children === undefined ? content : typeof children === 'function' ? children({ header, content }) : children}
		</Td>
	)
}
