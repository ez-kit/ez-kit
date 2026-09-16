import { useGridComponents } from '../components-context'

import { getAlignAttrs } from './align-attrs'
import { flexRender } from './flex-render'

import type { ErasedRow, GridFeatures } from '../types'
import type { FormColumnMeta } from '@ez-kit/data-grid-core'
import type { Header } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/**
 * What a `<DataGrid.FooterCell>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.FooterCell<Order>>` — and the render arguments are typed. See
 * {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
export type DataGridFooterCellRenderArgs<TRow extends object = ErasedRow> = {
	header: Header<GridFeatures, TRow>
	/** The column's own `footer` content, already rendered. `null` for a placeholder cell. */
	content: ReactNode
}

export type DataGridFooterCellProps<TRow extends object = ErasedRow> = {
	/**
	 * The footer group entry this cell renders. Footer cells come from `table.getFooterGroups()`,
	 * the same `Header` objects the header rows use — hence the prop name.
	 */
	header: Header<GridFeatures, TRow>
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
 * Emits `data-slot="td"`, plus `data-pinned="start" | "end"` for a pinned column and
 * `data-align` from the column's `align.footer` — the same chrome the default `<tfoot>` applies,
 * which is the whole point of having this component rather than a hand-written `<td>`.
 */

export function DataGridFooterCell<TRow extends object = ErasedRow>({
	header,
	children,
}: DataGridFooterCellProps<TRow>) {
	const { Td } = useGridComponents().core
	const pinned = header.column.getIsPinned()
	// `ColumnMeta` is declared `in out` in both its `TFeatures` and its `TData` upstream, so no
	// concrete instantiation is assignable to any other and this cast is forced by the variance
	// annotation rather than chosen. `FormColumnMeta` is the one name core declares for it, and
	// this is the same cast core's own `creating.ts` makes at its boundary.
	const meta = header.column.columnDef.meta as FormColumnMeta | undefined
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
