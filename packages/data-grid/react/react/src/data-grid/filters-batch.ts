import { isEmptyOperatorValue, OperatorInput } from '@ez-kit/data-grid-core'

import { inputOf } from './operator-input'

import type { OperatorFilterModel } from './filter-model'
import type { FilterOperatorDef, StructuredFilterValue } from '@ez-kit/data-grid-core'
import type { ColumnFiltersState } from '@tanstack/table-core'

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * A filter panel's whole value: one structured filter per filter target with operators — column or
 * field — keyed by its id. A target the value does not name has no filter.
 */
export type FiltersValue = Record<string, StructuredFilterValue | undefined>

/**
 * Whether a structured filter states nothing to filter by — no value, an empty string, an empty
 * set, or a range with neither bound — for an operator that takes a value.
 *
 * Core's operator `autoRemove` deliberately keeps such an entry while an operator is selected,
 * which is right for a header control the user is still filling in and wrong for a panel that
 * applies a finished value: an empty pinned filter would reach `filtering.onChange` and the
 * server as a filter. So a batch write drops them itself.
 *
 * Read by the operator's `input`, the rule core's row filter applies. An id the target does not
 * offer — a value restored from a link made against another set — is judged by its shape alone:
 * blank, an empty set, or an object with neither bound is dropped; any other value is kept, as the
 * row filter keeps it.
 */
export function isEmptyFilterValue(filter: StructuredFilterValue, operators: FilterOperatorDef[]): boolean {
	const input = inputOf(operators, filter.operator)
	if (input !== undefined) return isEmptyOperatorValue(input, filter.value)
	const { value } = filter
	const isRange = typeof value === 'object' && value !== null && !Array.isArray(value)
	return isEmptyOperatorValue(isRange ? OperatorInput.Range : OperatorInput.Single, value)
}

/** The panel's value read off the grid: every target with operators that currently holds a filter. */
export function readFiltersValue(models: OperatorFilterModel[]): Record<string, StructuredFilterValue> {
	const value: Record<string, StructuredFilterValue> = {}
	for (const model of models) {
		if (model.value !== undefined) value[model.id] = model.value
	}
	return value
}

function warnUnknownKeys(next: FiltersValue, models: ReadonlyMap<string, OperatorFilterModel>): void {
	if (!IS_DEV) return
	for (const key of Object.keys(next)) {
		if (models.has(key)) continue
		console.warn(
			`[data-grid] A filter panel wrote a filter for "${key}", which names no filterable column or ` +
				'field with operators, so it was ignored. A filter without operators is written through its own ' +
				'`filter.setValue`, and a field is offered only under `filtering.manual: true`.',
		)
	}
}

/**
 * The next `columnFilters` for a panel that writes `next` as its whole value.
 *
 * Every target with operators the panel shows — column or field — takes its entry from `next`, or
 * loses it when `next` does not name it; an empty value counts as not named. Every other entry — a
 * plain filter on a column without operators above all — is kept as it was. Existing entries keep their
 * position, so re-applying an unchanged value produces an equal array.
 */
export function applyFiltersValue(
	prev: ColumnFiltersState,
	next: FiltersValue,
	models: ReadonlyMap<string, OperatorFilterModel>,
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
