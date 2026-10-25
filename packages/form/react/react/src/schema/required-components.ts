import { FormFieldType, hasChildren, isBlockNode, RESERVED_NODE_TYPES, walkNodes } from '@ez-kit/form-core'

import type { FormFieldSlots, GridSlot } from '../contract'
import type { CustomFieldRegistry } from './registries'
import type { LayoutComponents } from './render-node'
import type { AnyFormSchema, FormNode } from '@ez-kit/form-core'

/**
 * The slot each built-in field kind renders through. The bound field set holds exactly what the
 * form registered, so a document naming a kind whose slot is absent is a missing component, named
 * by {@link missingBuiltInFieldMessage}.
 */
export const BUILT_IN_SLOT_BY_TYPE = {
	[FormFieldType.Text]: 'TextField',
	[FormFieldType.Number]: 'NumberField',
	[FormFieldType.Textarea]: 'TextareaField',
	[FormFieldType.Select]: 'SelectField',
	[FormFieldType.Checkbox]: 'CheckboxField',
	[FormFieldType.Switch]: 'SwitchField',
	[FormFieldType.RadioGroup]: 'RadioGroupField',
	[FormFieldType.Slider]: 'SliderField',
	[FormFieldType.Date]: 'DateField',
	[FormFieldType.DateRange]: 'DateRangeField',
	[FormFieldType.MultiSelect]: 'MultiSelectField',
	[FormFieldType.CheckboxGroup]: 'CheckboxGroupField',
} as const satisfies Record<FormFieldType, Exclude<keyof FormFieldSlots, 'ArrayField'>>

/** Whether `type` is a built-in field kind, i.e. a key of {@link BUILT_IN_SLOT_BY_TYPE}. */
export function isBuiltInFieldType(type: string): type is FormFieldType {
	return Object.hasOwn(BUILT_IN_SLOT_BY_TYPE, type)
}

/** What `SchemaForm` says when a document names a built-in field kind whose slot was not passed. */
export function missingBuiltInFieldMessage(type: FormFieldType): string {
	return `SchemaForm: the document has a ${type} field, but no ${BUILT_IN_SLOT_BY_TYPE[type]} was passed in fields.`
}

/** What `SchemaForm` says when a document names a custom field kind nothing registered. */
export function missingCustomFieldMessage(type: string): string {
	return `SchemaForm: the document has a field of type "${type}", but no component registered in fields derives that type id.`
}

/** What `SchemaForm` says when a block names a component that was not passed in `components`. */
export function missingBlockMessage(component: string): string {
	return `SchemaForm: the document has a block "${component}", but no ${component} component was passed in components.`
}

/** What the up-front walk needs to know about the fields the form registered. */
export type RegisteredFields = {
	/** The bound instance — it carries exactly the built-in slots (and `ArrayField`) its bundle registered. */
	instance: object
	/** The custom fields, keyed by the document id each component name derives. */
	custom: CustomFieldRegistry
}

const RESERVED_TYPES: readonly string[] = RESERVED_NODE_TYPES

function hasSlot(instance: object, slot: string): boolean {
	return (instance as Record<string, unknown>)[slot] !== undefined
}

/**
 * What `SchemaForm` says when a document needs a component that was not passed — one message per
 * component, each naming the option it belongs in.
 */
export const MissingComponentMessage = {
	Grid: 'SchemaForm: the document sets columns, but no Grid component was passed in components.',
	GridBlock: 'SchemaForm: "Grid" is not a block; set "columns" on the container instead.',
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

/** The component a renderer inserts for `columns` — never a block of its own. */
const GRID_COMPONENT = 'Grid'

/** The grid slot, or the named error when a document sets `columns` and none was passed. */
export function assertGrid(layout: LayoutComponents): GridSlot {
	assertComponent(layout.Grid, MissingComponentMessage.Grid)
	return layout.Grid
}

/**
 * A block's component must be an own key of the bundle's `components`, so a document string
 * such as "toString" cannot resolve an `Object.prototype` member; `Grid` is refused because the
 * renderer inserts it for `columns`, and a block of it would be a grid in a grid.
 */
function assertBlockComponent(layout: LayoutComponents, component: string): void {
	if (component === GRID_COMPONENT) throw new Error(MissingComponentMessage.GridBlock)
	if (!Object.hasOwn(layout, component) || layout[component] === undefined) {
		throw new Error(missingBlockMessage(component))
	}
}

/** A container's own `columns`: a block with children, an array — never a leaf. */
function columnsOf(node: FormNode<unknown, string>): number | undefined {
	return hasChildren(node) ? (node as { columns?: number }).columns : undefined
}

/**
 * Asserts, once and up front, every component the document can ever need.
 *
 * Per-node checks alone fire only when the node renders: a block hidden by `when`, or a `date`
 * field inside it, would pass the first render and throw mid-flow — after the user has typed into
 * the form. So the whole document is walked before anything renders, whatever is currently
 * visible: every block against `components`, every `columns` against `Grid`, every built-in field
 * kind against the slots the instance carries, every other field kind against the custom-field
 * registry.
 */
export function assertDocumentComponents(
	schema: AnyFormSchema<unknown>,
	layout: LayoutComponents,
	registered: RegisteredFields,
): void {
	if (schema.columns !== undefined) assertGrid(layout)
	walkNodes(schema, (node) => {
		if (columnsOf(node) !== undefined) assertGrid(layout)
		if (isBlockNode(node)) {
			assertBlockComponent(layout, node.component)
			return
		}
		if (node.type === 'array') {
			if (!hasSlot(registered.instance, 'ArrayField')) throw new Error(MissingComponentMessage.ArrayField)
			return
		}
		assertFieldKind(node.type, registered)
	})
}

/** Throws naming what is missing when a field node's kind was not registered. */
function assertFieldKind(type: string, registered: RegisteredFields): void {
	if (RESERVED_TYPES.includes(type)) return
	if (isBuiltInFieldType(type)) {
		if (!hasSlot(registered.instance, BUILT_IN_SLOT_BY_TYPE[type])) throw new Error(missingBuiltInFieldMessage(type))
		return
	}
	if (!Object.hasOwn(registered.custom, type)) throw new Error(missingCustomFieldMessage(type))
}
