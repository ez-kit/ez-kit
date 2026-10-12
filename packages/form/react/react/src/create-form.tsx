'use client'

import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
import { useMemo } from 'react'

import { buildFieldComponents } from './build-field-components'
import { deriveFieldTypeIds } from './field-registry'
import { FormProvider } from './form-context'
import { splitFormProps } from './form-options'
import { FormShell } from './form-shell'
import { NO_INJECTED_COMPONENTS } from './kit-form'
import { assertNoReservedFieldKeyCollision } from './schema/registries'
import {
	isSchemaFormControlled,
	renderSchemaFields,
	resolveSchemaValidators,
	schemaDefaultValues,
	stripHiddenValuesOnSubmit,
} from './schema/schema-form'

import type { BindableForm } from './bindable-form'
import type { KitFormBlock, KitWithFormProps } from './composition'
import type {
	AllFormFieldSlots,
	FormComponentRegistry,
	FormComponents,
	FormElementProps,
	FormFieldSlots,
} from './contract'
import type { FormFieldRegistry } from './field-registry'
import type { FormControlledProps, AnyFormProps, FormUncontrolledImplProps, FormUncontrolledProps } from './form-props'
import type { KitFormApi } from './kit-form'
import type { CustomFieldRegistry } from './schema/registries'
import type {
	AnySchemaFormProps,
	SchemaFormControlledProps,
	SchemaFormUncontrolledImplProps,
	SchemaFormUncontrolledProps,
} from './schema/schema-form'
import type { FormAsyncValidateOrFn, FormOptions, FormValidateOrFn } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

export type CreateFormOptions<
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- no fields registered
	TFields extends FormFieldRegistry = {},
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- no components registered
	TComponents extends FormComponentRegistry = {},
> = {
	/**
	 * The `<form>` element `<Form>` and `<SchemaForm>` render. A plain `<form>` when omitted.
	 *
	 * It receives the full `<form>` props — `onSubmit`, `noValidate`, `data-form` and whatever
	 * the caller put on `<Form>` — and must put them on a real `<form>` element.
	 */
	FormElement?: (props: FormElementProps) => ReactNode
	/**
	 * The field kinds, keyed by component name — any subset of the kit's twelve and its array
	 * frame, plus whatever the app adds. Each key becomes `form.<Key>`; nothing else does.
	 *
	 * Every key that is not one of the built-ins is bound by the generic binder and reachable as
	 * `form.<Key>`, under the document id its name derives (`RatingField` → `rating`).
	 *
	 * The `& Pick<FormFieldSlots, …>` is what re-asserts the built-ins **here**, and it is
	 * load-bearing. `FormFieldRegistry`'s own bound has to take `any` props — parameters are
	 * contravariant, so a narrower bound would reject a correct kit — which means the bound alone
	 * checks nothing about a built-in key. The spread-and-override form — `{ ...formFieldSlots, TextField: X }` —
	 * is an object literal checked against the registry, never against a kit's own `satisfies`,
	 * so without this intersection `TextField: (p: { totallyUnrelated: symbol }) => null` would
	 * compile, reach the bespoke text binder, and hand the author a `TextFieldRenderProps` their
	 * component never declared.
	 *
	 * A `Pick` over the keys actually passed rather than the whole `FormFieldSlots`: inferring
	 * `TFields` from `TFields & FormFieldSlots` matches a source *typed* `FormFieldSlots` against
	 * the fixed half and leaves nothing to infer from, so a kit set annotated `: FormFieldSlots`
	 * would produce an instance with no fields. The `Pick` depends on `TFields`, which keeps the
	 * inference on the whole source and the check on exactly the keys it names.
	 */
	fields?: TFields & Pick<FormFieldSlots, keyof TFields & keyof FormFieldSlots>
	/**
	 * Any components, each attached to the instance as-is under its key: `{ SaveBar }` gives
	 * `<form.SaveBar />` with `SaveBar`'s own props. A component reads the form through
	 * `useFormContext()`, so it is the same component whether it is rendered as `form.SaveBar` or
	 * directly.
	 *
	 * The `& Pick<FormComponents, …>` re-asserts the props of the four keys the kit contract
	 * names, for the reason — and in the shape — `fields` re-asserts the built-ins. `SubmitButton`,
	 * `Section`, `GridItem` and `Wizard` are also what `SchemaForm` draws a `submit`, `section`,
	 * grid cell and stepped document with.
	 */
	components?: TComponents & Pick<FormComponents, keyof TComponents & keyof FormComponents>
}

/**
 * Create the form bundle bound to one UI kit's components — the `createDataGrid`
 * analogue for forms.
 *
 * `useForm` is a **superset of TanStack Form's `useForm`**: the instance carries flat,
 * fully-wired components for exactly the `fields` and `components` passed, plus the two
 * primitives every form has (`form.Submit`, `form.Array`), while the entire native API
 * (`form.Field`, `form.Subscribe`, `form.handleSubmit`, `form.state`, `form.AppField`, …) stays
 * untouched on the same object. `Form` renders the `<form>` element, either around a
 * caller-owned instance or around one it creates itself.
 *
 * Every option is optional: `createForm()` alone gives a form with a plain `<form>` and only
 * the primitives.
 *
 * Validation is pure pass-through: hand TanStack's native standard-schema validators
 * (zod / valibot / arktype) via `validators.onChange` / `onBlur` / `onSubmit`.
 *
 * @example
 * // in a kit package
 * export const { useForm, Form } = createForm({
 *   FormElement,
 *   fields: formFieldSlots,
 *   components: formComponents,
 * })
 *
 * // in an app that registers the fields it uses and a component of its own
 * export const { useForm, Form } = createForm({
 *   FormElement,
 *   fields: { TextField, NumberField, RatingField },
 *   components: { SubmitButton, SaveBar },
 * })
 *
 * // in an app — the form lives exactly as long as the element
 * <Form defaultValues={{ email: '' }} onSubmit={({ value }) => save(value)}>
 *   {(form) => (
 *     <>
 *       <form.TextField name='email' label='Email' />
 *       <form.SubmitButton>Save</form.SubmitButton>
 *     </>
 *   )}
 * </Form>
 */
export function createForm<
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- no fields registered
	TFields extends FormFieldRegistry = {},
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- no components registered
	TComponents extends FormComponentRegistry = {},
>(options: CreateFormOptions<TFields, TComponents> = {}) {
	/**
	 * Read once, here, so every consumer below — the field builder, the schema renderer and the
	 * three `FormElement` call sites — sees the same component identities. Nothing is filled in:
	 * a key that was not passed is not on the instance, and `SchemaForm` names what a document
	 * needed and did not get.
	 */
	const FormElement = options.FormElement ?? DEFAULT_FORM_ELEMENT
	const fields: FormFieldRegistry = options.fields ?? {}
	const components: FormComponentRegistry & FormComponents = options.components ?? {}

	/**
	 * The same registry, re-keyed by the document id each component name derives — what the
	 * schema renderer resolves a `{ type: 'rating' }` node against.
	 *
	 * Built once, here, never per render: the registry is static authored config, so a key
	 * that derives a duplicate or reserved document id is a configuration error the app hears
	 * about at startup rather than on the first document that happens to use it.
	 *
	 * This is the **only** field registration site — `SchemaForm` has no `fields` prop —
	 * so a field registered on the factory is reachable from JSX as `form.RatingField` and
	 * from a document as `{ type: 'rating' }`, and the two halves cannot disagree. The
	 * built-in ids in here (`text`, `number`, …) are unreachable by construction:
	 * `isCustomFieldNode` pulls them out before `RenderNode` ever consults this map, so a
	 * replaced `TextField` still goes through its own bespoke binder.
	 */
	const customFieldsById: CustomFieldRegistry = Object.fromEntries(
		Object.entries(deriveFieldTypeIds(fields)).map(([id, key]) => [id, fields[key] as CustomFieldRegistry[string]]),
	)

	const { fieldContext, formContext } = createFormHookContexts()
	const {
		useAppForm,
		withForm: tanstackWithForm,
		withFieldGroup,
	} = createFormHook({
		fieldContext,
		formContext,
		fieldComponents: NO_INJECTED_COMPONENTS,
		formComponents: NO_INJECTED_COMPONENTS,
	})

	/**
	 * The generic list mirrors `useAppForm` verbatim so validator and submit-meta inference
	 * survives the wrapper — narrowing it here would silently degrade the consumer's types.
	 */
	function useForm<
		TFormData,
		TOnMount extends undefined | FormValidateOrFn<TFormData>,
		TOnChange extends undefined | FormValidateOrFn<TFormData>,
		TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnBlur extends undefined | FormValidateOrFn<TFormData>,
		TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
		TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
		TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
		TSubmitMeta,
	>(
		formOptions: FormOptions<
			TFormData,
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
		>,
	): KitFormApi<
		TFormData,
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
		TSubmitMeta,
		TFields,
		TComponents
	> {
		const form = useAppForm(formOptions)

		const fieldComponents = useMemo(
			() => buildFieldComponents<TFormData>(form as unknown as BindableForm, fields),
			// The form instance is stable for the lifetime of the component, so the field
			// components — and therefore the mounted inputs — are built exactly once.
			[form],
		)

		// Augmenting the instance rather than spreading it: the TanStack form API is a class
		// with prototype methods and getters, which a spread would flatten and break. The
		// components go on as-is — they read the form from context, so nothing binds them.
		return useMemo(
			() =>
				Object.assign(form, fieldComponents, components) as unknown as KitFormApi<
					TFormData,
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
					TSubmitMeta,
					TFields,
					TComponents
				>,
			[form, fieldComponents],
		)
	}

	/**
	 * Uncontrolled mode, split out so the hook is called unconditionally.
	 *
	 * Mounting this element **is** creating the form, which is what makes the uncontrolled
	 * mode correct inside a dialog: closing it unmounts the element and the state goes with
	 * it, instead of surviving in a parent that happens to have called the hook.
	 */
	function UncontrolledForm<
		TFormData,
		TOnMount extends undefined | FormValidateOrFn<TFormData>,
		TOnChange extends undefined | FormValidateOrFn<TFormData>,
		TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnBlur extends undefined | FormValidateOrFn<TFormData>,
		TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
		TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
		TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
		TSubmitMeta,
	>(
		props: FormUncontrolledProps<
			TFormData,
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
			TSubmitMeta,
			TFields,
			TComponents
		>,
	): ReactNode {
		const { children, form: _ignored, ...rest } = props
		const { options, elementProps } = splitFormProps(rest)
		const instance = useForm(
			options as FormOptions<
				TFormData,
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
			>,
		)

		return (
			<FormShell
				form={instance}
				FormElement={FormElement}
				elementProps={elementProps}
			>
				{children(instance)}
			</FormShell>
		)
	}

	/**
	 * The `<form>` element, in either mode. See {@link FormProps} for the two shapes.
	 *
	 * Two overloads rather than one union parameter: TypeScript does not infer generics
	 * through a union target, so a single `FormProps` parameter would silently fall back to
	 * the defaults and strip the types off `validators` and `onSubmit`.
	 */
	function Form(props: FormControlledProps): ReactNode
	function Form<
		TFormData,
		TOnMount extends undefined | FormValidateOrFn<TFormData>,
		TOnChange extends undefined | FormValidateOrFn<TFormData>,
		TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnBlur extends undefined | FormValidateOrFn<TFormData>,
		TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
		TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
		TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
		TSubmitMeta,
	>(
		props: FormUncontrolledProps<
			TFormData,
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
			TSubmitMeta,
			TFields,
			TComponents
		>,
	): ReactNode
	function Form(props: AnyFormProps): ReactNode {
		if (isControlled(props)) {
			const { form, children, ...elementProps } = props
			return (
				<FormShell
					form={form}
					FormElement={FormElement}
					elementProps={elementProps}
				>
					{children}
				</FormShell>
			)
		}

		// Overload resolution has already checked the caller; the implementation signature is
		// deliberately the loose one, so the shape is spelled out again for the inner component.
		return <UncontrolledForm {...(props as FormUncontrolledImplProps<TFields, TComponents>)} />
	}

	/**
	 * Uncontrolled mode for `SchemaForm`, split out for the same reason as `UncontrolledForm`
	 * — the hook must run unconditionally.
	 */
	function UncontrolledSchemaForm<
		TFormData,
		TOnMount extends undefined | FormValidateOrFn<TFormData>,
		TOnChange extends undefined | FormValidateOrFn<TFormData>,
		TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnBlur extends undefined | FormValidateOrFn<TFormData>,
		TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
		TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
		TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
		TSubmitMeta,
	>(
		props: SchemaFormUncontrolledProps<
			TFormData,
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
		>,
	): ReactNode {
		const { schema, translate, keepHiddenValues, blocks, rules, form: _ignored, ...rest } = props
		assertNoReservedFieldKeyCollision(blocks)
		const { options, elementProps } = splitFormProps(rest)
		// Spec §4.6: the schema's own `defaultValue` entries seed the form when the caller
		// supplies none — theirs wins whenever they do.
		const defaultValues = {
			...schemaDefaultValues(schema),
			...(options.defaultValues as Record<string, unknown> | undefined),
		}
		// Spec §7.4, §9.3: the schema's `validate` constraints drive `validators.onChange` /
		// `onSubmit`, or the caller's own `validators` are used verbatim — never both. This
		// only works because this component is the one calling `useForm` — same reason
		// `stripHiddenValuesOnSubmit` below only exists in this mode.
		//
		// Memoised: `resolveSchemaValidators` re-walks the whole schema tree, and when the
		// schema declares constraints it builds a brand-new `buildValidator` instance and a
		// brand-new `{ onChange, onSubmit }` object each call. Without this, `useForm` would
		// receive a differently-identitied `validators` value on every render — the same
		// reason `fields` and the merged instance below are memoised.
		const validators = useMemo(
			() => resolveSchemaValidators(schema, options.validators, rules, translate),
			[schema, options.validators, rules, translate],
		)
		// Spec §6: strip fields the schema currently hides out of the submitted value, unless
		// the caller opted out with `keepHiddenValues`. This only works because this component
		// is the one calling `useForm` — see `stripHiddenValuesOnSubmit`'s doc comment on why
		// the controlled overload below cannot do the same.
		const instance = useForm({
			...options,
			validators,
			onSubmit: stripHiddenValuesOnSubmit(schema, options.onSubmit, keepHiddenValues),
			defaultValues,
		} as FormOptions<
			TFormData,
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
		>)

		return (
			<FormShell
				form={instance}
				FormElement={FormElement}
				elementProps={elementProps}
			>
				{renderSchemaFields(schema, instance, components, translate, customFieldsById, blocks)}
			</FormShell>
		)
	}

	/**
	 * Renders one bound field component per field node in `schema`, through the very same
	 * `form.TextField` / `form.NumberField` / … components the JSX API exposes — see
	 * `renderNode`. A config-driven form and a hand-written one therefore produce identical
	 * DOM.
	 *
	 * Two overloads for the same reason as `Form`: TypeScript does not infer generics
	 * through a union target.
	 */
	function SchemaForm<TValues>(props: SchemaFormControlledProps<TValues, TFields>): ReactNode
	function SchemaForm<
		TFormData,
		TOnMount extends undefined | FormValidateOrFn<TFormData>,
		TOnChange extends undefined | FormValidateOrFn<TFormData>,
		TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnBlur extends undefined | FormValidateOrFn<TFormData>,
		TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
		TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
		TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
		TSubmitMeta,
	>(
		props: SchemaFormUncontrolledProps<
			TFormData,
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
		>,
	): ReactNode
	function SchemaForm(props: AnySchemaFormProps<TFields>): ReactNode {
		if (isSchemaFormControlled<unknown, TFields>(props)) {
			const { form, schema, translate, blocks, rules: _rules, ...elementProps } = props
			assertNoReservedFieldKeyCollision(blocks)
			return (
				<FormShell
					form={form}
					FormElement={FormElement}
					elementProps={elementProps}
				>
					{renderSchemaFields(schema, form, components, translate, customFieldsById, blocks)}
				</FormShell>
			)
		}

		// Overload resolution has already checked the caller; the implementation signature is
		// deliberately the loose one, so the shape is spelled out again for the inner component.
		return <UncontrolledSchemaForm {...(props as SchemaFormUncontrolledImplProps)} />
	}

	/**
	 * TanStack's `withForm`, retyped — spec §12.
	 *
	 * Zero runtime: this hands the options straight to TanStack, which only closes over
	 * `render`. The single thing the wrapper changes is the declared type of the render
	 * prop's `form`: TanStack types it as `AppFieldExtendedReactFormApi<…>` parameterised by
	 * the components injected into `createFormHook` — and this adapter injects none, because
	 * the kit's primitives reach the fields by closure — so `form.TextField` would fail to
	 * compile inside a block while working perfectly at runtime. `KitFormApi` is the type
	 * `useForm` already returns, so a block sees exactly the instance it is handed.
	 *
	 * The generic list mirrors `useForm` verbatim for the same reason it does there:
	 * narrowing it would silently degrade validator and submit-meta inference.
	 *
	 * **The form options are required, not optional.** `defaultValues` (or another option
	 * that pins the shape) is the only inference site for `TFormData`, so a block written as
	 * `withForm({ render })` infers `TFormData = unknown`, which collapses `DeepKeys<unknown>`
	 * to `never`: no field name is writable inside such a block, and no real form is
	 * assignable to it from outside. TanStack keeps that shape alive with an internal
	 * `UnwrapOrAny`, which cannot be mirrored here — it needs `any`, which lint bans. Always
	 * declare the block against the form data it belongs to.
	 *
	 * @example
	 * const AddressBlock = withForm({
	 *   defaultValues: { street: '' },
	 *   render: ({ form }) => <form.TextField name='street' label='Street' />,
	 * })
	 */
	function withForm<
		TFormData,
		TOnMount extends undefined | FormValidateOrFn<TFormData>,
		TOnChange extends undefined | FormValidateOrFn<TFormData>,
		TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnBlur extends undefined | FormValidateOrFn<TFormData>,
		TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
		TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
		TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
		TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
		TSubmitMeta,
		// `Record<never, never>`, deliberately not `Record<string, never>`: a block declared
		// without the `props` option has no inference site for `TRenderProps`, so the default
		// applies — and an index signature of `never` makes every prop of the returned
		// component uninhabitable, `form` included, so it could not be rendered at all.
		// (`{}` would do as well but trips `@typescript-eslint/no-empty-object-type`.)
		TRenderProps extends object = Record<never, never>,
	>(
		options: KitWithFormProps<
			TFormData,
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
			TSubmitMeta,
			TRenderProps,
			TFields,
			TComponents
		>,
	): KitFormBlock<
		TFormData,
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
		TSubmitMeta,
		TRenderProps,
		TFields,
		TComponents
	> {
		// The two shapes differ only in the `form` type discussed above, which no assignment
		// can express: a component asking for the richer `KitFormApi` is not assignable to one
		// asking for TanStack's plainer API, and vice versa. Hence the round trip.
		const block: unknown = tanstackWithForm(options as never)

		return block as KitFormBlock<
			TFormData,
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
			TSubmitMeta,
			TRenderProps,
			TFields,
			TComponents
		>
	}

	// `withFieldGroup` needs no retyping and is re-exported as TanStack builds it: its render
	// prop receives a **group** API, which correctly carries no flat field components (spec
	// §12 — native `form.Field` territory), and the parent `form` prop of the component it
	// returns already accepts a `KitFormApi`, that type being an intersection over TanStack's.
	return { useForm, Form, FormProvider, SchemaForm, withForm, withFieldGroup }
}

/**
 * The `<form>` element when the caller passed no `FormElement`: the intrinsic tag, which takes
 * exactly the props a kit's element is handed.
 */
const DEFAULT_FORM_ELEMENT = 'form'

/**
 * Which mode the caller picked.
 *
 * `form` is the discriminant: the uncontrolled shape declares it as `form?: never`, so its
 * only legal value there is `undefined`.
 */
function isControlled(props: { form?: unknown }): props is FormControlledProps {
	return props.form !== undefined
}

/**
 * The bundle `createForm` returns — mirrors `DataGridBundle` in the grid packages.
 *
 * Spelled with an explicit instantiation rather than a bare `ReturnType<typeof createForm>`:
 * on a generic function that form instantiates at the constraint, which would quietly type
 * every bundle over `FormFieldRegistry` and lose the app's own field kinds.
 */
export type FormBundle<
	TFields extends FormFieldRegistry = AllFormFieldSlots,
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- no components registered
	TComponents extends FormComponentRegistry = {},
> = ReturnType<typeof createForm<TFields, TComponents>>
