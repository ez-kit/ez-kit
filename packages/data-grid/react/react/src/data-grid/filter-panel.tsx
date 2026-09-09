import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'

import { renderFilterInput } from './render-filter-input'
import { useDataGridState, useDataGridTable } from './table-context'

import type { BadgeItem, BetweenValue, SelectItem, StructuredFilterValue } from '@ez-kit/data-grid-core'
import type { Column, ColumnMeta, Header } from '@tanstack/table-core'
import type { ReactNode } from 'react'

const MAX_INLINE_VALUES = 2

function formatBetweenValue(value: BetweenValue, anyLabel: string): { display: string; hasValue: boolean } {
	const { from, to } = value
	const fromDefined = from !== undefined && from !== ''
	const toDefined = to !== undefined && to !== ''
	if (!fromDefined && !toDefined) return { display: anyLabel, hasValue: false }
	if (fromDefined && toDefined) return { display: `${String(from)} – ${String(to)}`, hasValue: true }
	if (fromDefined) return { display: `≥ ${String(from)}`, hasValue: true }
	return { display: `≤ ${String(to)}`, hasValue: true }
}

function resolveOptionLabel(rawValue: string, meta: ColumnMeta<unknown, unknown> | undefined): string {
	const filteringMeta = meta?.filtering === false ? undefined : meta?.filtering
	const explicit = filteringMeta?.items
	if (explicit) {
		const hit = explicit.find((o) => o.value === rawValue)
		if (hit) return hit.label
	}
	if (meta?.cell?.type === 'select' || meta?.cell?.type === 'badge') {
		const items = (meta.cell.config as { items?: (SelectItem | BadgeItem)[] } | undefined)?.items
		const hit = items?.find((o) => o.value === rawValue)
		if (hit) return hit.label
	}
	return rawValue
}

function formatMultiValue(
	values: unknown[],
	meta: ColumnMeta<unknown, unknown> | undefined,
	anyLabel: string,
): { display: string; hasValue: boolean } {
	if (values.length === 0) return { display: anyLabel, hasValue: false }
	const labels = values.map((v) => resolveOptionLabel(String(v), meta))
	if (labels.length <= MAX_INLINE_VALUES) return { display: labels.join(', '), hasValue: true }
	const inline = labels.slice(0, MAX_INLINE_VALUES).join(', ')
	return { display: `${inline} +${String(labels.length - MAX_INLINE_VALUES)}`, hasValue: true }
}

function formatFilterValue(
	filterValue: unknown,
	meta: ColumnMeta<unknown, unknown> | undefined,
	anyLabel: string,
): { display: string; hasValue: boolean } {
	if (filterValue == null || filterValue === '') return { display: anyLabel, hasValue: false }

	if (typeof filterValue === 'object' && 'operator' in filterValue) {
		const sv = filterValue as StructuredFilterValue
		const filteringMeta = meta?.filtering === false ? undefined : meta?.filtering
		const op = filteringMeta?.operators?.find((o) => o.id === sv.operator)
		const inner = sv.value

		// `requiresInput === false` operators (e.g. isEmpty / isNotEmpty) — show operator label.
		if (op?.requiresInput === false) {
			return { display: op.label, hasValue: true }
		}

		// Between value
		if (inner !== null && typeof inner === 'object' && ('from' in inner || 'to' in inner)) {
			return formatBetweenValue(inner, anyLabel)
		}

		// Multi value (in / notIn)
		if (Array.isArray(inner)) {
			return formatMultiValue(inner, meta, anyLabel)
		}

		// Plain inner value
		if (inner == null || inner === '') return { display: anyLabel, hasValue: false }
		return { display: String(inner), hasValue: true }
	}

	// Plain (non-operator) filter value
	if (Array.isArray(filterValue)) return formatMultiValue(filterValue, meta, anyLabel)
	return { display: String(filterValue), hasValue: true }
}

/**
 * Compound member: standalone surface that renders one filter chip per filterable column.
 *
 * Each chip shows `{column header}: {value or "Any"}`. Clicking the chip opens a kit-provided
 * popover whose body is the regular column filter input (same `renderFilterInput` as the header).
 *
 * Pair with `filtering.variant: 'panel'` so the header skips inline filter rendering.
 */
/** One filterable column, as the panel resolved it. */
export type DataGridFilterPanelColumn = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	column: Column<any>
	/** The column's string header, falling back to its id. */
	label: string
	/** Human-readable current value, or the "Any" placeholder when unset. */
	valueDisplay: string
	hasValue: boolean
	/**
	 * The ready-made filter control for this column — the same one the header renders, with
	 * its operator select, between inputs or multi-select already resolved from the column's
	 * cell type and operator config, and the shared debounce applied. Rebuilding this by hand
	 * is the expensive part, which is why it is handed over rather than left to the caller.
	 */
	input: ReactNode
	onClear: () => void
}

/** What a `<DataGrid.FilterPanel>` render function receives. */
export type DataGridFilterPanelRenderArgs = {
	columns: DataGridFilterPanelColumn[]
	/** True when at least one column currently has a filter value. */
	hasActiveFilter: boolean
}

export type DataGridFilterPanelProps = {
	/**
	 * Custom panel content, replacing the kit's `FilterPanel` chrome and its chips.
	 *
	 * The panel still renders nothing at all when the grid has no filtered row model or no
	 * filterable columns, so `children` are not called in those states.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.FilterPanel>
	 *   {({ columns }) =>
	 *     columns.map(({ column, label, input, hasValue, onClear }) => (
	 *       <fieldset key={column.id}>
	 *         <legend>{label}</legend>
	 *         {input}
	 *         {hasValue && <button onClick={onClear}>Clear</button>}
	 *       </fieldset>
	 *     ))
	 *   }
	 * </DataGrid.FilterPanel>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridFilterPanelRenderArgs) => ReactNode)
}

/**
 * The filterable columns with their labels, value summaries and ready-made controls — what
 * both `<FilterPanel>` and `<ColumnFilter>` render.
 *
 * `undefined` when the grid has nothing to filter (no filtered row model, or no filterable
 * column), which is what makes both components render nothing in those states.
 */
export function useFilterPanelColumns(): DataGridFilterPanelRenderArgs | undefined {
	const table = useDataGridTable()
	useDataGridState((s) => s.columnFilters)
	useDataGridState((s) => s.columnVisibility)
	useDataGridState((s) => s.columnPinning)
	const gridComponents = useGridComponents()
	const { Input } = gridComponents.core
	const { OperatorSelect, BetweenInput, MultiSelectFilter } = gridComponents.filtering
	const cellTypes = useCellTypes()
	const filteringDebounce = table.grid.filtering.debounce

	const hasFiltering = Boolean(table.options.getFilteredRowModel)
	if (!hasFiltering) return undefined

	const filterableColumns = table.getAllLeafColumns().filter((column) => {
		const meta = column.columnDef.meta
		if (meta?.isSystemColumn) return false
		if (meta?.filtering === false) return false
		return column.getCanFilter()
	})

	if (filterableColumns.length === 0) return undefined

	const hasActiveFilter = filterableColumns.some((c) => c.getFilterValue() !== undefined)

	const resolvedColumns: DataGridFilterPanelColumn[] = filterableColumns.map((column) => {
		const meta = column.columnDef.meta
		const headerDef = column.columnDef.header
		const label = typeof headerDef === 'string' ? headerDef : column.id
		const filterValue = column.getFilterValue()
		const { display, hasValue } = formatFilterValue(filterValue, meta, table.grid.messages.filtering.any)

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const headerLike = { id: column.id, column } as unknown as Header<any, unknown>

		const input = renderFilterInput({
			header: headerLike,
			meta,
			Input,
			cellTypes,
			OperatorSelect,
			BetweenInput,
			MultiSelectFilter,
			debounce: filteringDebounce,
			messages: table.grid.messages,
			table,
		})

		const onClear = (): void => {
			column.setFilterValue(undefined)
		}

		return { column, label, valueDisplay: display, hasValue, input, onClear }
	})

	return { columns: resolvedColumns, hasActiveFilter }
}

export function FilterPanel({ children }: DataGridFilterPanelProps = {}) {
	const { FilterPanel: FilterPanelChrome, FilterPanelChip } = useGridComponents().filtering
	const resolved = useFilterPanelColumns()
	if (resolved === undefined) return null

	const { columns, hasActiveFilter } = resolved

	if (children !== undefined) {
		return typeof children === 'function' ? children({ columns, hasActiveFilter }) : children
	}

	const chips = columns.map(({ column, label, valueDisplay, hasValue, input, onClear }) => (
		<FilterPanelChip
			key={column.id}
			label={label}
			valueDisplay={valueDisplay}
			hasValue={hasValue}
			onClear={onClear}
		>
			{input}
		</FilterPanelChip>
	))

	return (
		<div data-slot='filter-panel'>
			<FilterPanelChrome hasActiveFilter={hasActiveFilter}>{chips}</FilterPanelChrome>
		</div>
	)
}
