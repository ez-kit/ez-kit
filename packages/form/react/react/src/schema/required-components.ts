import { FormFieldType, RESERVED_NODE_TYPES, walkNodes } from '@ez-kit/form-core'

import type { FormFieldSlots } from '../contract'
import type { CustomFieldRegistry } from './registries'
import type { LayoutComponents } from './render-node'
import type { AnyFormSchema, SectionNode } from '@ez-kit/form-core'

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
 * Per-node checks alone fire only when the node renders: a `section` hidden by `when`, or a
 * `date` field in a wizard step not reached yet, would pass the first render and throw mid-flow —
 * after the user has typed into the form. So the whole document is walked before anything
 * renders, whatever is currently visible: every container against `layout`, every built-in field
 * kind against the slots the instance carries, every other field kind against the custom-field
 * registry.
 *
 * A `block` is not checked here: its registry is a per-form prop, resolved where it renders.
 */
export function assertDocumentComponents(
	schema: AnyFormSchema<unknown>,
	layout: LayoutComponents,
	registered: RegisteredFields,
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
				if (!hasSlot(registered.instance, 'ArrayField')) throw new Error(MissingComponentMessage.ArrayField)
				break
			default:
				assertFieldKind(node.type, registered)
				break
		}
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
