import {
	buildValidator,
	isArrayNode,
	isFieldNode,
	setValueAtPath,
	stripHiddenValues,
	walkNodes,
} from '@ez-kit/form-core'
import { useMemo } from 'react'

import { SchemaTranslate } from '../options/source-context'

import { renderChildren } from './render-children'
import { assertDocumentComponents } from './required-components'

import type { CustomFieldRegistry } from './registries'
import type { LayoutComponents } from './render-node'
import type { AllFormFieldSlots, FormElementProps, NoRegistry } from '../contract'
import type { FormFieldComponents } from '../field-props'
import type { FormFieldRegistry } from '../field-registry'
import type { FormBehaviourOptions } from '../form-behaviour'
import type { AnyFormInstance } from '../form-context'
import type { FormInstance } from '../form-instance'
import type {
	AnyFormSchema,
	FormAsyncValidateOrFn,
	FormOptions,
	FormValidateOrFn,
	NamedRule,
	StandardSchemaV1,
	Translate,
} from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * The `<form>` element's own props, minus the ones `SchemaForm` owns.
 *
 * `translate` is dropped as well as `onSubmit`/`children`: `<form>` carries a DOM `translate`
 * attribute typed `'yes' | 'no'`, and without this the two definitions intersect into
 * `('yes' | 'no') & Translate` — a type nothing can satisfy, which made the renderer's own
 * documented `translate` prop impossible to pass.
 */
type FormElementRest = Omit<FormElementProps, 'onSubmit' | 'children' | 'translate'>

export type SharedSchemaFormProps<TValues> = {
	/**
	 * The document `SchemaForm` walks — field nodes, optionally grouped into `section`s.
	 * Typed `AnyFormSchema` (`FormSchema<TValues, string>`), not `FormSchema<TValues>`
	 * (`TCustom` defaulting to `never`): a schema authored with `defineFormSchema<TValues,
	 * TCustom>()` carries its own closed `TCustom` set, which would otherwise make it
	 * unassignable here the moment it declares a single custom field type.
	 */
	schema: AnyFormSchema<TValues>
	/** Resolves a `LocalizedText` translation key. Required only if the schema uses one. */
	translate?: Translate
	/**
	 * Named validation rules a `validate.rule` reference resolves against — the same shape
	 * `@ez-kit/form-core`'s `buildValidator` consumes. Only meaningful in uncontrolled mode,
	 * where `SchemaForm` calls `buildValidator` itself (see `resolveSchemaValidators`); a
	 * controlled caller builds its own instance and so builds its own validator too, the same
	 * reason `keepHiddenValues` only exists on the uncontrolled props below.
	 */
	rules?: Record<string, NamedRule>
}

/**
 * Controlled mode: the caller owns the instance and passes it in.
 *
 * In this mode `SchemaForm` cannot strip hidden values for you — you own `onSubmit`, not
 * it — so there is deliberately no `keepHiddenValues` here (see
 * `SchemaFormUncontrolledProps`, the only mode that has it). Call `stripHiddenValues`
 * yourself at the top of your own handler to get the same default the uncontrolled mode
 * gives you for free:
 *
 * ```ts
 * const form = useForm({
 *   defaultValues,
 *   onSubmit: ({ value }) => save(stripHiddenValues(schema, value)),
 * })
 * <SchemaForm form={form} schema={schema} />
 * ```
 *
 * (`stripHiddenValues` is re-exported from `@ez-kit/form-react`'s root, so this needs no
 * second dependency on `@ez-kit/form-core`.)
 *
 * Why `SchemaForm` can't do this itself: uncontrolled mode wraps `onSubmit` *before* it is
 * ever handed to `useForm` (see `UncontrolledSchemaForm` in `../create-form.tsx`), which
 * only works because `SchemaForm` is the one calling `useForm`. Here, `onSubmit` is already
 * closed over inside an instance you built yourself — by the time `SchemaForm` sees `form`,
 * there is no seam left to wrap. Reaching into the live instance from here wouldn't help
 * either: TanStack's own `useForm` re-syncs your original, unwrapped options into it on every
 * render (a per-render `formApi.update(opts)`), so any wrap `SchemaForm` applied would just
 * lose that race back to your unwrapped `onSubmit`.
 */
export type SchemaFormControlledProps<
	TValues,
	TFields extends FormFieldRegistry = AllFormFieldSlots,
> = FormElementRest &
	SharedSchemaFormProps<TValues> & {
		/**
		 * An instance over this bundle's fields. `TFields` is what keeps the two halves of the
		 * registry agreeing: a document's `{ type: 'rating' }` resolves against the bundle that
		 * registered `RatingField`, so an instance from a bundle without it is a compile error here
		 * rather than SchemaForm's "no component registered in fields derives that type id" error before
		 * the first render. The components it registered are not
		 * needed here, so any set is accepted.
		 */
		form: FormInstance<TValues, TFields, NoRegistry>
	}

/**
 * Uncontrolled mode: pass the options `useForm` takes (mirrors `FormUncontrolledProps`) and
 * `SchemaForm` runs the hook itself.
 */
export type SchemaFormUncontrolledProps<
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
	FormBehaviourOptions<TValues> &
	SharedSchemaFormProps<TValues> & {
		/** Mutually exclusive with the inline options — never pass both. */
		form?: never
		/**
		 * Keep fields hidden by a `when` condition in the submitted value instead of
		 * stripping them (spec §6's default). Stripping happens once, at submit — hiding a
		 * field never deletes what the user already typed into it (see `stripHiddenValues`).
		 */
		keepHiddenValues?: boolean
	}

/**
 * The widest shape that covers both modes — what sits behind `SchemaForm`'s overloads.
 *
 * Loose about the mode, `TValues` and the registry: the overloads have already checked the
 * caller — including that a controlled `form` comes from a bundle with the fields its document
 * names — and the renderer reads the instance's members as possibly absent.
 */
export type AnySchemaFormProps = FormElementRest &
	SharedSchemaFormProps<unknown> & {
		form?: AnyFormInstance
	}

/** The uncontrolled shape at its least specific, once the overloads have validated the caller. */
export type SchemaFormUncontrolledImplProps = SchemaFormUncontrolledProps<
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
export function isSchemaFormControlled<TValues, TFields extends FormFieldRegistry = AllFormFieldSlots>(props: {
	form?: unknown
}): props is SchemaFormControlledProps<TValues, TFields> {
	return props.form !== undefined
}

/**
 * Every field node's own `defaultValue`, written at the path its `name` describes.
 *
 * Spec §4.6: a backend-delivered schema is the only thing that knows its own fields exist,
 * so a caller who supplies no `defaultValues` still gets one built from the schema — a
 * caller-supplied `defaultValues` always wins over this (see the caller of this function).
 *
 * `name` is a full root path, so `'company.inn'` must become `{ company: { inn } }` and not
 * the literal key `"company.inn"`: TanStack binds the field to the nested path, so a flat key
 * would leave the input empty, discard the author's default, and ship a phantom dotted key in
 * the submitted payload that `stripHiddenValues` would then treat as a top-level name of its
 * own. `setValueAtPath` is the exact inverse of the `getValueAtPath` conditions read through.
 *
 * Inside an `array` that stops holding: an entry's fields are named **relative to the entry**,
 * and how many entries there will be is a property of the data, not of the schema. Writing
 * their names here would seed the form root with a phantom `firstName` beside the real
 * `people[0].firstName`. An array seeds the empty list instead, and an entry's own defaults are
 * assembled from the same subtree when one is actually added.
 */
export function schemaDefaultValues<TValues>(schema: AnyFormSchema<TValues>): Record<string, unknown> {
	// Rebound rather than mutated — `setValueAtPath` returns a new object each time.
	let defaults: Record<string, unknown> = {}
	walkNodes(schema, (node, ancestors) => {
		if (ancestors.some((ancestor) => isArrayNode(ancestor))) return
		if (isArrayNode(node)) {
			defaults = setValueAtPath(defaults, node.name, [])
			return
		}
		if (isFieldNode(node) && node.defaultValue !== undefined) {
			defaults = setValueAtPath(defaults, node.name, node.defaultValue)
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
 * Deliberately loose-typed (`unknown` in, `unknown` out): this runs in `UncontrolledSchemaForm`
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
 * Whether any field node in `schema` declares a `validate` block. Cheap on its own, but called
 * from `resolveSchemaValidators`, which `UncontrolledSchemaForm` memoises — so in practice
 * this only re-walks the tree when `schema` itself changes identity, not on every render.
 */
export function schemaHasValidateConstraints<TValues>(schema: AnyFormSchema<TValues>): boolean {
	let hasConstraints = false
	walkNodes(schema, (node) => {
		if (isFieldNode(node) && node.validate !== undefined) hasConstraints = true
	})
	return hasConstraints
}

/**
 * The `validators` option `UncontrolledSchemaForm` hands to `useForm` — either the schema's
 * declarative constraints compiled by `buildValidator`, or the caller's own `validators`
 * verbatim. Never both: TanStack Form accepts exactly one validator per trigger, a standard
 * schema *or* a function, so there is no way to merge two issue sets onto one path without
 * risking duplicated messages in an undefined order (spec §7.4, §9.3). A caller who needs both
 * a schema and hand-written checks still has the documented escape hatch — field-level
 * validators through the native `form.Field` compose with either mode, because TanStack runs
 * field-level and form-level validators together.
 *
 * Throws (rather than silently picking a winner) when the schema declares constraints *and*
 * the caller also supplied `validators` — the two would otherwise race for the same
 * `onChange`/`onSubmit` slot with no defined precedence.
 *
 * Not memoised here: this is a plain function so it stays trivially unit-testable. Its one
 * call site (`UncontrolledSchemaForm`) wraps it in `useMemo` — every call otherwise re-walks
 * the schema and, when constraints exist, builds a fresh `buildValidator` instance and a fresh
 * `{ onChange, onSubmit }` object, which would hand `useForm` a differently-identitied
 * `validators` value on every render.
 */
export function resolveSchemaValidators<TValues>(
	schema: AnyFormSchema<TValues>,
	callerValidators: unknown,
	rules: Record<string, NamedRule> | undefined,
	translate: Translate | undefined,
): unknown {
	if (!schemaHasValidateConstraints(schema)) return callerValidators

	if (callerValidators !== undefined) {
		throw new Error(
			'SchemaForm received both schema `validate` constraints and a `validators` prop. ' +
				'Use either the schema constraints or your own `validators` — never both. ' +
				'Field-level validators through `form.Field` still compose with either.',
		)
	}

	const validator: StandardSchemaV1<TValues, TValues> = buildValidator(schema, {
		...(rules !== undefined && { rules }),
		...(translate !== undefined && { translate }),
	})
	return { onChange: validator, onSubmit: validator }
}

/**
 * Render the schema's top-level children — one already-bound field component per field node,
 * one component from `components` per block, recursively — via `renderChildren`, on a `Grid`
 * when the document sets `columns`.
 *
 * `layout` is the kit's raw `components`, separate from `form`'s bound field components: a block
 * resolves its `component` there, and unlike a field it has no form state of its own. `fields`
 * resolves `type: '<custom>'` nodes (spec §4.7, §8). It is **required**: it is the factory's own
 * registry, keyed by the document id each component name derives (`deriveFieldTypeIds`), so the
 * factory always has one to pass. Do not make it optional: a call site that passes `{}` instead
 * compiles, and turns every custom field in every document into a missing-field error.
 *
 * Every component the document can need is asserted first, visible or not — see
 * `assertDocumentComponents`. The walk is memoised on the schema and the registries, so it runs
 * once per document rather than on every render; that is why the body is a component
 * (`SchemaFields`) rather than inline in this function.
 */
export function renderSchemaFields<TValues>(
	schema: AnyFormSchema<TValues>,
	instance: object,
	layout: LayoutComponents,
	translate: Translate | undefined,
	fields: CustomFieldRegistry,
): ReactNode {
	return (
		<SchemaFields
			schema={schema as AnyFormSchema<unknown>}
			instance={instance}
			layout={layout}
			translate={translate}
			fields={fields}
		/>
	)
}

type SchemaFieldsProps = {
	schema: AnyFormSchema<unknown>
	instance: object
	layout: LayoutComponents
	translate: Translate | undefined
	fields: CustomFieldRegistry
}

/** The body of {@link renderSchemaFields}. */
function SchemaFields({ schema, instance, layout, translate, fields }: SchemaFieldsProps): ReactNode {
	// The instance carries exactly what its bundle registered; the renderer reads every member as
	// possibly absent and names what a document needed and did not get.
	const form = instance as FormFieldComponents<unknown>
	useMemo(() => {
		assertDocumentComponents(schema, layout, { instance, custom: fields })
	}, [schema, layout, instance, fields])

	// `itemPath` starts undefined: the schema root sits in no array entry, and each array node
	// replaces it for the subtree of every entry it renders.
	const context = { translate, fields, itemPath: undefined }

	// `SchemaTranslate` is the one thing the renderer publishes through context rather than
	// through `RenderNode`'s props: an option source's labels are `LocalizedText` too, and the
	// source is resolved inside the *field* component, which sees only the field's own props.
	return (
		<SchemaTranslate translate={translate}>
			{renderChildren(schema.children, { form, layout, context, columns: schema.columns })}
		</SchemaTranslate>
	)
}
