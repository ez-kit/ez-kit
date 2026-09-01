import { getValueAtPath } from '@ez-kit/form-core'
import { useSelector } from '@tanstack/react-form'
import { useCallback, useMemo } from 'react'

import type { ConditionSubscribableForm } from '../schema/use-condition'
import type { OptionsSource } from '@ez-kit/form-core'

/** Every entry equal by `Object.is` — enough for a flat map of field values. */
function shallowEqualRecords(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
	const keys = Object.keys(left)
	if (keys.length !== Object.keys(right).length) return false
	return keys.every((key) => Object.is(left[key], right[key]))
}

const NO_DEPENDENCIES: Record<string, string> = {}

/**
 * The parameter object a schema node's `optionsFrom` resolves to — its static `params`
 * with its `dependsOn` lookups merged over the top.
 *
 * Reads the form through a **narrow** subscription, the same way `useConditionValue` does:
 * `useSelector` derives just the referenced values and compares them entry by entry, so a
 * keystroke in an unrelated field re-renders nothing. That matters more here than for a
 * condition — a re-render on every keystroke would hand the source a new parameter object
 * and, with it, a new query.
 *
 * Returns `undefined` when the node has no `optionsFrom` at all. Called unconditionally
 * regardless (a node that does not use a source still has to have called it, so every node's
 * hooks land in the same order on every render — see `RenderNode`, which does the same for
 * `when` and `disabledWhen`).
 *
 * There is no `dependsOn` on the JSX path: `optionsParams={{ country }}` already carries the
 * live value, so nothing has to be looked up.
 */
export function useOptionSourceParams<TValues>(
	form: ConditionSubscribableForm<TValues>,
	optionsFrom: string | OptionsSource | undefined,
): Record<string, unknown> | undefined {
	const spec = typeof optionsFrom === 'string' ? undefined : optionsFrom
	const dependsOn = spec?.dependsOn ?? NO_DEPENDENCIES
	const staticParams = spec?.params

	const selector = useCallback(
		(state: { values: TValues }): Record<string, unknown> => {
			const resolved: Record<string, unknown> = {}
			for (const [parameter, ref] of Object.entries(dependsOn)) {
				resolved[parameter] = getValueAtPath(state.values, ref)
			}
			return resolved
		},
		[dependsOn],
	)

	const dependent = useSelector(form.store, selector, { compare: shallowEqualRecords })

	return useMemo(
		() => (optionsFrom === undefined ? undefined : { ...staticParams, ...dependent }),
		[optionsFrom, staticParams, dependent],
	)
}
