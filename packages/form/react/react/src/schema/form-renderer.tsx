import { isFieldNode, stripHiddenValues, walkNodes } from '@ez-kit/form-core'

import { renderChildren } from './render-children'

import type { LayoutComponents } from './render-node'
import type { SubmittableForm } from '../bindable-form'
import type { FormElementProps } from '../contract'
import type { FormFieldComponents } from '../field-props'
import type {
	AnyFormSchema,
	FormAsyncValidateOrFn,
	FormOptions,
	FormSchema,
	FormValidateOrFn,
	Translate,
} from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/** The `<form>` element's own props, minus the two `FormRenderer` owns. */
type FormElementRest = Omit<FormElementProps, 'onSubmit' | 'children'>

export type SharedRendererProps<TValues> = {
	/** The document `FormRenderer` walks — field nodes, optionally grouped into `section`s. */
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

/**
 * Controlled mode: the caller owns the instance and passes it in.
 *
 * There is deliberately no `keepHiddenValues` here — spec §6's stripping only happens for
 * uncontrolled `FormRenderer`. It wraps the caller's `onSubmit` before it is ever handed to
 * `useForm` (see `UncontrolledFormRenderer` in `../create-form.tsx`), which only works
 * because `FormRenderer` is the one calling `useForm`. In controlled mode `onSubmit` is
 * already closed over inside an instance the caller built themselves — by the time
 * `FormRenderer` sees `form`, there is no seam left to wrap, and the caller's own `useForm`
 * re-syncs its original, unwrapped options on every render (TanStack's own per-render
 * `formApi.update(opts)`), so even mutating the live instance from here would just lose the
 * race back to the caller's unwrapped `onSubmit`. A controlled caller who wants hidden values
 * stripped calls `stripHiddenValues(schema, value)` themselves inside their own `onSubmit`.
 */
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
		/**
		 * Keep fields hidden by a `when` condition in the submitted value instead of
		 * stripping them (spec §6's default). Stripping happens once, at submit — hiding a
		 * field never deletes what the user already typed into it (see `stripHiddenValues`).
		 */
		keepHiddenValues?: boolean
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
 * The one submit-time hook: strip fields spec §5 currently hides (per `stripHiddenValues`)
 * out of `value` before the caller's own `onSubmit` ever sees it, unless `keepHiddenValues`
 * opted out. Returns `onSubmit` untouched when there is nothing to wrap — `undefined` stays
 * `undefined` rather than becoming a no-op function TanStack would still treat as "handler
 * provided".
 *
 * Deliberately loose-typed (`unknown` in, `unknown` out): this runs in `UncontrolledFormRenderer`
 * against `options` before it is cast to the real, deeply-generic `FormOptions<…>` shape — see
 * the call site in `../create-form.tsx`, which already casts the same object the same way.
 */
export function stripHiddenValuesOnSubmit<TValues>(
	schema: AnyFormSchema<TValues>,
	onSubmit: unknown,
	keepHiddenValues: boolean | undefined,
): unknown {
	if (typeof onSubmit !== 'function' || keepHiddenValues === true) return onSubmit

	return (submitProps: { value: TValues } & Record<string, unknown>) =>
		(onSubmit as (props: unknown) => unknown)({
			...submitProps,
			value: stripHiddenValues(schema, submitProps.value),
		})
}

/**
 * Render the schema's top-level children — one already-bound field component per field
 * node, a headed, column-gridded block per `section`, recursively — via `renderChildren`.
 *
 * `layout` carries `Section`/`GridItem` straight from the kit's raw `components`, separate
 * from `form`'s bound field components: unlike a field, a section has no form state of its
 * own. There is no enclosing grid at the top level, so `parentColumns` starts `undefined`.
 * Container node types not yet supported by this renderer (`step`, `submit`, `block`) throw
 * via `RenderNode`'s default case; a custom field kind (registry-supplied) throws with its
 * own message — both are hard errors rather than a silent skip, since a schema author who
 * reaches for one expects it to render.
 */
export function renderSchemaFields<TValues>(
	schema: FormSchema<TValues>,
	form: FormFieldComponents<TValues>,
	layout: LayoutComponents,
	translate: Translate | undefined,
): ReactNode {
	return renderChildren(schema.children, {
		form,
		layout,
		context: { translate },
		parentColumns: undefined,
	})
}
