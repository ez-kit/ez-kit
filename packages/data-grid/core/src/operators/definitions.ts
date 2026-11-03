import type { FilterOperator } from './ids'
import type { FilterOperatorDef } from '../features/operators/operators'

/**
 * A definition of the ready-made set: a {@link FilterOperatorDef} whose id is one of
 * {@link FilterOperator}'s, so a misspelt id is a compile error even though it is written as a
 * literal.
 */
type ReadyMadeOperator<TValue = unknown> = FilterOperatorDef<TValue> & { id: FilterOperator }

/*
 * The definitions of the ready-made set, one constant each.
 *
 * Each is a plain object literal of literals, and every list in `default-operators.ts` names its
 * members one by one. Nothing at the top level of this entry reads a property or spreads: esbuild
 * keeps an object literal that does either, because a property read may hit a getter and a spread
 * may run one, and it keeps everything that object names with it. Measured: a definition written
 * `id: FilterOperator.Contains, input: OperatorInput.Single` survived a bundle that imported only
 * `FilterOperator`, and carried every comparison below along. So the ids and inputs are written
 * as literals — checked against {@link FilterOperator} and `OperatorInput` by the types, which is
 * what the named members were for.
 *
 * No definition carries a `label`: the wording is the grid's dictionary, `messages.operators`, read
 * at render. Reading it here would be the property read this entry cannot afford, and would also fix
 * the label to the English one. Where the wording differs from the id's common one — the date set's
 * "After", the boolean set's "Is" — the definition says which group to read with a literal `labels`.
 *
 * Where one id compares differently per cell type — equality on text ignores case, on a date it
 * compares date-only strings — each type gets a constant of its own under the shared id. They are
 * reachable only through `defaultOperators`; a project that wants one takes it from there.
 *
 * No `filterFn` here checks for an empty value: the grid never calls one with an empty value
 * unless its `input` is `none`.
 */

// ── Emptiness, shared by every cell type ───────────────────────────────────

export const isEmpty: ReadyMadeOperator = {
	id: 'isEmpty',
	input: 'none',
	filterFn: (rowValue) => rowValue == null || rowValue === '',
}

export const isNotEmpty: ReadyMadeOperator = {
	id: 'isNotEmpty',
	input: 'none',
	filterFn: (rowValue) => rowValue != null && rowValue !== '',
}

// ── Text ───────────────────────────────────────────────────────────────────

/**
 * A row value — or a filter value — as the lower-case string the text comparisons read. The filter
 * value goes through it too: one restored from a link is whatever the link held, and a number there
 * must compare as its digits rather than throw on `toLowerCase`.
 */
function lowerText(value: unknown): string {
	return String(value ?? '').toLowerCase()
}

export const textContains: ReadyMadeOperator<string> = {
	id: 'contains',
	input: 'single',
	filterFn: (rowValue, value) => rowValue != null && lowerText(rowValue).includes(lowerText(value)),
}

export const textEquals: ReadyMadeOperator<string> = {
	id: 'equals',
	input: 'single',
	filterFn: (rowValue, value) => lowerText(rowValue) === lowerText(value),
}

export const textNotEquals: ReadyMadeOperator<string> = {
	id: 'notEquals',
	input: 'single',
	filterFn: (rowValue, value) => lowerText(rowValue) !== lowerText(value),
}

export const textStartsWith: ReadyMadeOperator<string> = {
	id: 'startsWith',
	input: 'single',
	filterFn: (rowValue, value) => lowerText(rowValue).startsWith(lowerText(value)),
}

export const textEndsWith: ReadyMadeOperator<string> = {
	id: 'endsWith',
	input: 'single',
	filterFn: (rowValue, value) => lowerText(rowValue).endsWith(lowerText(value)),
}

// ── Number ─────────────────────────────────────────────────────────────────

/**
 * Whether a range bound states a number. One empty bound — `undefined`, `null` or `''`, whatever a
 * control or a link wrote — leaves that side of the range open rather than comparing against `0`.
 */
function hasNumberBound(bound: unknown): bound is number {
	return bound !== undefined && bound !== null && bound !== ''
}

export const numberEquals: ReadyMadeOperator<number> = {
	id: 'equals',
	input: 'single',
	filterFn: (rowValue, value) => Number(rowValue) === value,
}

export const numberNotEquals: ReadyMadeOperator<number> = {
	id: 'notEquals',
	input: 'single',
	filterFn: (rowValue, value) => Number(rowValue) !== value,
}

export const numberGreaterThan: ReadyMadeOperator<number> = {
	id: 'greaterThan',
	input: 'single',
	filterFn: (rowValue, value) => Number(rowValue) > value,
}

export const numberGreaterOrEqual: ReadyMadeOperator<number> = {
	id: 'greaterOrEqual',
	input: 'single',
	filterFn: (rowValue, value) => Number(rowValue) >= value,
}

export const numberLessThan: ReadyMadeOperator<number> = {
	id: 'lessThan',
	input: 'single',
	filterFn: (rowValue, value) => Number(rowValue) < value,
}

export const numberLessOrEqual: ReadyMadeOperator<number> = {
	id: 'lessOrEqual',
	input: 'single',
	filterFn: (rowValue, value) => Number(rowValue) <= value,
}

export const numberBetween: ReadyMadeOperator<number> = {
	id: 'between',
	input: 'range',
	filterFn: (rowValue, { from, to }) => {
		const n = Number(rowValue)
		if (hasNumberBound(from) && n < from) return false
		return !hasNumberBound(to) || n <= to
	},
}

// ── Date (ISO date-only strings, which order as dates) ─────────────────────

/** A row value as the string the date comparisons read. */
function dateText(rowValue: unknown): string {
	return String(rowValue ?? '')
}

/**
 * Whether a range bound states a date. One empty bound — `undefined`, `null` or `''`, whatever a
 * control or a link wrote — leaves that side of the range open.
 */
function hasBound(bound: unknown): bound is string {
	return bound !== undefined && bound !== null && bound !== ''
}

export const dateEquals: ReadyMadeOperator<string> = {
	id: 'equals',
	input: 'single',
	filterFn: (rowValue, value) => dateText(rowValue) === value,
}

export const dateNotEquals: ReadyMadeOperator<string> = {
	id: 'notEquals',
	input: 'single',
	filterFn: (rowValue, value) => dateText(rowValue) !== value,
}

export const dateGreaterThan: ReadyMadeOperator<string> = {
	id: 'greaterThan',
	labels: 'date',
	input: 'single',
	filterFn: (rowValue, value) => dateText(rowValue) > value,
}

export const dateGreaterOrEqual: ReadyMadeOperator<string> = {
	id: 'greaterOrEqual',
	labels: 'date',
	input: 'single',
	filterFn: (rowValue, value) => dateText(rowValue) >= value,
}

export const dateLessThan: ReadyMadeOperator<string> = {
	id: 'lessThan',
	labels: 'date',
	input: 'single',
	filterFn: (rowValue, value) => dateText(rowValue) < value,
}

export const dateLessOrEqual: ReadyMadeOperator<string> = {
	id: 'lessOrEqual',
	labels: 'date',
	input: 'single',
	filterFn: (rowValue, value) => dateText(rowValue) <= value,
}

export const dateBetween: ReadyMadeOperator<string> = {
	id: 'between',
	input: 'range',
	filterFn: (rowValue, { from, to }) => {
		const date = dateText(rowValue)
		if (hasBound(from) && date < from) return false
		return !hasBound(to) || date <= to
	},
}

// ── Boolean ────────────────────────────────────────────────────────────────

/** Coerces a filter value written as a checkbox state or as its string form. */
function toBoolean(value: unknown): boolean {
	return value === true || value === 'true'
}

export const booleanEquals: ReadyMadeOperator<boolean> = {
	id: 'equals',
	labels: 'boolean',
	input: 'single',
	filterFn: (rowValue, value) => Boolean(rowValue) === toBoolean(value),
}

export const booleanNotEquals: ReadyMadeOperator<boolean> = {
	id: 'notEquals',
	labels: 'boolean',
	input: 'single',
	filterFn: (rowValue, value) => Boolean(rowValue) !== toBoolean(value),
}

// ── Set membership (select / badge) ────────────────────────────────────────

/** A row value as the string a list of item values is compared against. */
function itemValue(rowValue: unknown): string {
	return rowValue == null ? '' : String(rowValue)
}

export const isAnyOf: ReadyMadeOperator<string> = {
	id: 'in',
	input: 'list',
	filterFn: (rowValue, values) => values.includes(itemValue(rowValue)),
}

export const isNoneOf: ReadyMadeOperator<string> = {
	id: 'notIn',
	input: 'list',
	filterFn: (rowValue, values) => !values.includes(itemValue(rowValue)),
}
