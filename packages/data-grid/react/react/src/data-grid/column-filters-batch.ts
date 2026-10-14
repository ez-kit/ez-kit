import type { OperatorColumnFilterModel } from './column-filter-model'
import type { FilterOperatorDef, StructuredFilterValue } from '@ez-kit/data-grid-core'
import type { ColumnFiltersState } from '@tanstack/table-core'

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * A filter panel's whole value: one structured filter per operator column, keyed by column id.
 * A column the value does not name has no filter.
 */
export type ColumnFiltersValue = Record<string, StructuredFilterValue | undefined>

function isBlank(value: unknown): boolean {
	return value === undefined || value === null || value === ''
}

/**
 * Whether a structured filter states nothing to filter by — no value, an empty string, an empty
 * set, or a range with neither bound — for an operator that takes one.
 *
 * Core's operator `autoRemove` deliberately keeps such an entry while an operator is selected,
 * which is right for a header control the user is still filling in and wrong for a panel that
 * applies a finished value: an empty pinned filter would reach `filtering.onChange` and the
 * server as a filter. So a batch write drops them itself.
 */
export function isEmptyFilterValue(filter: StructuredFilterValue, operators: FilterOperatorDef[]): boolean {
	if (operators.find((op) => op.id === filter.operator)?.requiresInput === false) return false
	const { value } = filter
	if (isBlank(value)) return true
	if (Array.isArray(value)) return value.length === 0
	if (typeof value === 'object') {
		const { from, to } = value as { from?: unknown; to?: unknown }
		return isBlank(from) && isBlank(to)
	}
	return false
}

/** The panel's value read off the grid: every operator column that currently holds a filter. */
export function readColumnFiltersValue(models: OperatorColumnFilterModel[]): Record<string, StructuredFilterValue> {
	const value: Record<string, StructuredFilterValue> = {}
	for (const model of models) {
		if (model.value !== undefined) value[model.columnId] = model.value
	}
	return value
}

function warnUnknownKeys(next: ColumnFiltersValue, models: ReadonlyMap<string, OperatorColumnFilterModel>): void {
	if (!IS_DEV) return
	for (const key of Object.keys(next)) {
		if (models.has(key)) continue
		console.warn(
			`[data-grid] A filter panel wrote a filter for "${key}", which names no filterable column ` +
				'with operators, so it was ignored. A column without operators is written through its own ' +
				'`filter.setValue`.',
		)
	}
}

/**
 * The next `columnFilters` for a panel that writes `next` as its whole value.
 *
 * Every operator column the panel shows takes its entry from `next`, or loses it when `next` does
 * not name it; an empty value counts as not named. Entries of every other column — a plain filter
 * on a column without operators above all — are kept as they were. Existing entries keep their
 * position, so re-applying an unchanged value produces an equal array.
 */
export function applyColumnFiltersValue(
	prev: ColumnFiltersState,
	next: ColumnFiltersValue,
	models: ReadonlyMap<string, OperatorColumnFilterModel>,
): ColumnFiltersState {
	warnUnknownKeys(next, models)
	const written = new Map<string, StructuredFilterValue>()
	for (const [id, model] of models) {
		const filter = next[id]
		if (filter !== undefined && !isEmptyFilterValue(filter, model.operators)) written.set(id, filter)
	}

	const result: ColumnFiltersState = []
	for (const entry of prev) {
		if (!models.has(entry.id)) {
			result.push(entry)
			continue
		}
		const filter = written.get(entry.id)
		if (filter !== undefined) {
			result.push({ id: entry.id, value: filter })
			written.delete(entry.id)
		}
	}
	for (const [id, filter] of written) result.push({ id, value: filter })
	return result
}
