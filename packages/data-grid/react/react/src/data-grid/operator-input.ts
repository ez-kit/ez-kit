import type { FilterOperatorOption } from '../types'
import type { FilterOperatorDef, FilterOperatorId, OperatorInput } from '@ez-kit/data-grid-core'

/**
 * The kind of value `id` takes among a column's resolved operators — the one fact every filter
 * behaviour is read from: the editor, what switching operators keeps, the chip, which presets apply
 * and whether an empty value is a filter. `undefined` for an id the column does not offer.
 *
 * The one place the grid asks an operator anything. Never branch on an operator's id: an author's
 * `notBetween` with `input: 'range'` must behave as `between` does.
 */
export function inputOf(operators: readonly FilterOperatorDef[], id: FilterOperatorId): OperatorInput | undefined {
	return operators.find((op) => op.id === id)?.input
}

/**
 * A column's resolved operators as the controls show them. Core types a definition's `icon` as
 * `unknown` because it renders nothing; in this layer an icon is whatever React can render, and the
 * definition is its only source, so the list is the same list, retyped — which also keeps its
 * identity, and with it every control's props, stable while the column's operators are.
 */
export function toOperatorOptions(defs: FilterOperatorDef[]): FilterOperatorOption[] {
	return defs as FilterOperatorOption[]
}
