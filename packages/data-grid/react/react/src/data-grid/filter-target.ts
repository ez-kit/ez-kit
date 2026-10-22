import { rowItemOf } from '../items-source/resolve-item'
import { filtersRows } from '../utils/filters-rows'

import type { ItemsLists, ListItem } from '../items-source'
import type { DataTable, GridFeatures } from '../types'
import type { ColumnCellMeta, ColumnFilteringMeta, FormColumnMeta, ResolvedFilterField } from '@ez-kit/data-grid-core'
import type { Column, ColumnFiltersState } from '@tanstack/table-core'

/**
 * What a filter target stands for: a column of the grid, or a table-level filter field.
 *
 * Named members for internal reference; the discriminant is typed as the union, so a consumer
 * narrows with `source.kind === 'column'` and needs no import.
 */
export const FilterSourceKind = {
	/** A filterable column of the grid. */
	Column: 'column',
	/** A field from `filtering.fields` — filtered on the server, never shown as a column. */
	Field: 'field',
} as const

export type FilterSourceKind = (typeof FilterSourceKind)[keyof typeof FilterSourceKind]

/**
 * Where a filter comes from. A column hands over the column itself; a field has nothing more to
 * hand over than its target already carries.
 */
export type FilterSource =
	| { kind: typeof FilterSourceKind.Column; column: Column<GridFeatures, object> }
	| { kind: typeof FilterSourceKind.Field }

/** The two pieces of a column's meta a filter reads — a field carries the same two. */
export type FilterTargetMeta = {
	cell?: ColumnCellMeta | undefined
	filtering?: ColumnFilteringMeta | undefined
}

/**
 * One thing the grid filters by, whether a column or a field — the single abstraction the filter
 * model, the controls, the chips and the panel's batch write all work through.
 *
 * Internal: a consumer sees `DataGridFilterTarget`, which writes through `filter.setValue` and
 * never through `setValue` here.
 */
export type FilterTarget = {
	/** The `columnFilters` key — the column id or the field id. */
	id: string
	/** The column's string header (falling back to its id), or the field's `header`. */
	label: string
	meta: FilterTargetMeta
	getValue: () => unknown
	setValue: (next: unknown) => void
	/** The column's faceted unique values. A field has no rows of its own, so it has none. */
	facetedValues?: () => Map<unknown, number> | undefined
	/**
	 * `value → cell.config.getItem(row)` over the column's faceted rows, for each value the first
	 * row that has it — what labels a faceted value with no list behind it. `undefined` when the
	 * column has no `getItem` or is not faceted, and always for a field.
	 */
	facetedIndex?: () => ReadonlyMap<string, ListItem> | undefined
	/**
	 * The target's value lists as a component already read them — the values on offer, and the one
	 * that labels them. Set by the component that subscribed; without it, the filter model reads a
	 * fixed list straight off the meta and a hook list as still loading.
	 */
	lists?: ItemsLists
	source: FilterSource
}

/**
 * The column's resolved `filtering` meta, or `undefined` when it has none or turned it off.
 *
 * `ColumnMeta` is declared `in out` upstream, so no concrete instantiation is assignable to any
 * other and the cast is forced by the variance annotation rather than chosen.
 */
export function filteringMetaOf<TRow extends object>(column: Column<GridFeatures, TRow>) {
	const meta = column.columnDef.meta as FormColumnMeta | undefined
	return { meta, filteringMeta: meta?.filtering === false ? undefined : meta?.filtering }
}

/** The column's string header, falling back to its id. */
export function columnLabel<TRow extends object>(column: Column<GridFeatures, TRow>): string {
	const header = column.columnDef.header
	return typeof header === 'string' ? header : column.id
}

type FacetedRows = readonly { original: unknown; getValue: (columnId: string) => unknown }[]

type CachedIndex = { getItem: (row: unknown) => ListItem | undefined; index: Map<string, ListItem> }

/**
 * Per rows array, then per column. Not the array alone: with no filter applied TanStack hands every
 * column the same pre-filtered rows, so an array-keyed cache would give the second column the
 * first one's labels.
 */
const facetedIndexes = new WeakMap<FacetedRows, Map<string, CachedIndex>>()

/**
 * The index behind {@link FilterTarget.facetedIndex}, rebuilt with the faceted row model or a new
 * `getItem` and only then: it is a function of those, so there is nothing else to invalidate.
 */
function facetedIndexOf(
	rows: FacetedRows,
	columnId: string,
	getItem: (row: unknown) => ListItem | undefined,
): Map<string, ListItem> {
	let byColumn = facetedIndexes.get(rows)
	if (!byColumn) {
		byColumn = new Map()
		facetedIndexes.set(rows, byColumn)
	}
	const known = byColumn.get(columnId)
	if (known?.getItem === getItem) return known.index
	const index = new Map<string, ListItem>()
	for (const row of rows) {
		const raw = row.getValue(columnId)
		if (raw === undefined || raw === null || raw === '') continue
		const value = String(raw)
		if (index.has(value)) continue
		const item = rowItemOf(getItem, row.original)
		if (item) index.set(value, item)
	}
	byColumn.set(columnId, { getItem, index })
	return index
}

/** The filter target of a column, read and written through the column itself. */
export function columnFilterTarget<TRow extends object>(column: Column<GridFeatures, TRow>): FilterTarget {
	const { meta, filteringMeta } = filteringMetaOf(column)
	const getItem = meta?.cell?.getItem
	return {
		id: column.id,
		label: columnLabel(column),
		meta: { cell: meta?.cell, filtering: filteringMeta },
		getValue: () => column.getFilterValue(),
		setValue: (next) => {
			column.setFilterValue(next)
		},
		facetedValues: () => column.getFacetedUniqueValues() as Map<unknown, number> | undefined,
		...(getItem !== undefined && filteringMeta?.faceted === true
			? {
					facetedIndex: () => {
						// Optional-called: the faceted row model is `columnFacetingFeature`'s, which a feature
						// set may leave out — and then there is simply no index.
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature API; see the FEATURE GUARDS note in types.ts
						const rows = column.getFacetedRowModel?.().rows as FacetedRows | undefined
						return rows ? facetedIndexOf(rows, column.id, getItem) : undefined
					},
				}
			: {}),
		// Row-erased, like every other reader of the column outside the generic grid.
		source: { kind: FilterSourceKind.Column, column: column as unknown as Column<GridFeatures, object> },
	}
}

/**
 * Whether a field's value states no filter, so its entry is removed rather than kept.
 *
 * The values a column's own filter function auto-removes: no value, an empty string, an empty set.
 * An operator value is kept even with nothing typed yet — core's operator `autoRemove` keeps a
 * column's entry while an operator is selected, and a field's control behaves the same.
 */
function isEmptyFieldValue(value: unknown): boolean {
	return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

/**
 * `columnFilters` with one entry replaced, or removed when `value` states no filter. A replaced
 * entry keeps its position, so the rest of the slice — and every column filter in it — is untouched.
 */
export function withFilterEntry(prev: ColumnFiltersState, id: string, value: unknown): ColumnFiltersState {
	if (isEmptyFieldValue(value)) return prev.filter((entry) => entry.id !== id)
	const index = prev.findIndex((entry) => entry.id === id)
	if (index === -1) return [...prev, { id, value }]
	return prev.map((entry, i) => (i === index ? { id, value } : entry))
}

/**
 * The filter target of a table-level field. There is no column to go through, so it reads its
 * entry off `columnFilters` and writes it with one `setColumnFilters` — the same state change a
 * column's own write makes, so `filtering.onChange` and the draft see nothing different.
 */
export function fieldFilterTarget<TRow extends object>(
	field: ResolvedFilterField,
	table: DataTable<GridFeatures, TRow>,
): FilterTarget {
	return {
		id: field.id,
		label: field.label,
		meta: { cell: field.cell, filtering: field.filtering },
		// The read `column.getFilterValue()` makes, minus the column. Optional-chained like upstream's:
		// the atom is `columnFilteringFeature`'s, which a feature set may leave out.
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
		getValue: () => table.atoms.columnFilters?.get().find((entry) => entry.id === field.id)?.value,
		// Optional-called for the same reason as the read: without `columnFilteringFeature` the write
		// is a no-op, which core's development warning for `filtering` already reports.
		setValue: (next) => {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature API; see the FEATURE GUARDS note in types.ts
			table.setColumnFilters?.((prev) => withFilterEntry(prev, field.id, next))
		},
		source: { kind: FilterSourceKind.Field },
	}
}

/** A column the filter surfaces offer: not a system column, not switched off, and filterable. */
function isFilterableColumn<TRow extends object>(column: Column<GridFeatures, TRow>): boolean {
	const { meta } = filteringMetaOf(column)
	if (meta?.isSystemColumn) return false
	if (meta?.filtering === false) return false
	return column.getCanFilter()
}

/**
 * Every filter target of the grid, in the one order every surface shows them: the filterable
 * columns in column order, then the fields in the order they were declared.
 *
 * Empty when the grid filters nothing at all. The fields are already absent unless the table
 * filters on the server — core drops them otherwise.
 */
export function collectFilterTargets<TRow extends object>(table: DataTable<GridFeatures, TRow>): FilterTarget[] {
	if (!filtersRows(table)) return []
	const columns = table.getAllLeafColumns().filter(isFilterableColumn).map(columnFilterTarget)
	const fields = table.grid.filtering.fields.map((field) => fieldFilterTarget(field, table))
	return [...columns, ...fields]
}
