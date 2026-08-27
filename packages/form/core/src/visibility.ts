import { compileCondition } from './rules'
import { isFieldNode, walkNodes } from './walk'

import type { AnyFormSchema, FormNode } from './schema'

function isNodeVisible<TValues>(node: FormNode<TValues, string>, values: TValues): boolean {
	return node.when === undefined || compileCondition<TValues>(node.when)(values)
}

export function visibleFieldNames<TValues>(schema: AnyFormSchema<TValues>, values: TValues): Set<string> {
	const visible = new Set<string>()
	walkNodes(schema, (node, ancestors) => {
		if (!isFieldNode(node)) return
		const chainVisible = ancestors.every((ancestor) => isNodeVisible(ancestor, values))
		if (chainVisible && isNodeVisible(node, values)) visible.add(node.name)
	})
	return visible
}

/** Every field name the schema declares, visible or not. */
function allFieldNames<TValues>(schema: AnyFormSchema<TValues>): Set<string> {
	const names = new Set<string>()
	walkNodes(schema, (node) => {
		if (isFieldNode(node)) names.add(node.name)
	})
	return names
}

export function stripHiddenValues<TValues>(schema: AnyFormSchema<TValues>, values: TValues): TValues {
	const visible = visibleFieldNames(schema, values)
	const owned = allFieldNames(schema)
	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
		if (owned.has(key) && !visible.has(key)) continue
		result[key] = value
	}
	return result as TValues
}
