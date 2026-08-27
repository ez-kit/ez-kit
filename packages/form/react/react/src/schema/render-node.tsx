import { FormFieldType, resolveText } from '@ez-kit/form-core'

import type { FormFieldComponents } from '../field-props'
import type { FieldNode, Translate } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * What `renderNode` needs beyond the node and the bound components.
 *
 * `translate` is a required key typed `Translate | undefined` — not `translate?:` — so a
 * caller who has no translator can still pass `{ translate: undefined }` without tripping
 * `exactOptionalPropertyTypes`; same reason the kit contract types its optional fields the
 * same way (see `FieldRenderProps` in `contract.ts`).
 */
export type RenderNodeContext = {
	translate: Translate | undefined
}

export type RenderNodeArgs<TValues> = {
	node: FieldNode<TValues>
	/** The bound field components already attached to the form instance — see `createForm`. */
	form: FormFieldComponents<TValues>
	context: RenderNodeContext
}

/**
 * Turn one field node into the already-bound kit component for its kind.
 *
 * Every case forwards only that kind's own option keys — never `{...node}` — so `when`,
 * `validate` and `colSpan` (and every other schema-only key) never leak into the kit's
 * props, and an option the node genuinely omits stays omitted rather than becoming an
 * explicit `undefined`, which React Aria and Radix reject under `exactOptionalPropertyTypes`.
 */
export function renderNode<TValues>({ node, form, context }: RenderNodeArgs<TValues>): ReactNode {
	const label = resolveText(node.label, context.translate)
	const description = resolveText(node.description, context.translate)

	switch (node.type) {
		case FormFieldType.Text:
			return (
				<form.TextField
					name={node.name}
					label={label}
					description={description}
					{...(node.required !== undefined && { required: node.required })}
					{...(node.placeholder !== undefined && { placeholder: node.placeholder })}
					{...(node.inputType !== undefined && { type: node.inputType })}
				/>
			)
		case FormFieldType.Number:
			return (
				<form.NumberField
					name={node.name}
					label={label}
					description={description}
					{...(node.required !== undefined && { required: node.required })}
					{...(node.placeholder !== undefined && { placeholder: node.placeholder })}
					{...(node.min !== undefined && { min: node.min })}
					{...(node.max !== undefined && { max: node.max })}
					{...(node.step !== undefined && { step: node.step })}
				/>
			)
		case FormFieldType.Textarea:
			return (
				<form.TextareaField
					name={node.name}
					label={label}
					description={description}
					{...(node.required !== undefined && { required: node.required })}
					{...(node.placeholder !== undefined && { placeholder: node.placeholder })}
					{...(node.rows !== undefined && { rows: node.rows })}
				/>
			)
		case FormFieldType.Select:
			return (
				<form.SelectField
					name={node.name}
					label={label}
					description={description}
					options={node.options}
					{...(node.required !== undefined && { required: node.required })}
					{...(node.placeholder !== undefined && { placeholder: node.placeholder })}
				/>
			)
		case FormFieldType.Checkbox:
			return (
				<form.CheckboxField
					name={node.name}
					label={label}
					description={description}
					{...(node.required !== undefined && { required: node.required })}
				/>
			)
		case FormFieldType.Switch:
			return (
				<form.SwitchField
					name={node.name}
					label={label}
					description={description}
					{...(node.required !== undefined && { required: node.required })}
				/>
			)
		case FormFieldType.RadioGroup:
			return (
				<form.RadioGroupField
					name={node.name}
					label={label}
					description={description}
					options={node.options}
					{...(node.required !== undefined && { required: node.required })}
				/>
			)
		case FormFieldType.Slider:
			return (
				<form.SliderField
					name={node.name}
					label={label}
					description={description}
					{...(node.required !== undefined && { required: node.required })}
					{...(node.min !== undefined && { min: node.min })}
					{...(node.max !== undefined && { max: node.max })}
					{...(node.step !== undefined && { step: node.step })}
				/>
			)
		default: {
			// Every FormFieldType is handled above; this only fires if the enum grows a
			// member without a matching case, which is exactly what should throw.
			const unhandled: { type: string } = node
			throw new Error(`Unknown node type "${unhandled.type}".`)
		}
	}
}
