import { liftItemsSource } from '../column/map-columns/items-source'
import { FilterSubject, resolveFiltering } from '../column/map-columns/resolve-filtering'

import type { ResolveFilteringOptions } from '../column/map-columns/resolve-filtering'
import type { ColumnCellMeta, FilterFieldDef, MappedColumnDef, ResolvedFilterField } from '../column/types'

const IS_DEV = process.env.NODE_ENV !== 'production'

const DEFAULT_FIELD_CELL_TYPE = 'text'

/** The part of a mapped column whose id this module reads, at any depth of the column tree. */
type ColumnIdSource = Pick<MappedColumnDef<object>, 'id'> & {
	accessorKey?: unknown
	columns?: ColumnIdSource[]
}

/** Every id the table's columns claim — groups, leaves and system columns alike. */
function collectColumnIds(columns: readonly ColumnIdSource[], into: Set<string>): Set<string> {
	for (const column of columns) {
		const id = column.id ?? (typeof column.accessorKey === 'string' ? column.accessorKey : undefined)
		if (id !== undefined) into.add(id)
		if (column.columns) collectColumnIds(column.columns, into)
	}
	return into
}

/**
 * Throws on a field id that repeats a column's or another field's.
 *
 * Both write the same `columnFilters` entry, so a collision is two filters silently sharing one
 * value — worse than failing. A deterministic configuration error, thrown in every build, the way
 * a column without an id already fails.
 */
function assertUniqueFieldIds(fields: readonly FilterFieldDef[], columns: readonly ColumnIdSource[]): void {
	const columnIds = collectColumnIds(columns, new Set())
	const fieldIds = new Set<string>()
	for (const { id } of fields) {
		if (columnIds.has(id)) {
			throw new Error(
				`[data-grid] \`filtering.fields\` declares "${id}", which is already a column id. A field and a ` +
					'column with one id would write the same `columnFilters` entry — rename the field.',
			)
		}
		if (fieldIds.has(id)) {
			throw new Error(`[data-grid] \`filtering.fields\` declares "${id}" more than once. Field ids must be unique.`)
		}
		fieldIds.add(id)
	}
}

function resolveFieldCell(id: string, cell: FilterFieldDef['cell']): ColumnCellMeta {
	if (cell === undefined) return { type: DEFAULT_FIELD_CELL_TYPE }
	if (typeof cell === 'string') return { type: cell }
	// Forwarded as written, exactly as `mapColumns` forwards a column's `cell.config`: the declared
	// shape is the cell type's business, and the meta is row-erased. A list hook is lifted out of
	// it the same way, too — a field has no rows, so `getItem` never applies and is simply dropped
	// with it by the readers.
	if (cell.config === undefined) return { type: cell.type }
	const cellMeta: ColumnCellMeta = { type: cell.type, config: cell.config as Record<string, unknown> }
	return liftItemsSource(cellMeta, `${FilterSubject.Field} "${id}"`)
}

function resolveField(field: FilterFieldDef, options: ResolveFilteringOptions): ResolvedFilterField {
	const cell = resolveFieldCell(field.id, field.cell)
	// `faceted` is forced off: facets count the rows' values, and a field has no column of data.
	// The operator dispatcher is dropped — under `manual` nothing calls it.
	const { meta } = resolveFiltering(field.id, field.filtering, cell.type, {
		...options,
		tableFaceted: false,
		subject: FilterSubject.Field,
	})
	return { id: field.id, label: field.header, cell, filtering: meta === false ? undefined : meta }
}

/**
 * The table's `filtering.fields`, checked and resolved for the React layer.
 *
 * Ids are checked against every column — system ones included — whatever the mode. The fields are
 * then offered only under `manual: true`: the server is what filters by them, and the grid has no
 * row value to compare one against. Without it the result is empty and development builds warn
 * once, rather than throwing — `manual` may come from a defaults layer, and server filtering
 * switched off for a while should not take the page down.
 */
export function resolveFilterFields(
	fields: readonly FilterFieldDef[] | undefined,
	columns: readonly ColumnIdSource[],
	manual: boolean,
	options: ResolveFilteringOptions,
): ResolvedFilterField[] {
	if (fields === undefined || fields.length === 0) return []
	assertUniqueFieldIds(fields, columns)
	if (!manual) {
		if (IS_DEV) {
			console.warn(
				'[data-grid] `filtering.fields` is set, but `filtering.manual` is not `true`, so the fields are not ' +
					'offered. A field has no column of data to filter rows by — the server filters by it.',
			)
		}
		return []
	}
	return fields.map((field) => resolveField(field, options))
}
