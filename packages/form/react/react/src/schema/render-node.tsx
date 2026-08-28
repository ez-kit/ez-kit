import { FORM_FIELD_TYPES, FormFieldType, resolveText } from '@ez-kit/form-core'

import { fieldRenderProps } from '../field-render-props'

import { renderChildren } from './render-children'
import { useConditionValue } from './use-condition'

import type { ConditionSubscribableForm } from './use-condition'
import type { BindableForm, FieldValue } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { FormFieldComponents } from '../field-props'
import type { BlockRegistry, CustomFieldRegistry } from './registries'
import type { BlockNode, CustomFieldNode, FieldNode, SectionNode, SubmitNode, Translate } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * What `renderNode` needs beyond the node and the bound components.
 *
 * `translate` is a required key typed `Translate | undefined` — not `translate?:` — so a
 * caller who has no translator can still pass `{ translate: undefined }` without tripping
 * `exactOptionalPropertyTypes`; same reason the kit contract types its optional fields the
 * same way (see `FieldRenderProps` in `contract.ts`). `fields` and `blocks` are the same
 * shape: `undefined` when the caller registered none, rather than an empty object forced on
 * every caller.
 */
export type RenderNodeContext = {
	translate: Translate | undefined
	fields: CustomFieldRegistry | undefined
	blocks: BlockRegistry | undefined
}

/**
 * The container primitives from the raw kit contract — separate from `form` (the bound,
 * per-field components attached to the form instance) because `Section`, `GridItem` and
 * `Wizard` carry no field state; they are wired straight from `createForm`'s `components`.
 */
export type LayoutComponents = Pick<FormComponents, 'Section' | 'GridItem' | 'Wizard'>

export type RenderNodeArgs<TValues> = {
	node:
		| FieldNode<TValues>
		| SectionNode<TValues, string>
		| CustomFieldNode<TValues, string>
		| BlockNode<TValues>
		| SubmitNode<TValues>
	/** The bound field components already attached to the form instance — see `createForm`. */
	form: FormFieldComponents<TValues>
	layout: LayoutComponents
	context: RenderNodeContext
}

/** Every `type` the `switch` below handles by name, for narrowing a custom field kind away. */
const BUILT_IN_OR_CONTAINER_TYPES: readonly string[] = [...FORM_FIELD_TYPES, 'section', 'block', 'submit']

/**
 * `CustomFieldNode<TValues, string>`'s own `type` is a bare `string`, not a literal — a
 * registry key can be anything — so `switch (node.type)` below can never exclude it from any
 * one case the way it excludes `SectionNode`/`BlockNode`/`SubmitNode` by their literal `type`.
 * This runtime check does what the discriminant alone cannot: pull a custom (or genuinely
 * unknown) node out of the union *before* the switch, so every case inside it keeps its own
 * node's real shape instead of the whole five-member union.
 */
function isCustomFieldNode<TValues>(
	node:
		| FieldNode<TValues>
		| SectionNode<TValues, string>
		| CustomFieldNode<TValues, string>
		| BlockNode<TValues>
		| SubmitNode<TValues>,
): node is CustomFieldNode<TValues, string> {
	return !BUILT_IN_OR_CONTAINER_TYPES.includes(node.type)
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
 * `disabledWhen` only reaches built-in and custom field kinds: a `section` has no `disabled`
 * slot in the kit contract (`SectionRenderProps`), and neither does a `block`, so those only
 * ever hide via `when`, never disable.
 *
 * Resolution order for a node past the built-in kinds and `section` (spec §4.7, §8):
 * `blocks[node.component]` for `type: 'block'` → `submit` → `fields[node.type]` for a custom
 * field kind → throw naming the type. A custom field goes through `form.AppField` directly,
 * the same TanStack primitive the built-in `create*Field` wrappers close over — see
 * `fieldRenderProps`, reused here so a custom field gets byte-for-byte the same binding shape
 * a built-in one does, not a hand-rolled subset of it. A block gets none of that: it has no
 * `name` and holds no value, so it renders from `props` alone.
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

	if (isCustomFieldNode(node)) {
		const CustomField = context.fields?.[node.type]
		if (CustomField === undefined) {
			throw new Error(`Unknown node type "${node.type}".`)
		}

		// A custom field has no `create*Field` wrapper (see `buildFieldComponents`), so it
		// binds through `form.AppField` directly — the same primitive every built-in wrapper
		// closes over. `form` carries far more than `FormFieldComponents` at runtime, exactly
		// as `conditionForm` above narrows the same instance the other way; see
		// `BindableForm`'s doc comment for why this stays a local cast rather than a wider
		// `RenderNodeArgs['form']` type.
		const bindableForm = form as unknown as BindableForm
		return (
			<bindableForm.AppField name={node.name}>
				{(field) => (
					<CustomField
						{...fieldRenderProps(field, node.type, {
							label,
							description,
							disabled: disabledByCondition,
							required: node.required,
						})}
						value={field.state.value}
						onChange={(value: unknown) => {
							field.handleChange(value as FieldValue)
						}}
						props={node.props ?? {}}
					/>
				)}
			</bindableForm.AppField>
		)
	}

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
		case 'block': {
			const Block = context.blocks?.[node.component]
			if (Block === undefined) {
				throw new Error(`Unknown block component "${node.component}".`)
			}
			return <Block props={node.props ?? {}} />
		}
		case 'submit': {
			return (
				<form.SubmitButton {...(node.disabled !== undefined && { disabled: node.disabled })}>{label}</form.SubmitButton>
			)
		}
		default: {
			// Every FormFieldType plus `section`, `block` and `submit` is handled above, and
			// `isCustomFieldNode` has already pulled out anything else — this only fires for a
			// node type that grows a member without a matching case, which is exactly what
			// should throw.
			const unhandled: { type: string } = node
			throw new Error(`Unknown node type "${unhandled.type}".`)
		}
	}
}
