import { isFieldNode } from '@ez-kit/form-core'
import { Fragment } from 'react'

import { RenderNode } from './render-node'

import type { LayoutComponents, RenderNodeContext } from './render-node'
import type { FormFieldComponents } from '../field-props'
import type { FormNode } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

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
 * Render one sibling per node — a field through `RenderNode`, a `section` recursively
 * through the very same `RenderNode`/`renderChildren` pair — wrapping each in
 * `layout.GridItem` when the parent section declares a `columns` grid.
 *
 * A container node contributes nothing to a field's `name`: nesting a field inside a
 * section only changes the JSX wrapped around it here, never the path its value lives at,
 * its validation, or the submitted payload.
 *
 * `RenderNode` is a component, not a plain function, precisely so a hidden node (`when`
 * false) still calls its hooks: mapping straight to `<RenderNode key={key} .../>` here keeps
 * one hook-call site per sibling, in the same order every render, regardless of which nodes
 * currently evaluate visible.
 *
 * `isFieldNode` matches both a built-in `FieldNode` and a registry-supplied `CustomFieldNode`
 * (spec §4.7) — both have a `name` and both go through the very same `RenderNode`, which is
 * what tells them apart internally (its `switch` case vs. its registry-lookup default). A
 * `block` and `submit` node have no `name` of their own, exactly like `section`, so they key
 * off their position too.
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
			key = node.name
			rendered = (
				<RenderNode
					node={node}
					form={form}
					layout={layout}
					context={context}
				/>
			)
		} else if (node.type === 'section') {
			// Sections have no `name` of their own — position in the schema is a stable
			// enough key since the list itself is static, authored config.
			key = `section-${String(index)}`
			rendered = (
				<RenderNode
					node={node}
					form={form}
					layout={layout}
					context={context}
				/>
			)
		} else if (node.type === 'block') {
			key = `block-${String(index)}`
			rendered = (
				<RenderNode
					node={node}
					form={form}
					layout={layout}
					context={context}
				/>
			)
		} else if (node.type === 'submit') {
			key = `submit-${String(index)}`
			rendered = (
				<RenderNode
					node={node}
					form={form}
					layout={layout}
					context={context}
				/>
			)
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
