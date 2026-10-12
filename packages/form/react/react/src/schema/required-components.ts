import { walkNodes } from '@ez-kit/form-core'

import type { LayoutComponents } from './render-node'
import type { AnyFormSchema, SectionNode } from '@ez-kit/form-core'

/**
 * What `SchemaForm` says when a document needs a component that was not passed — one message per
 * component, each naming the option it belongs in.
 */
export const MissingComponentMessage = {
	Section: 'SchemaForm: the document has a section, but no Section component was passed in components.',
	GridItem: 'SchemaForm: a section has a grid, but no GridItem component was passed in components.',
	Wizard: 'SchemaForm: the document has steps, but no Wizard component was passed in components.',
	SubmitButton: 'SchemaForm: the document has a submit node, but no SubmitButton component was passed in components.',
	ArrayField: 'SchemaForm: the document has an array, but no ArrayField was passed in fields.',
} as const

export type MissingComponentMessage = (typeof MissingComponentMessage)[keyof typeof MissingComponentMessage]

/** Throws `message` when the form was given no `component`. */
export function assertComponent<TComponent>(
	component: TComponent | undefined,
	message: MissingComponentMessage,
): asserts component is TComponent {
	if (component === undefined) throw new Error(message)
}

/**
 * Asserts, once and up front, every component the document can ever need.
 *
 * Per-node checks alone fire only when the node renders: a `section` hidden by `when`, or one in
 * a wizard step not reached yet, would pass the first render and throw mid-flow — after the user
 * has typed into the form. So the whole document is walked before anything renders, whatever is
 * currently visible.
 *
 * `hasArrayField` is whether the form registered an `ArrayField` — an array is drawn through the
 * bound `form.ArrayField`, not through `layout`.
 */
export function assertDocumentComponents(
	schema: AnyFormSchema<unknown>,
	layout: LayoutComponents,
	hasArrayField: boolean,
): void {
	walkNodes(schema, (node) => {
		switch (node.type) {
			case 'section':
				assertComponent(layout.Section, MissingComponentMessage.Section)
				if ((node as SectionNode<unknown, string>).columns !== undefined)
					assertComponent(layout.GridItem, MissingComponentMessage.GridItem)
				break
			case 'submit':
				assertComponent(layout.SubmitButton, MissingComponentMessage.SubmitButton)
				break
			case 'step':
				assertComponent(layout.Wizard, MissingComponentMessage.Wizard)
				break
			case 'array':
				if (!hasArrayField) throw new Error(MissingComponentMessage.ArrayField)
				break
			default:
				break
		}
	})
}
