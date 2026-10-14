import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { filtersRows } from '../utils/filters-rows'

import { columnLabel, filteringMetaOf, resolveColumnFilter } from './column-filter-model'
import { applyColumnFiltersValue, readColumnFiltersValue } from './column-filters-batch'
import { renderFilterInput } from './render-filter-input'
import { useDataGridState, useDataGridTable } from './table-context'

import type { ErasedRow, GridFeatures } from '../types'
import type { ColumnFilterModel, OperatorColumnFilterModel } from './column-filter-model'
import type { ColumnFiltersValue } from './column-filters-batch'
import type { StructuredFilterValue } from '@ez-kit/data-grid-core'
import type { Column, Header } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/**
 * Compound member: standalone surface that renders one filter chip per filterable column.
 *
 * Each chip shows `{column header}: {value or "Any"}`. Clicking the chip opens a kit-provided
 * popover whose body is the regular column filter input (same `renderFilterInput` as the header).
 *
 * Mounted wherever a layout puts it. For the panel to be the grid's *only* filter UI, expand
 * the table down to `<DataGrid.HeaderCell>` and render everything but its `filter` — which is
 * what `filtering.variant: 'panel'` used to do for the whole grid at once. Left beside the
 * built-in header cell, the two are simply two controls on one `columnFilters` entry.
 */
/** One filterable column, as the panel resolved it. */
export type DataGridFilterPanelColumn<TRow extends object = ErasedRow> = {
	column: Column<GridFeatures, TRow>
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
	/**
	 * The data the ready-made `input` is built from — operators in the grid's wording, the current
	 * operator and value, the editor they call for, the values on offer, presets, debounce, and the
	 * setters. What a panel built on a kit's own filter controls reads instead of `input`.
	 */
	filter: ColumnFilterModel
}

/** What a `<DataGrid.FilterPanel>` render function receives. */
export type DataGridFilterPanelRenderArgs = {
	columns: DataGridFilterPanelColumn[]
	/** True when at least one column currently has a filter value. */
	hasActiveFilter: boolean
	/**
	 * Every column with operators that currently holds a filter, keyed by column id — the shape a
	 * kit's own filter component takes as one value. A column without operators is not in it; its
	 * plain filter stays on its `filter.value`.
	 *
	 * A fresh object on every render, so compare it by content rather than by reference.
	 */
	value: Record<string, StructuredFilterValue>
	/**
	 * Writes the panel's whole value in **one** state change — so `filtering.onChange` fires once,
	 * and under `draft` the write lands in the draft like any other. Every column with operators
	 * takes its entry from `next` and loses its filter when `next` does not name it; an empty
	 * value (no value, `''`, `[]`, a range with neither bound) counts as not named, except under
	 * an operator that takes none. Columns without operators keep their filters, and a key that
	 * names no column with operators is ignored, with a warning in development.
	 */
	setValue: (next: ColumnFiltersValue) => void
}

/** What {@link useColumnFilters} returns — the same thing a `<DataGrid.FilterPanel>` render function receives. */
export type UseColumnFiltersResult = DataGridFilterPanelRenderArgs

export type DataGridFilterPanelProps = {
	/**
	 * Custom panel content, replacing the kit's `FilterPanel` chrome and its chips.
	 *
	 * The panel still renders nothing at all when the grid has no filtered row model or no
	 * filterable columns, so `children` are not called in those states.
	 *
	 * A render function receives what {@link useColumnFilters} returns: each column's ready-made
	 * `input` beside its `filter` model, and the panel's whole `value` with a `setValue` that writes
	 * it in one state change — what a panel built on a kit's own filter component reads.
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
 * The grid's filters as a panel sees them: the filterable columns with their labels, value
 * summaries, filter models and ready-made controls, plus the panel's whole value and a setter that
 * writes it in one state change. What `<FilterPanel>` and `<ColumnFilter>` render from, and what a
 * panel built on a kit's own filter component reads anywhere under `<DataGrid>`.
 *
 * `undefined` when the grid has nothing to filter (no filtered row model, or no filterable
 * column), which is what makes both components render nothing in those states.
 *
 * @example
 * ```tsx
 * function MyFilters() {
 *   const filters = useColumnFilters()
 *   if (!filters) return null
 *   return <Filters value={filters.value} onChange={filters.setValue} mode='confirm' />
 * }
 * ```
 */
export function useColumnFilters(): UseColumnFiltersResult | undefined {
	const table = useDataGridTable()
	useDataGridState((s) => s.columnFilters)
	useDataGridState((s) => s.columnVisibility)
	useDataGridState((s) => s.columnPinning)
	const gridComponents = useGridComponents()
	const { Input, Menu } = gridComponents.core
	const { OperatorSelect, BetweenInput, MultiSelectFilter, ClearFilterButton } = gridComponents.filtering
	const cellTypes = useCellTypes()
	const filteringDebounce = table.grid.filtering.debounce
	const { messages } = table.grid

	if (!filtersRows(table)) return undefined

	const filterableColumns = table.getAllLeafColumns().filter((column) => {
		const { meta } = filteringMetaOf(column)
		if (meta?.isSystemColumn) return false
		if (meta?.filtering === false) return false
		return column.getCanFilter()
	})

	if (filterableColumns.length === 0) return undefined

	const hasActiveFilter = filterableColumns.some((c) => c.getFilterValue() !== undefined)

	const resolvedColumns: DataGridFilterPanelColumn[] = filterableColumns.map((column) => {
		const { meta } = filteringMetaOf(column)
		const filter = resolveColumnFilter(column, { messages, tableDebounce: filteringDebounce, cellTypes })

		const headerLike = { id: column.id, column } as unknown as Header<GridFeatures, ErasedRow>

		const input = renderFilterInput({
			header: headerLike,
			meta,
			Input,
			cellTypes,
			OperatorSelect,
			Menu,
			ClearFilterButton,
			BetweenInput,
			MultiSelectFilter,
			debounce: filteringDebounce,
			messages,
			table,
			model: filter,
		})

		const onClear = (): void => {
			column.setFilterValue(undefined)
		}

		return {
			column,
			label: columnLabel(column),
			valueDisplay: filter.valueDisplay,
			hasValue: filter.hasValue,
			input,
			onClear,
			filter,
		}
	})

	const operatorModels = new Map<string, OperatorColumnFilterModel>()
	for (const { filter } of resolvedColumns) {
		if (filter.hasOperators) operatorModels.set(filter.columnId, filter)
	}

	const setValue = (next: ColumnFiltersValue): void => {
		table.setColumnFilters((prev) => applyColumnFiltersValue(prev, next, operatorModels))
	}

	return {
		columns: resolvedColumns,
		hasActiveFilter,
		value: readColumnFiltersValue([...operatorModels.values()]),
		setValue,
	}
}

export function FilterPanel({ children }: DataGridFilterPanelProps = {}) {
	const { FilterPanel: FilterPanelChrome, FilterPanelChip } = useGridComponents().filtering
	const resolved = useColumnFilters()
	if (resolved === undefined) return null

	const { columns, hasActiveFilter } = resolved

	if (children !== undefined) {
		return typeof children === 'function' ? children(resolved) : children
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
