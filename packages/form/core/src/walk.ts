import { RESERVED_NODE_TYPES } from './schema'

import type { AnyFormSchema, CustomFieldNode, FieldNode, FormNode } from './schema'

const CONTAINER_TYPES = new Set(['section', 'step'])

export function isFieldNode<TValues>(
	node: FormNode<TValues, string>,
): node is FieldNode<TValues> | CustomFieldNode<TValues, string> {
	return !RESERVED_NODE_TYPES.includes(node.type as (typeof RESERVED_NODE_TYPES)[number])
}

export function hasChildren<TValues>(node: FormNode<TValues, string>): node is FormNode<TValues, string> & {
	children: FormNode<TValues, string>[]
} {
	return CONTAINER_TYPES.has(node.type)
}

/** Depth-first traversal over every node in the schema, containers included. */
export function walkNodes<TValues>(
	schema: AnyFormSchema<TValues>,
	visit: (node: FormNode<TValues, string>, ancestors: FormNode<TValues, string>[]) => void,
): void {
	const walk = (nodes: FormNode<TValues, string>[], ancestors: FormNode<TValues, string>[]): void => {
		for (const node of nodes) {
			visit(node, ancestors)
			if (hasChildren(node)) walk(node.children, [...ancestors, node])
		}
	}
	walk(schema.children, [])
}
