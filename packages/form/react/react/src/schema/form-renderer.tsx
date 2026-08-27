import { FORM_FIELD_TYPES, isFieldNode, walkNodes } from '@ez-kit/form-core'
import { Fragment } from 'react'

import { renderNode } from './render-node'

import type { SubmittableForm } from '../bindable-form'
import type { FormElementProps } from '../contract'
import type { FormFieldComponents } from '../field-props'
import type {
	AnyFormSchema,
	CustomFieldNode,
	FieldNode,
	FormAsyncValidateOrFn,
	FormOptions,
	FormSchema,
	FormValidateOrFn,
	Translate,
} from '@ez-kit/form-core'
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

/** The `<form>` element's own props, minus the two `FormRenderer` owns. */
type FormElementRest = Omit<FormElementProps, 'onSubmit' | 'children'>

export type SharedRendererProps<TValues> = {
	/** The document `FormRenderer` walks — a flat list of field nodes in this slice. */
	schema: FormSchema<TValues>
	/** Resolves a `LocalizedText` translation key. Required only if the schema uses one. */
	translate?: Translate
}

/**
 * What `FormRenderer` needs from a form instance: enough to wire `<form onSubmit>` (from
 * `SubmittableForm`) and one bound component per field kind (from `FormFieldComponents`).
 * Narrower than the full `KitFormApi` on purpose — mirrors why `FormControlledProps` types
 * its `form` as `SubmittableForm` rather than the whole TanStack surface.
 */
export type RendererForm<TValues> = SubmittableForm & FormFieldComponents<TValues>

/** Controlled mode: the caller owns the instance and passes it in. */
export type FormRendererControlledProps<TValues> = FormElementRest &
	SharedRendererProps<TValues> & {
		form: RendererForm<TValues>
	}

/**
 * Uncontrolled mode: pass the options `useForm` takes (mirrors `FormUncontrolledProps`) and
 * `FormRenderer` runs the hook itself.
 */
export type FormRendererUncontrolledProps<
	TValues,
	TOnMount extends undefined | FormValidateOrFn<TValues>,
	TOnChange extends undefined | FormValidateOrFn<TValues>,
	TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TValues>,
	TOnBlur extends undefined | FormValidateOrFn<TValues>,
	TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TValues>,
	TOnSubmit extends undefined | FormValidateOrFn<TValues>,
	TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TValues>,
	TOnDynamic extends undefined | FormValidateOrFn<TValues>,
	TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TValues>,
	TOnServer extends undefined | FormAsyncValidateOrFn<TValues>,
	TSubmitMeta,
> = FormElementRest &
	FormOptions<
		TValues,
		TOnMount,
		TOnChange,
		TOnChangeAsync,
		TOnBlur,
		TOnBlurAsync,
		TOnSubmit,
		TOnSubmitAsync,
		TOnDynamic,
		TOnDynamicAsync,
		TOnServer,
		TSubmitMeta
	> &
	SharedRendererProps<TValues> & {
		/** Mutually exclusive with the inline options — never pass both. */
		form?: never
	}

/** The widest shape that covers both modes — what sits behind `FormRenderer`'s overloads. */
export type AnyFormRendererProps = FormElementRest &
	SharedRendererProps<unknown> & {
		form?: RendererForm<unknown>
	}

/** The uncontrolled shape at its least specific, once the overloads have validated the caller. */
export type FormRendererUncontrolledImplProps = FormRendererUncontrolledProps<
	unknown,
	undefined,
	undefined,
	undefined,
	undefined,
	undefined,
	undefined,
	undefined,
	undefined,
	undefined,
	undefined,
	never
>

/** Which mode the caller picked — `form` is the discriminant, exactly as for `Form`. */
export function isRendererControlled<TValues>(props: {
	form?: unknown
}): props is FormRendererControlledProps<TValues> {
	return props.form !== undefined
}

/**
 * Every field node's own `defaultValue`, keyed by its `name`.
 *
 * Spec §4.6: a backend-delivered schema is the only thing that knows its own fields exist,
 * so a caller who supplies no `defaultValues` still gets one built from the schema — a
 * caller-supplied `defaultValues` always wins over this (see the caller of this function).
 */
export function schemaDefaultValues<TValues>(schema: AnyFormSchema<TValues>): Record<string, unknown> {
	const defaults: Record<string, unknown> = {}
	walkNodes(schema, (node) => {
		if (isFieldNode(node) && node.defaultValue !== undefined) {
			defaults[node.name] = node.defaultValue
		}
	})
	return defaults
}

/**
 * Walk the schema and render one already-bound field component per field node.
 *
 * Depth-first via `walkNodes`, filtered to field nodes: this slice supports a flat list, so
 * every node the test schemas declare is a direct child and a container simply has no
 * field nodes to skip over. Container node types themselves (`section`, `step`, `submit`,
 * `block`) are silently not rendered — they are out of scope for this slice. A custom field
 * kind (registry-supplied) is a hard error rather than a silent skip: unlike a container, a
 * schema author who reaches for one expects it to render.
 */
export function renderSchemaFields<TValues>(
	schema: FormSchema<TValues>,
	form: FormFieldComponents<TValues>,
	translate: Translate | undefined,
): ReactNode {
	const nodes: ReactNode[] = []
	walkNodes(schema, (node) => {
		if (!isFieldNode(node)) return
		if (!isBuiltInFieldNode(node)) {
			throw new Error(
				`Custom field type "${node.type}" needs a field-type registry, which this renderer does not support yet.`,
			)
		}
		nodes.push(<Fragment key={node.name}>{renderNode({ node, form, context: { translate } })}</Fragment>)
	})
	return nodes
}
