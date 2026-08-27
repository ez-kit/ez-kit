import { FormFieldType, resolveText } from '@ez-kit/form-core'

import { renderChildren } from './render-children'
import { useConditionValue } from './use-condition'

import type { ConditionSubscribableForm } from './use-condition'
import type { FormComponents } from '../contract'
import type { FormFieldComponents } from '../field-props'
import type { FieldNode, SectionNode, Translate } from '@ez-kit/form-core'
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

/**
 * The two layout primitives from the raw kit contract — separate from `form` (the bound,
 * per-field components attached to the form instance) because `Section` and `GridItem`
 * carry no field state; they are wired straight from `createForm`'s `components`.
 */
export type LayoutComponents = Pick<FormComponents, 'Section' | 'GridItem'>

export type RenderNodeArgs<TValues> = {
	node: FieldNode<TValues> | SectionNode<TValues, string>
	/** The bound field components already attached to the form instance — see `createForm`. */
	form: FormFieldComponents<TValues>
	layout: LayoutComponents
	context: RenderNodeContext
}

/**
 * Turn one field or section node into the already-bound kit component for its kind.
 *
 * A **component**, not a plain function, on purpose: it calls `useConditionValue` twice
 * (`when`, `disabledWhen`) via the rules of hooks, which requires a component or custom hook
 * — see `renderChildren`, which mounts one `RenderNode` per sibling instead of calling a
 * plain function, so those hook calls land in a stable position across renders.
 *
 * Every case forwards only that kind's own option keys — never `{...node}` — so `when`,
 * `validate` and `colSpan` (and every other schema-only key) never leak into the kit's
 * props, and an option the node genuinely omits stays omitted rather than becoming an
 * explicit `undefined`, which React Aria and Radix reject under `exactOptionalPropertyTypes`.
 *
 * A section contributes nothing to a field's `name` — it only groups children into a headed,
 * column-gridded block via `layout.Section` and recurses into them via `renderChildren`,
 * which is what wraps each child in `layout.GridItem` when the section declares `columns`.
 *
 * `node.when` false hides the node entirely (returns `null`, after both hooks have still
 * run); `node.disabledWhen` true only disables it — spec §5 draws that line deliberately, so
 * a disabled field's already-typed value stays visible and submitted rather than vanishing.
 * `disabledWhen` only reaches built-in field kinds: a `section` has no `disabled` slot in the
 * kit contract (`SectionRenderProps`), so it only ever hides via `when`, never disables.
 */
export function RenderNode<TValues>({ node, form, layout, context }: RenderNodeArgs<TValues>): ReactNode {
	// `form` carries far more than `FormFieldComponents` at runtime — the real bound instance
	// — so this narrows it to just the store shape `useConditionValue` needs, the same
	// `as unknown` pattern `buildFieldComponents` uses for `BindableForm`.
	const conditionForm = form as unknown as ConditionSubscribableForm<TValues>
	const visible = useConditionValue(conditionForm, node.when, true)
	const disabledByCondition = useConditionValue(conditionForm, node.disabledWhen, false)

	const label = resolveText(node.label, context.translate)
	const description = resolveText(node.description, context.translate)

	if (!visible) return null

	switch (node.type) {
		case FormFieldType.Text:
			return (
				<form.TextField
					name={node.name}
					label={label}
					description={description}
					disabled={disabledByCondition}
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
					disabled={disabledByCondition}
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
					disabled={disabledByCondition}
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
					disabled={disabledByCondition}
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
					disabled={disabledByCondition}
					{...(node.required !== undefined && { required: node.required })}
				/>
			)
		case FormFieldType.Switch:
			return (
				<form.SwitchField
					name={node.name}
					label={label}
					description={description}
					disabled={disabledByCondition}
					{...(node.required !== undefined && { required: node.required })}
				/>
			)
		case FormFieldType.RadioGroup:
			return (
				<form.RadioGroupField
					name={node.name}
					label={label}
					description={description}
					disabled={disabledByCondition}
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
					disabled={disabledByCondition}
					{...(node.required !== undefined && { required: node.required })}
					{...(node.min !== undefined && { min: node.min })}
					{...(node.max !== undefined && { max: node.max })}
					{...(node.step !== undefined && { step: node.step })}
				/>
			)
		case 'section': {
			const title = resolveText(node.title, context.translate)
			return (
				<layout.Section
					title={title}
					description={description}
					columns={node.columns}
				>
					{renderChildren(node.children, { form, layout, context, parentColumns: node.columns })}
				</layout.Section>
			)
		}
		default: {
			// Every FormFieldType plus `section` is handled above; this only fires for a
			// container kind not yet supported by this renderer (`step`, `submit`, `block`)
			// or for a node type that grows a member without a matching case, which is
			// exactly what should throw.
			const unhandled: { type: string } = node
			throw new Error(`Unknown node type "${unhandled.type}".`)
		}
	}
}
