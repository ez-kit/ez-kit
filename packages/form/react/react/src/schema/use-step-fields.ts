import { isFieldNode, walkNodes } from '@ez-kit/form-core'
import { useMemo } from 'react'

import type { StepNode } from '@ez-kit/form-core'

/**
 * Every field `name` reachable from `step`, in document order, deduplicated.
 *
 * This is what makes step navigation independent of the data shape (spec §4.5, invariant I1):
 * a step is a *layout* container, so the only way to know which values it owns is to walk its
 * subtree and read the names the field nodes already carry. Those names are always full paths
 * from the root — nesting a field inside a step (or a section inside that step) never rewrites
 * them, exactly as `renderChildren` documents for sections.
 *
 * Nested `step` nodes are walked like any other container. Mixing `step` with non-`step`
 * siblings is a parse error (spec §4.5), so in a valid document this only ever descends
 * through sections; walking anything it does find costs nothing and keeps the collector total.
 */
export function collectStepFieldNames<TValues>(step: StepNode<TValues, string>): string[] {
	const names: string[] = []
	// `walkNodes` takes a document, not a subtree, so the step's children are wrapped in a
	// throwaway one — cheaper and far less error-prone than duplicating its recursion here.
	walkNodes({ version: 1, children: step.children }, (node) => {
		if (isFieldNode(node) && !names.includes(node.name)) names.push(node.name)
	})
	return names
}

/**
 * `collectStepFieldNames` for a whole list of steps, memoised on the list's identity.
 *
 * Every consumer of this (step validation, the per-step `invalid` flag) runs on a click or on
 * a form-state change, so re-walking every step's subtree each render would be pure waste: the
 * schema is static authored config and only changes when the `schema` prop itself does.
 */
export function useStepFieldNames<TValues>(steps: readonly StepNode<TValues, string>[]): readonly string[][] {
	return useMemo(() => steps.map((step) => collectStepFieldNames(step)), [steps])
}
