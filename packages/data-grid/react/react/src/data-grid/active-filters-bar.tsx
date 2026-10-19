import { localizeOperators } from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'
import { ItemsSourceSlot, resolveItem, useItemsListsFor } from '../items-source'
import { FilterChipKind, FilterChipsPosition } from '../types'

import { collectFilterTargets, columnFilterTarget } from './filter-target'
import { useDataGridState, useDataGridTable } from './table-context'

import type { ItemsMeta, ListSnapshot } from '../items-source'
import type { FilterTarget } from './filter-target'
import type { FilterOperatorDef } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

/**
 * Where the strip sits when the prop names nothing — the common case, a strip between the
 * toolbar and the table.
 *
 * This component's own constant, deliberately not an entry in `DATA_GRID_DEFAULTS`: that table
 * is keyed by the **option path** it defaults, and `filtering.chips` is not an option any more.
 * Reading it from there would leave the component depending on the grid's config for a value
 * that is now purely its own.
 */
const DEFAULT_CHIPS_POSITION = FilterChipsPosition.Above

const NO_META: ItemsMeta = {}

export type DataGridActiveFiltersBarProps = {
	/**
	 * Which side of the table the strip reports itself on, as `data-chip-position`. Default:
	 * `'above'`.
	 *
	 * Document order already says where the strip *is* — a layout writes it above or below
	 * `<DataGrid.Table/>`. This says which way the margin points, which is the one thing a
	 * stylesheet cannot read off the position: both kits rule on
	 * `[data-slot='active-filters-bar'][data-chip-position='…']`.
	 */
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

/** Turns one filter value into the text a chip shows — its label from the column's list, or itself. */
type LabelOf = (value: unknown) => string

function renderInnerValue(v: unknown, labelOf: LabelOf): ReactNode {
	if (Array.isArray(v)) {
		if (v.length === 0) return null
		if (v.length === 1) return labelOf(v[0])
		return `${String(v.length)} selected`
	}
	if (isBetweenValue(v)) {
		const { from, to } = v
		return `${formatPrimitive(from)} – ${formatPrimitive(to)}`
	}
	const s = labelOf(v)
	return s === '' ? null : s
}

function renderValueDisplay(rawValue: unknown, labelOf: LabelOf, operators?: FilterOperatorDef[]): ReactNode {
	if (isStructuredFilterValue(rawValue)) {
		const op = operators?.find((o) => o.id === rawValue.operator)
		const indicator = op?.label ?? rawValue.operator
		if (op?.requiresInput === false) return indicator
		const inner = renderInnerValue(rawValue.value, labelOf)
		if (inner == null) return indicator
		return `${indicator} ${typeof inner === 'string' ? inner : ''}`.trim()
	}
	return renderInnerValue(rawValue, labelOf)
}

/**
 * A chip's labeller for one target: the value's label from the list that labels it (the base, else
 * the filter's own), then from the faceted rows' `getItem`, else the value as it is.
 */
function labellerOf(target: FilterTarget, labels: ListSnapshot | undefined): LabelOf {
	const facetedIndex = target.facetedIndex?.()
	return (value) => {
		const primitive = formatPrimitive(value)
		if (value instanceof Date) return primitive
		return resolveItem(value, { labels, facetedIndex }).item?.label ?? primitive
	}
}

/** Reference-and-value comparison good enough to detect a pending filter draft. */
function sameFilterValue(a: unknown, b: unknown): boolean {
	if (a === b) return true
	return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

/**
 * Compound member: strip with removable chips for every active filter.
 *
 * Placed by a layout — above or below `<DataGrid.Table/>`, which is what the `filtering.chips`
 * option used to decide. Renders nothing when no filter is active.
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

	const position: FilterChipsPosition = positionProp ?? DEFAULT_CHIPS_POSITION
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

	// Chips are built per filter target, so a field's entry gets one too. An entry no target names is
	// still a column's when the column exists — a filter seeded on a column the surfaces do not offer
	// keeps the chip it always had — and is otherwise skipped, as an entry of a removed column was.
	const targets = new Map(collectFilterTargets(table).map((target) => [target.id, target]))
	const activeTargets = columnFilters.map((cf) => {
		const column = targets.has(cf.id) ? undefined : table.getColumn(cf.id)
		return targets.get(cf.id) ?? (column ? columnFilterTarget(column) : undefined)
	})
	// Only the filters that are set have a chip, so only their lists are read — and only the one
	// that labels a value: a chip offers nothing.
	const lists = useItemsListsFor(
		activeTargets.map((target, i) => ({
			id: target?.id ?? columnFilters[i]?.id ?? '',
			meta: target?.meta ?? NO_META,
			slot: ItemsSourceSlot.Filtering,
		})),
	)

	columnFilters.forEach((cf, index) => {
		const target = activeTargets[index]
		if (!target) return
		const rawOperators = target.meta.filtering?.operators
		// Chips name the operator, so they read it through the dictionary like the control does.
		const operators = rawOperators
			? localizeOperators(rawOperators, target.meta.cell?.type, table.grid.messages.operators)
			: undefined
		const display = renderValueDisplay(cf.value, labellerOf(target, lists[index]?.labels), operators)
		if (display == null || display === '') return
		// Optional-chained. `s.applied` is `draftFeature`'s slice, and the two *uses* below are
		// guarded by `isDrafting` — but this dereference runs before either, so a chips strip on a
		// grid without `draft` threw here rather than reaching the guard that was meant to cover it.
		// Under v8 the slice existed regardless; under v9 it is absent.
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
		const appliedFilter = applied?.columnFilters.find((a) => a.id === cf.id)
		chips.push({
			key: `column:${cf.id}`,
			label: target.label,
			value: display,
			onRemove: () => {
				target.setValue(undefined)
			},
			// A field's chip is a `columnFilters` entry like a column's — `kind` tells that slice from
			// global search, which is the difference the kits style.
			kind: FilterChipKind.Column,
			isDraft: isDrafting && !sameFilterValue(appliedFilter?.value, cf.value),
		})
	})

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
