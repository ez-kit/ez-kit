import { localizeOperators } from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'
import { DATA_GRID_DEFAULTS } from '../defaults'
import { FilterChipKind } from '../types'

import { useDataGridState, useDataGridTable } from './table-context'

import type { GridFeatures } from '../types'
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

function columnLabel<TRow extends object>(column: Column<GridFeatures, TRow>): string {
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
	// The subscriptions *are* the reads: v8's whole-snapshot `getState()` is gone, and the value each
	// hook already returns is the same slice the body wants. Keeping the subscription and
	// re-reading a snapshot beside it was two spellings of one value even under v8.
	const columnFilters = useDataGridState((s) => s.columnFilters)
	const globalFilter = useDataGridState((s) => s.globalFilter as unknown)
	const applied = useDataGridState((s) => s.applied)
	const { FilterChip } = useGridComponents().filtering

	const cfg = table.grid.filtering.chips

	const position: FilterChipsPosition = positionProp ?? cfg?.position ?? DATA_GRID_DEFAULTS.filtering.chips.position
	const isDrafting = table.options.draft === true

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
		const filteringMeta = column.columnDef.meta?.filtering
		const rawOperators = filteringMeta === false ? undefined : filteringMeta?.operators
		// Chips name the operator, so they read it through the dictionary like the control does.
		const operators = rawOperators
			? localizeOperators(rawOperators, column.columnDef.meta?.cell?.type, table.grid.messages.operators)
			: undefined
		const display = renderValueDisplay(cf.value, operators)
		if (display == null || display === '') continue
		// Optional-chained. `s.applied` is `draftFeature`'s slice, and the two *uses* below are
		// guarded by `isDrafting` — but this dereference runs before either, so a chips strip on a
		// grid without `draft` threw here rather than reaching the guard that was meant to cover it.
		// Under v8 the slice existed regardless; under v9 it is absent.
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
		const appliedFilter = applied?.columnFilters.find((a) => a.id === cf.id)
		chips.push({
			key: `column:${cf.id}`,
			label: columnLabel(column),
			value: display,
			onRemove: () => {
				column.setFilterValue(undefined)
			},
			kind: FilterChipKind.Column,
			isDraft: isDrafting && !sameFilterValue(appliedFilter?.value, cf.value),
		})
	}

	if (typeof globalFilter === 'string' && globalFilter.length > 0) {
		chips.push({
			key: 'global',
			label: table.grid.messages.globalFiltering.label,
			value: globalFilter,
			onRemove: () => {
				table.setGlobalFilter(undefined)
			},
			kind: FilterChipKind.Global,
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
			isDraft: isDrafting && !sameFilterValue(applied?.globalFilter, globalFilter),
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
