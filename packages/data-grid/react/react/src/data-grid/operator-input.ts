import { resolveOperatorLabels } from '@ez-kit/data-grid-core'

import type { FilterOperatorOption } from '../types'
import type { FilterOperatorDef, FilterOperatorId, GridMessages, OperatorInput } from '@ez-kit/data-grid-core'

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
 * The labelled lists per operator list, one per set of labels. The dictionary is rebuilt on every
 * render, so its identity says nothing; the labels themselves decide whether the controls' props
 * changed. Keyed by the labels rather than holding one list, so two grids in two languages sharing
 * the ready-made set do not knock each other's list out on every render.
 */
const labelledByOperators = new WeakMap<FilterOperatorDef[], Map<string, FilterOperatorOption[]>>()

/**
 * A column's resolved operators as the controls show them: each with its label settled from the
 * grid's dictionary — the definition's own `label`, else `messages.operators` — so every surface
 * that names an operator reads one field and none repeats the lookup.
 *
 * Core types a definition's `icon` as `unknown` because it renders nothing; in this layer an icon is
 * whatever React can render, and the definition is its only source. The list keeps its identity
 * while its labels do — the column's own list when every operator carries its label, else the last
 * labelled one — which keeps every control's props stable across renders.
 */
export function toOperatorOptions(
	defs: FilterOperatorDef[],
	messages: GridMessages['operators'],
): FilterOperatorOption[] {
	const labelled = resolveOperatorLabels(defs, messages) as FilterOperatorOption[]
	if (labelled === defs) return labelled
	const byLabels = labelledByOperators.get(defs) ?? new Map<string, FilterOperatorOption[]>()
	labelledByOperators.set(defs, byLabels)
	const signature = labelled.map((op) => op.label).join('\u0000')
	const cached = byLabels.get(signature)
	if (cached) return cached
	byLabels.set(signature, labelled)
	return labelled
}
