import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'

import { resolveFilter } from './filter-model'
import { collectFilterTargets } from './filter-target'
import { applyFiltersValue, readFiltersValue } from './filters-batch'
import { renderFilterInput } from './render-filter-input'
import { useDataGridState, useDataGridTable } from './table-context'

import type { FilterModel, OperatorFilterModel } from './filter-model'
import type { FilterSource } from './filter-target'
import type { FiltersValue } from './filters-batch'
import type { StructuredFilterValue } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

/**
 * One filter target — a filterable column or a field from `filtering.fields` — as the panel
 * resolved it.
 */
export type DataGridFilterTarget = {
	/** The filter's `columnFilters` key — the column id or the field id. */
	id: string
	/** The column's string header (falling back to its id), or the field's `header`. */
	label: string
	/** Human-readable current value, or the "Any" placeholder when unset. */
	valueDisplay: string
	hasValue: boolean
	/**
	 * The ready-made filter control for this target — the same one a column's header renders, with
	 * its operator select, between inputs or multi-select already resolved from the cell type and
	 * operator config, and the shared debounce applied. Rebuilding this by hand is the expensive
	 * part, which is why it is handed over rather than left to the caller.
	 */
	input: ReactNode
	onClear: () => void
	/**
	 * The data the ready-made `input` is built from — operators in the grid's wording, the current
	 * operator and value, the editor they call for, the values on offer, presets, debounce, and the
	 * setters. What a panel built on a kit's own filter controls reads instead of `input`.
	 */
	filter: FilterModel
	/**
	 * Where the filter comes from: `{ kind: 'column', column }` for a column, `{ kind: 'field' }` for
	 * a field. Most panels never need it — `filter` and `id` are the whole of what they read.
	 */
	source: FilterSource
}

/** What a `<DataGrid.FilterPanel>` render function receives. */
export type DataGridFilterPanelRenderArgs = {
	/** The filterable columns in column order, then the fields in the order they were declared. */
	filters: DataGridFilterTarget[]
	/** True when at least one target currently has a filter value. */
	hasActiveFilter: boolean
	/**
	 * Every target with operators that currently holds a filter, keyed by its id — the shape a kit's
	 * own filter component takes as one value. A target without operators is not in it; its plain
	 * filter stays on its `filter.value`.
	 *
	 * A fresh object on every render, so compare it by content rather than by reference.
	 */
	value: Record<string, StructuredFilterValue>
	/**
	 * Writes the panel's whole value in **one** state change — so `filtering.onChange` fires once,
	 * and under `draft` the write lands in the draft like any other. Every target with operators
	 * takes its entry from `next` and loses its filter when `next` does not name it; an empty value
	 * (no value, `''`, `[]`, a range with neither bound) counts as not named, except under an
	 * operator that takes none. Targets without operators keep their filters, and a key that names
	 * no target with operators is ignored, with a warning in development.
	 */
	setValue: (next: FiltersValue) => void
}

/** What {@link useFilters} returns — the same thing a `<DataGrid.FilterPanel>` render function receives. */
export type UseFiltersResult = DataGridFilterPanelRenderArgs

export type DataGridFilterPanelProps = {
	/**
	 * Custom panel content, replacing the kit's `FilterPanel` chrome and its chips.
	 *
	 * The panel still renders nothing at all when the grid has nothing to filter — no filtered row
	 * model, no filterable column and no offered field — so `children` are not called then.
	 *
	 * A render function receives what {@link useFilters} returns: each target's ready-made `input`
	 * beside its `filter` model, and the panel's whole `value` with a `setValue` that writes it in
	 * one state change — what a panel built on a kit's own filter component reads.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.FilterPanel>
	 *   {({ filters }) =>
	 *     filters.map(({ id, label, input, hasValue, onClear }) => (
	 *       <fieldset key={id}>
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
 * The grid's filters as a panel sees them: the filterable columns and the offered fields, with
 * their labels, value summaries, filter models and ready-made controls, plus the panel's whole
 * value and a setter that writes it in one state change. What `<FilterPanel>` and `<Filter>`
 * render from, and what a panel built on a kit's own filter component reads anywhere under
 * `<DataGrid>`.
 *
 * `undefined` when the grid has nothing to filter (no filtered row model, no filterable column and
 * no offered field), which is what makes both components render nothing in those states.
 *
 * @example
 * ```tsx
 * function MyFilters() {
 *   const filters = useFilters()
 *   if (!filters) return null
 *   return <Filters value={filters.value} onChange={filters.setValue} mode='confirm' />
 * }
 * ```
 */
export function useFilters(): UseFiltersResult | undefined {
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

	const targets = collectFilterTargets(table)
	if (targets.length === 0) return undefined

	const filters: DataGridFilterTarget[] = targets.map((target) => {
		const filter = resolveFilter(target, { messages, tableDebounce: filteringDebounce, cellTypes })

		const input = renderFilterInput({
			target,
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

		return {
			id: target.id,
			label: target.label,
			valueDisplay: filter.valueDisplay,
			hasValue: filter.hasValue,
			input,
			onClear: () => {
				target.setValue(undefined)
			},
			filter,
			source: target.source,
		}
	})

	const hasActiveFilter = targets.some((target) => target.getValue() !== undefined)

	const operatorModels = new Map<string, OperatorFilterModel>()
	for (const { filter } of filters) {
		if (filter.hasOperators) operatorModels.set(filter.id, filter)
	}

	const setValue = (next: FiltersValue): void => {
		table.setColumnFilters((prev) => applyFiltersValue(prev, next, operatorModels))
	}

	return {
		filters,
		hasActiveFilter,
		value: readFiltersValue([...operatorModels.values()]),
		setValue,
	}
}

/**
 * Compound member: standalone surface that renders one filter chip per filter target — every
 * filterable column, then every field from `filtering.fields`.
 *
 * Each chip shows `{label}: {value or "Any"}`. Clicking the chip opens a kit-provided popover whose
 * body is the regular filter input (the same `renderFilterInput` a column's header uses).
 *
 * Mounted wherever a layout puts it. For the panel to be the grid's *only* filter UI, expand the
 * table down to `<DataGrid.HeaderCell>` and render everything but its `filter`. Left beside the
 * built-in header cell, the two are simply two controls on one `columnFilters` entry.
 */
export function FilterPanel({ children }: DataGridFilterPanelProps = {}) {
	const { FilterPanel: FilterPanelChrome, FilterPanelChip } = useGridComponents().filtering
	const resolved = useFilters()
	if (resolved === undefined) return null

	const { filters, hasActiveFilter } = resolved

	if (children !== undefined) {
		return typeof children === 'function' ? children(resolved) : children
	}

	const chips = filters.map(({ id, label, valueDisplay, hasValue, input, onClear }) => (
		<FilterPanelChip
			key={id}
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
