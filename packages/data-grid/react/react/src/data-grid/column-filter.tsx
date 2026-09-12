import { useGridComponents } from '../components-context'

import { useFilterPanelColumns } from './filter-panel'

import type { DataGridFilterPanelColumn } from './filter-panel'
import type { ReactNode } from 'react'

export type DataGridColumnFilterProps = {
	/** Which column's filter to render. */
	columnId: string
	/**
	 * Custom content, replacing the kit's chip chrome.
	 *
	 * Receives the same per-column shape `<DataGrid.FilterPanel>`'s render function hands over
	 * — label, value summary, the ready-made control, the clear callback.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.ColumnFilter columnId='status'>
	 *   {({ label, input }) => (
	 *     <label>
	 *       {label}
	 *       {input}
	 *     </label>
	 *   )}
	 * </DataGrid.ColumnFilter>
	 * ```
	 */
	children?: ReactNode | ((column: DataGridFilterPanelColumn) => ReactNode)
}

/**
 * Compound member: one column's filter control, wherever the layout wants it.
 *
 * The single-column half of `<DataGrid.FilterPanel>` — same chip, same popover, same
 * ready-made control resolved from the column's cell type and operator config. It exists so a
 * grid can place `Status` and `Priority` filters into its toolbar (or anywhere else) by name,
 * without re-implementing the control or filtering the panel's whole column list down to one.
 *
 * Renders nothing when the grid has no filtered row model, or when `columnId` names a column
 * that is not filterable — the same silence as the panel, so no guard is needed around it.
 */
export function ColumnFilter({ columnId, children }: DataGridColumnFilterProps) {
	const { FilterPanelChip } = useGridComponents().filtering
	const resolved = useFilterPanelColumns()

	const entry = resolved?.columns.find((c) => c.column.id === columnId)
	if (entry === undefined) return null

	if (children !== undefined) {
		return typeof children === 'function' ? children(entry) : children
	}

	const { label, valueDisplay, hasValue, input, onClear } = entry

	return (
		<FilterPanelChip
			label={label}
			valueDisplay={valueDisplay}
			hasValue={hasValue}
			onClear={onClear}
		>
			{input}
		</FilterPanelChip>
	)
}
