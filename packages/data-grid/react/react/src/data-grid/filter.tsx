import { useGridComponents } from '../components-context'

import { useFilters } from './filter-panel'

import type { DataGridFilterTarget } from './filter-panel'
import type { ReactNode } from 'react'

export type DataGridFilterProps = {
	/** Which filter to render — a column id or the id of a field from `filtering.fields`. */
	id: string
	/**
	 * Custom content, replacing the kit's chip chrome.
	 *
	 * Receives the same per-target shape `<DataGrid.FilterPanel>`'s render function hands over —
	 * label, value summary, the ready-made control, the clear callback, and the `filter` model
	 * (operators, current value, editor, values on offer, `setValue`) for a control built on a kit's
	 * own filter component.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.Filter id='status'>
	 *   {({ label, input }) => (
	 *     <label>
	 *       {label}
	 *       {input}
	 *     </label>
	 *   )}
	 * </DataGrid.Filter>
	 * ```
	 */
	children?: ReactNode | ((target: DataGridFilterTarget) => ReactNode)
}

/**
 * Compound member: one filter's control, wherever the layout wants it.
 *
 * The single-target half of `<DataGrid.FilterPanel>` — same chip, same popover, same ready-made
 * control resolved from the cell type and operator config. It exists so a grid can place `Status`
 * and `Warehouse` filters into its toolbar (or anywhere else) by name — a column and a field alike
 * — without re-implementing the control or filtering the panel's whole list down to one.
 *
 * Renders nothing when the grid has nothing to filter, or when `id` names neither a filterable
 * column nor an offered field — the same silence as the panel, so no guard is needed around it.
 */
export function Filter({ id, children }: DataGridFilterProps) {
	const { FilterPanelChip } = useGridComponents().filtering
	const resolved = useFilters()

	const entry = resolved?.filters.find((target) => target.id === id)
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
