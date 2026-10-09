import { getValueAtPath } from './rules'
import { RESERVED_NODE_TYPES } from './schema'

import type { AnyArrayNode, AnyFormSchema, CustomFieldNode, FieldNode, FormNode } from './schema'

const ARRAY_NODE_TYPE = 'array'
const CONTAINER_TYPES = new Set(['section', 'step', ARRAY_NODE_TYPE])

/**
 * A node that holds a value and has no children — every built-in field kind, plus a custom one.
 *
 * An `array` node is deliberately **not** one of these even though it has a `name` and a
 * `validate`: it is a container, and a caller that means "everything with a value" wants
 * {@link hasValue}. Keeping the two apart is what stops an array's own constraints being
 * collected as if they belonged to a leaf, and stops its children being read off the form root.
 */
export function isFieldNode<TValues>(
	node: FormNode<TValues, string>,
): node is FieldNode<TValues> | CustomFieldNode<TValues, string> {
	return !RESERVED_NODE_TYPES.includes(node.type as (typeof RESERVED_NODE_TYPES)[number])
}

export function isArrayNode<TValues>(node: FormNode<TValues, string>): node is AnyArrayNode {
	return node.type === ARRAY_NODE_TYPE
}

/**
 * A node that names a path in the form values: every leaf field, and an `array` node, whose
 * `name` is the list itself and whose `validate` constrains that list.
 */
export function hasValue<TValues>(
	node: FormNode<TValues, string>,
): node is FieldNode<TValues> | CustomFieldNode<TValues, string> | AnyArrayNode {
	return isFieldNode(node) || isArrayNode(node)
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

/** Joins a node's own `name` onto the absolute prefix of the item it sits in. */
function join(prefix: string, name: string): string {
	return prefix === '' ? name : `${prefix}.${name}`
}

/** What {@link walkInstances} reports for one node. */
export type NodeInstance = {
	/**
	 * Typed over `unknown` rather than over the form's values, and deliberately so: inside an
	 * array the nodes belong to the **item's** type, not the form's, so a single walk crosses
	 * type boundaries. Every consumer here works on the erased shape — read a `name`, read a
	 * `validate` — and `parse.ts` already spells shape-level work the same way.
	 */
	node: FormNode<unknown, string>
	/**
	 * The node's absolute path in the form values, or `undefined` for a node that names none
	 * (a section, a step, a submit button, a block).
	 */
	path: string | undefined
	/**
	 * The array item this node sits inside, as an absolute path (`people[1]`), or `undefined` at
	 * the form root. This is what a `./`-prefixed condition resolves against.
	 */
	itemPath: string | undefined
	ancestors: FormNode<unknown, string>[]
}

/**
 * Traversal over every node **instance** the schema produces for a given set of values.
 *
 * `walkNodes` reports each node once, which is all a static check needs. An array breaks that
 * one-to-one relationship: one `array` node with three items yields three instances of every
 * field beneath it, at three different paths, and how many there are is a property of the
 * *values*, not of the schema. Anything that has to name real paths — validation, visibility,
 * stripping hidden values — needs this rather than `walkNodes`.
 *
 * Nodes come in document order, an array node before the items it expands into. An array whose
 * value is not a list yields nothing below itself, which is correct: there are no fields there
 * to check or to hide.
 *
 * `visit` may return `false` to prune: the node's subtree is not walked. That is what lets a
 * caller evaluate a container's `when` **as it descends**, rather than re-deriving each
 * ancestor's own item scope afterwards to evaluate it out of context.
 */
export function walkInstances<TValues>(
	schema: AnyFormSchema<TValues>,
	values: unknown,
	/**
	 * Called for every node instance; return `false` to prune its subtree.
	 *
	 * Typed `unknown` rather than `boolean | void`: returning nothing is the common case, and
	 * `void` may not appear in a union. Only a literal `false` prunes.
	 */
	visit: (instance: NodeInstance) => unknown,
): void {
	const walk = (
		nodes: FormNode<unknown, string>[],
		prefix: string,
		itemPath: string | undefined,
		ancestors: FormNode<unknown, string>[],
	): void => {
		for (const node of nodes) {
			if (isArrayNode(node)) {
				const arrayPath = join(prefix, node.name)
				if (visit({ node, path: arrayPath, itemPath, ancestors }) === false) continue

				const list = getValueAtPath(values, arrayPath)
				if (!Array.isArray(list)) continue
				const next = [...ancestors, node]
				list.forEach((_, index) => {
					const entry = `${arrayPath}[${String(index)}]`
					walk(node.children, entry, entry, next)
				})
				continue
			}

			if (hasChildren(node)) {
				if (visit({ node, path: undefined, itemPath, ancestors }) === false) continue
				walk(node.children, prefix, itemPath, [...ancestors, node])
				continue
			}

			visit({ node, path: isFieldNode(node) ? join(prefix, node.name) : undefined, itemPath, ancestors })
		}
	}
	// Same widening `parse.ts` uses: a walker reads shapes, never the form's value type.
	walk(schema.children as FormNode<unknown, string>[], '', undefined, [])
}
