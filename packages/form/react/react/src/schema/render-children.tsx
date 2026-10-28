import { isArrayNode, isFieldNode } from '@ez-kit/form-core'

import { RenderNode } from './render-node'
import { assertGrid } from './required-components'

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
	 * Grid columns of the container these nodes are the children of — a block, an array entry or
	 * the document itself. When set, the children are laid out in `layout.Grid` with one
	 * `Grid.Item` each visible child; when `undefined` they render bare, and the container receives them as
	 * they are.
	 */
	columns: number | undefined
}

/** A sibling's key: its `name` when it names a value, otherwise its position. */
function keyOf(node: FormNode<unknown, string>, index: number): string {
	if (isFieldNode(node) || isArrayNode(node)) return node.name
	return `${node.type}-${String(index)}`
}

/**
 * Render one sibling per node through `RenderNode`, laid out on the container's grid when it
 * sets `columns`.
 *
 * The grid goes **inside** the container: a block receives its children already in their grid
 * and knows nothing of columns, which is what lets any component be a container on a grid
 * without implementing one. A container node contributes nothing to a field's `name` either —
 * nesting only changes the JSX wrapped around it here, never the path its value lives at, its
 * validation, or the submitted payload.
 *
 * `RenderNode` is a component, not a plain function, precisely so a hidden node (`when`
 * false) still calls its hooks: mapping straight to `<RenderNode key={key} .../>` here keeps
 * one hook-call site per sibling, in the same order every render, regardless of which nodes
 * currently evaluate visible. It also places the grid cell, after deciding visibility, so a
 * hidden child leaves no empty cell behind. A node with no `name` of its own keys off its position, which is
 * stable because the list is static, authored config.
 */
export function renderChildren<TValues>(
	nodes: FormNode<TValues, string>[],
	args: RenderChildrenArgs<TValues>,
): ReactNode {
	const { form, layout, context, columns } = args

	if (columns === undefined) {
		return nodes.map((node, index) => (
			<RenderNode
				key={keyOf(node as FormNode<unknown, string>, index)}
				node={node}
				form={form}
				layout={layout}
				context={context}
			/>
		))
	}

	const Grid = assertGrid(layout)
	return (
		<Grid columns={columns}>
			{nodes.map((node, index) => (
				<RenderNode
					key={keyOf(node as FormNode<unknown, string>, index)}
					node={node}
					form={form}
					layout={layout}
					context={context}
					cell={Grid.Item}
				/>
			))}
		</Grid>
	)
}
