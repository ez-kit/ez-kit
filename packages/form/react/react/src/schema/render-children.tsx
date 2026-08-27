import { FORM_FIELD_TYPES, isFieldNode } from '@ez-kit/form-core'
import { Fragment } from 'react'

import { renderNode } from './render-node'

import type { LayoutComponents, RenderNodeContext } from './render-node'
import type { FormFieldComponents } from '../field-props'
import type { CustomFieldNode, FieldNode, FormNode } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/** Every built-in field kind, for narrowing `isFieldNode`'s result away from `CustomFieldNode`. */
const BUILT_IN_FIELD_TYPES: readonly string[] = FORM_FIELD_TYPES

/**
 * `isFieldNode` also matches a `CustomFieldNode` — a field kind supplied through a
 * registry, which is a later task (spec §9.3). This slice renders built-in kinds only.
 */
function isBuiltInFieldNode<TValues>(
	node: FieldNode<TValues> | CustomFieldNode<TValues, string>,
): node is FieldNode<TValues> {
	return BUILT_IN_FIELD_TYPES.includes(node.type)
}

export type RenderChildrenArgs<TValues> = {
	/** The bound field components already attached to the form instance — see `createForm`. */
	form: FormFieldComponents<TValues>
	layout: LayoutComponents
	context: RenderNodeContext
	/**
	 * Grid columns declared by the immediate parent section — `undefined` at the schema's
	 * top level (no enclosing grid) and whenever the parent section itself declares no
	 * `columns`. A child is wrapped in `layout.GridItem` only when this is set; otherwise it
	 * renders bare, exactly as a flat, section-less schema always has.
	 */
	parentColumns: number | undefined
}

/**
 * Render one sibling per node — a field through `renderNode`, a `section` recursively
 * through the very same `renderNode`/`renderChildren` pair — wrapping each in
 * `layout.GridItem` when the parent section declares a `columns` grid.
 *
 * A container node contributes nothing to a field's `name`: nesting a field inside a
 * section only changes the JSX wrapped around it here, never the path its value lives at,
 * its validation, or the submitted payload.
 */
export function renderChildren<TValues>(
	nodes: FormNode<TValues, string>[],
	args: RenderChildrenArgs<TValues>,
): ReactNode {
	const { form, layout, context, parentColumns } = args

	return nodes.map((node, index) => {
		let key: string
		let rendered: ReactNode

		if (isFieldNode(node)) {
			if (!isBuiltInFieldNode(node)) {
				throw new Error(
					`Custom field type "${node.type}" needs a field-type registry, which this renderer does not support yet.`,
				)
			}
			key = node.name
			rendered = renderNode({ node, form, layout, context })
		} else if (node.type === 'section') {
			// Sections have no `name` of their own — position in the schema is a stable
			// enough key since the list itself is static, authored config.
			key = `section-${String(index)}`
			rendered = renderNode({ node, form, layout, context })
		} else {
			throw new Error(`Unknown node type "${node.type}".`)
		}

		if (parentColumns === undefined) {
			return <Fragment key={key}>{rendered}</Fragment>
		}

		return (
			<layout.GridItem
				key={key}
				colSpan={node.colSpan}
			>
				{rendered}
			</layout.GridItem>
		)
	})
}
