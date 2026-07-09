import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { DEFAULT_FILTER_DEBOUNCE_MS, FILTERING_DEBOUNCE_KEY } from '../use-data-grid'

import { renderFilterInput } from './render-filter-input'
import { useTable } from './table-context'

import type { BadgeItem, BetweenValue, SelectItem, StructuredFilterValue } from '@ez-kit/data-grid-core'
import type { ColumnMeta, Header } from '@tanstack/table-core'

const MAX_INLINE_VALUES = 2

function formatBetweenValue(value: BetweenValue): { display: string; hasValue: boolean } {
	const { from, to } = value
	const fromDefined = from !== undefined && from !== ''
	const toDefined = to !== undefined && to !== ''
	if (!fromDefined && !toDefined) return { display: 'Any', hasValue: false }
	if (fromDefined && toDefined) return { display: `${String(from)} – ${String(to)}`, hasValue: true }
	if (fromDefined) return { display: `≥ ${String(from)}`, hasValue: true }
	return { display: `≤ ${String(to)}`, hasValue: true }
}

function resolveOptionLabel(rawValue: string, meta: ColumnMeta<unknown, unknown> | undefined): string {
	const explicit = meta?.filteringOptions
	if (explicit) {
		const hit = explicit.find((o) => o.value === rawValue)
		if (hit) return hit.label
	}
	if (meta?.cellType === 'select' || meta?.cellType === 'badge') {
		const items = (meta.config as { items?: (SelectItem | BadgeItem)[] } | undefined)?.items
		const hit = items?.find((o) => o.value === rawValue)
		if (hit) return hit.label
	}
	return rawValue
}

function formatMultiValue(
	values: unknown[],
	meta: ColumnMeta<unknown, unknown> | undefined,
): { display: string; hasValue: boolean } {
	if (values.length === 0) return { display: 'Any', hasValue: false }
	const labels = values.map((v) => resolveOptionLabel(String(v), meta))
	if (labels.length <= MAX_INLINE_VALUES) return { display: labels.join(', '), hasValue: true }
	const inline = labels.slice(0, MAX_INLINE_VALUES).join(', ')
	return { display: `${inline} +${String(labels.length - MAX_INLINE_VALUES)}`, hasValue: true }
}

function formatFilterValue(
	filterValue: unknown,
	meta: ColumnMeta<unknown, unknown> | undefined,
): { display: string; hasValue: boolean } {
	if (filterValue == null || filterValue === '') return { display: 'Any', hasValue: false }

	if (typeof filterValue === 'object' && 'operator' in filterValue) {
		const sv = filterValue as StructuredFilterValue
		const op = meta?.resolvedOperators?.find((o) => o.id === sv.operator)
		const inner = sv.value

		// `requiresInput === false` operators (e.g. isEmpty / isNotEmpty) — show operator label.
		if (op?.requiresInput === false) {
			return { display: op.label, hasValue: true }
		}

		// Between value
		if (inner !== null && typeof inner === 'object' && ('from' in inner || 'to' in inner)) {
			return formatBetweenValue(inner)
		}

		// Multi value (in / notIn)
		if (Array.isArray(inner)) {
			return formatMultiValue(inner, meta)
		}

		// Plain inner value
		if (inner == null || inner === '') return { display: 'Any', hasValue: false }
		return { display: String(inner), hasValue: true }
	}

	// Plain (non-operator) filter value
	if (Array.isArray(filterValue)) return formatMultiValue(filterValue, meta)
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
export function FilterPanel() {
	const table = useTable()
	const gridComponents = useGridComponents()
	const { Input } = gridComponents.core
	const {
		OperatorSelect,
		BetweenInput,
		FilterPanel: FilterPanelChrome,
		FilterPanelChip,
		MultiSelectFilter,
	} = gridComponents.filtering
	const cellTypes = useCellTypes()
	const filteringDebounce =
		((table as unknown as Record<symbol, unknown>)[FILTERING_DEBOUNCE_KEY] as number | undefined) ??
		DEFAULT_FILTER_DEBOUNCE_MS

	const hasFiltering = Boolean(table.options.getFilteredRowModel)
	if (!hasFiltering) return null

	const filterableColumns = table.getAllLeafColumns().filter((column) => {
		const meta = column.columnDef.meta
		if (meta?.isSystemColumn) return false
		if (meta?.filtering === false) return false
		return column.getCanFilter()
	})

	if (filterableColumns.length === 0) return null

	const hasActiveFilter = filterableColumns.some((c) => c.getFilterValue() !== undefined)

	const chips = filterableColumns.map((column) => {
		const meta = column.columnDef.meta
		const headerDef = column.columnDef.header
		const label = typeof headerDef === 'string' ? headerDef : column.id
		const filterValue = column.getFilterValue()
		const { display, hasValue } = formatFilterValue(filterValue, meta)

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
		})

		const onClear = (): void => {
			column.setFilterValue(undefined)
		}

		return (
			<FilterPanelChip
				key={column.id}
				label={label}
				valueDisplay={display}
				hasValue={hasValue}
				onClear={onClear}
			>
				{input}
			</FilterPanelChip>
		)
	})

	return (
		<div data-slot='filter-panel'>
			<FilterPanelChrome hasActiveFilter={hasActiveFilter}>{chips}</FilterPanelChrome>
		</div>
	)
}
