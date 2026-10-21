import type { ResolvedGridOptions } from '../resolved-options'
import type { FilterOperatorOption } from '../types'
import type { FilterOperatorDef } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

/** `record[key]` when the record states it, ignoring what an object inherits (`toString`, …). */
function ownEntry<TValue>(record: Partial<Record<string, TValue>>, key: string): TValue | undefined {
	return Object.hasOwn(record, key) ? record[key] : undefined
}

/**
 * The icon an operator shows: the one written on its definition, else the grid's
 * `icons.operators` entry for its id. `undefined` when neither has one — the control then shows
 * the label, which is the default for every built-in until a grid names icons (core's
 * `DEFAULT_OPERATOR_ICONS` is the opt-in set).
 */
export function resolveOperatorIcon(def: FilterOperatorDef, icons: ResolvedGridOptions['icons']): ReactNode {
	return (def.icon as ReactNode) ?? ownEntry(icons.operators, def.id)
}

/** Settles the icon of every operator in a list, in the order the list gives them. */
export function withOperatorIcons(
	defs: FilterOperatorDef[],
	icons: ResolvedGridOptions['icons'],
): FilterOperatorOption[] {
	return defs.map((def) => {
		const { icon: _authored, ...rest } = def
		const icon = resolveOperatorIcon(def, icons)
		return icon === undefined || icon === null ? rest : { ...rest, icon }
	})
}
