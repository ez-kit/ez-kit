import { useGridComponents } from '../components-context'
import { DATA_GRID_DEFAULTS } from '../defaults'
import { FilterChipKind } from '../types'

import { useDataGridState, useDataGridTable } from './table-context'

import type { FilterChipsPosition } from '../use-data-grid'
import type { FilterOperatorDef } from '@ez-kit/data-grid-core'
import type { Column } from '@tanstack/table-core'
import type { ReactNode } from 'react'

export type DataGridActiveFiltersBarProps = {
	/** Override the position data attribute. Defaults to the auto-mount config or `'above'`. */
	position?: FilterChipsPosition
}

function isStructuredFilterValue(v: unknown): v is { operator: string; value: unknown } {
	return typeof v === 'object' && v !== null && 'operator' in v && typeof v.operator === 'string'
}

function isBetweenValue(v: unknown): v is { from?: unknown; to?: unknown } {
	return typeof v === 'object' && v !== null && ('from' in v || 'to' in v)
}

function formatPrimitive(v: unknown): string {
	if (v == null) return ''
	if (v instanceof Date) return v.toISOString().slice(0, 10)
	return String(v)
}

function renderInnerValue(v: unknown): ReactNode {
	if (Array.isArray(v)) {
		if (v.length === 0) return null
		if (v.length === 1) return formatPrimitive(v[0])
		return `${String(v.length)} selected`
	}
	if (isBetweenValue(v)) {
		const { from, to } = v
		return `${formatPrimitive(from)} – ${formatPrimitive(to)}`
	}
	const s = formatPrimitive(v)
	return s === '' ? null : s
}

function renderValueDisplay(rawValue: unknown, operators?: FilterOperatorDef[]): ReactNode {
	if (isStructuredFilterValue(rawValue)) {
		const op = operators?.find((o) => o.id === rawValue.operator)
		const indicator = op?.label ?? rawValue.operator
		if (op?.requiresInput === false) return indicator
		const inner = renderInnerValue(rawValue.value)
		if (inner == null) return indicator
		return `${indicator} ${typeof inner === 'string' ? inner : ''}`.trim()
	}
	return renderInnerValue(rawValue)
}

/** Reference-and-value comparison good enough to detect a pending filter draft. */
function sameFilterValue(a: unknown, b: unknown): boolean {
	if (a === b) return true
	return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function columnLabel(column: Column<any>): string {
	const header = column.columnDef.header
	if (typeof header === 'string') return header
	return column.id
}

/**
 * Compound member: strip with removable chips for every active filter.
 *
 * Auto-mounted by `<DataGrid>` when `filtering.chips` is truthy. Can also be
 * placed manually in custom layouts via `<DataGrid.ActiveFiltersBar />`.
 *
 * Renders nothing when no filter is active. Reads chips position from
 * {@link FILTER_CHIPS_KEY} unless overridden via the `position` prop.
 */
export function ActiveFiltersBar({ position: positionProp }: DataGridActiveFiltersBarProps = {}) {
	const table = useDataGridTable()
	useDataGridState((s) => s.columnFilters)
	useDataGridState((s) => s.globalFilter as unknown)
	useDataGridState((s) => s.applied)
	const { FilterChip } = useGridComponents().filtering

	const cfg = table.grid.filtering.chips

	const position: FilterChipsPosition = positionProp ?? cfg?.position ?? DATA_GRID_DEFAULTS.filtering.chips.position
	const columnFilters = table.getState().columnFilters
	const globalFilter = table.getState().globalFilter as unknown
	const deferredApply = table.options.deferredApply === true
	const applied = table.getState().applied

	type ChipDescriptor = {
		key: string
		label: string
		value: ReactNode
		onRemove: () => void
		kind: FilterChipKind
		isDraft: boolean
	}

	const chips: ChipDescriptor[] = []

	for (const cf of columnFilters) {
		const column = table.getColumn(cf.id)
		if (!column) continue
		const operators = (column.columnDef.meta as { resolvedOperators?: FilterOperatorDef[] } | undefined)
			?.resolvedOperators
		const display = renderValueDisplay(cf.value, operators)
		if (display == null || display === '') continue
		const appliedFilter = applied.columnFilters.find((a) => a.id === cf.id)
		chips.push({
			key: `column:${cf.id}`,
			label: columnLabel(column),
			value: display,
			onRemove: () => {
				column.setFilterValue(undefined)
			},
			kind: FilterChipKind.Column,
			isDraft: deferredApply && !sameFilterValue(appliedFilter?.value, cf.value),
		})
	}

	if (typeof globalFilter === 'string' && globalFilter.length > 0) {
		chips.push({
			key: 'global',
			label: 'Search',
			value: globalFilter,
			onRemove: () => {
				table.setGlobalFilter(undefined)
			},
			kind: FilterChipKind.Global,
			isDraft: deferredApply && !sameFilterValue(applied.globalFilter, globalFilter),
		})
	}

	if (chips.length === 0) return null

	return (
		<div
			data-slot='active-filters-bar'
			data-chip-position={position}
		>
			{chips.map((c) => (
				<FilterChip
					key={c.key}
					label={c.label}
					value={c.value}
					onRemove={c.onRemove}
					kind={c.kind}
					isDraft={c.isDraft}
				/>
			))}
		</div>
	)
}
