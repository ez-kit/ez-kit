import {
	booleanEquals,
	booleanNotEquals,
	dateBetween,
	dateEquals,
	dateGreaterOrEqual,
	dateGreaterThan,
	dateLessOrEqual,
	dateLessThan,
	dateNotEquals,
	isAnyOf,
	isEmpty,
	isNoneOf,
	isNotEmpty,
	numberBetween,
	numberEquals,
	numberGreaterOrEqual,
	numberGreaterThan,
	numberLessOrEqual,
	numberLessThan,
	numberNotEquals,
	textContains,
	textEndsWith,
	textEquals,
	textNotEquals,
	textStartsWith,
} from './definitions'

import type { FilterOperator } from './ids'
import type { BaseCellTypes } from '../column/types'
import type { FilterOperatorDef, OperatorsConfig } from '../features/operators/operators'

/** The ready-made set's operators per built-in cell type, exhaustive over the built-ins. */
type DefaultOperatorsByType = Record<keyof BaseCellTypes, FilterOperatorDef[]>

/**
 * The ready-made operator set — what both kits' prebuilt `DataGrid` passes as `operators`, and what
 * a grid composed through `createDataGrid` gets only by naming it.
 *
 * Every built-in cell type has a set. `progress` filters as a number, `image` and `link` as text
 * and `badge` as `select`, so those share their definitions. Each list is written out member by member
 * rather than assembled with a spread — see `definitions.ts` for why.
 *
 * Written with literal ids rather than `FilterOperator` members for the reason `definitions.ts`
 * gives: this object is reachable from a bundle that imports only `FilterOperator`, and a property
 * read would keep it there.
 *
 * `defaultByType` states the opening operator of text, image and link (`contains`) and of select and
 * badge (`in`). Each is also first in its list, so the entries restate the order — they are there
 * for a project that copies a list and reorders it. Every other type opens with its first operator,
 * `equals`.
 *
 * To change one type's operators, pass a set for that type in any options layer — it replaces the
 * ready-made one for that type and keeps the rest. A translated set is the same move: copy the
 * definitions with new `label`s.
 */
export const defaultOperators = {
	byType: {
		text: [textContains, textEquals, textNotEquals, textStartsWith, textEndsWith, isEmpty, isNotEmpty],
		number: [
			numberEquals,
			numberNotEquals,
			numberGreaterThan,
			numberGreaterOrEqual,
			numberLessThan,
			numberLessOrEqual,
			numberBetween,
		],
		date: [dateEquals, dateNotEquals, dateGreaterThan, dateGreaterOrEqual, dateLessThan, dateLessOrEqual, dateBetween],
		boolean: [booleanEquals, booleanNotEquals, isEmpty, isNotEmpty],
		select: [isAnyOf, isNoneOf, isEmpty, isNotEmpty],
		badge: [isAnyOf, isNoneOf, isEmpty, isNotEmpty],
		progress: [
			numberEquals,
			numberNotEquals,
			numberGreaterThan,
			numberGreaterOrEqual,
			numberLessThan,
			numberLessOrEqual,
			numberBetween,
		],
		image: [textContains, textEquals, textNotEquals, textStartsWith, textEndsWith, isEmpty, isNotEmpty],
		link: [textContains, textEquals, textNotEquals, textStartsWith, textEndsWith, isEmpty, isNotEmpty],
	} satisfies DefaultOperatorsByType,
	defaultByType: {
		text: 'contains',
		image: 'contains',
		link: 'contains',
		select: 'in',
		badge: 'in',
	} satisfies Partial<Record<keyof BaseCellTypes, FilterOperator>>,
} satisfies OperatorsConfig
