'use client'

import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
import { useMemo } from 'react'

import { buildFieldComponents } from './build-field-components'
import { splitFormProps } from './form-options'
import { FormShell } from './form-shell'
import { NO_INJECTED_COMPONENTS } from './kit-form'
import {
	isRendererControlled,
	renderSchemaFields,
	resolveSchemaValidators,
	schemaDefaultValues,
	stripHiddenValuesOnSubmit,
} from './schema/form-renderer'
import { assertNoReservedFieldKeyCollision } from './schema/registries'

import type { BindableForm } from './bindable-form'
import type { KitFormBlock, KitWithFormProps } from './composition'
import type { FormComponents } from './contract'
import type { FormControlledProps, AnyFormProps, FormUncontrolledImplProps, FormUncontrolledProps } from './form-props'
import type { KitFormApi } from './kit-form'
import type {
	AnyFormRendererProps,
	FormRendererControlledProps,
	FormRendererUncontrolledImplProps,
	FormRendererUncontrolledProps,
} from './schema/form-renderer'
import type { FormAsyncValidateOrFn, FormOptions, FormValidateOrFn } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

export type CreateFormOptions = {
	/** The kit's implementation of the UI contract. Every primitive is required. */
	components: FormComponents
}

/**
 * Create the form bundle bound to one UI kit's components — the `createDataGrid`
 * analogue for forms.
 *
 * `useForm` is a **superset of TanStack Form's `useForm`**: the instance carries flat,
 * fully-wired field components (`form.TextField`, `form.NumberField`, …) plus
 * `form.SubmitButton`, while the entire native API (`form.Field`, `form.Subscribe`,
 * `form.handleSubmit`, `form.state`, `form.AppField`, …) stays untouched on the same
 * object. `Form` renders the `<form>` element, either around a caller-owned instance or
 * around one it creates itself.
 *
 * Validation is pure pass-through: hand TanStack's native standard-schema validators
 * (zod / valibot / arktype) via `validators.onChange` / `onBlur` / `onSubmit`.
 *
 * @example
 * // in a kit package
 * export const { useForm, Form } = createForm({ components })
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
export function createForm({ components }: CreateFormOptions) {
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
		options: FormOptions<
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
		TSubmitMeta
	> {
		const form = useAppForm(options)

		const fields = useMemo(
			() => buildFieldComponents<TFormData>(form as unknown as BindableForm, components),
			// The form instance is stable for the lifetime of the component, so the field
			// components — and therefore the mounted inputs — are built exactly once.
			[form],
		)

		// Augmenting the instance rather than spreading it: the TanStack form API is a class
		// with prototype methods and getters, which a spread would flatten and break.
		return useMemo(() => Object.assign(form, fields), [form, fields])
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
			TSubmitMeta
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
				FormElement={components.Form}
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
			TSubmitMeta
		>,
	): ReactNode
	function Form(props: AnyFormProps): ReactNode {
		if (isControlled(props)) {
			const { form, children, ...elementProps } = props
			return (
				<FormShell
					form={form}
					FormElement={components.Form}
					elementProps={elementProps}
				>
					{children}
				</FormShell>
			)
		}

		// Overload resolution has already checked the caller; the implementation signature is
		// deliberately the loose one, so the shape is spelled out again for the inner component.
		return <UncontrolledForm {...(props as FormUncontrolledImplProps)} />
	}

	/**
	 * Uncontrolled mode for `FormRenderer`, split out for the same reason as `UncontrolledForm`
	 * — the hook must run unconditionally.
	 */
	function UncontrolledFormRenderer<
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
		props: FormRendererUncontrolledProps<
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
		const { schema, translate, keepHiddenValues, fields, blocks, rules, form: _ignored, ...rest } = props
		assertNoReservedFieldKeyCollision(fields, blocks)
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
				FormElement={components.Form}
				elementProps={elementProps}
			>
				{renderSchemaFields(schema, instance, components, translate, fields, blocks)}
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
	function FormRenderer<TValues>(props: FormRendererControlledProps<TValues>): ReactNode
	function FormRenderer<
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
		props: FormRendererUncontrolledProps<
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
	function FormRenderer(props: AnyFormRendererProps): ReactNode {
		if (isRendererControlled(props)) {
			const { form, schema, translate, fields, blocks, rules: _rules, ...elementProps } = props
			assertNoReservedFieldKeyCollision(fields, blocks)
			return (
				<FormShell
					form={form}
					FormElement={components.Form}
					elementProps={elementProps}
				>
					{renderSchemaFields(schema, form, components, translate, fields, blocks)}
				</FormShell>
			)
		}

		// Overload resolution has already checked the caller; the implementation signature is
		// deliberately the loose one, so the shape is spelled out again for the inner component.
		return <UncontrolledFormRenderer {...(props as FormRendererUncontrolledImplProps)} />
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
			TRenderProps
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
		TRenderProps
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
			TRenderProps
		>
	}

	// `withFieldGroup` needs no retyping and is re-exported as TanStack builds it: its render
	// prop receives a **group** API, which correctly carries no flat field components (spec
	// §12 — native `form.Field` territory), and the parent `form` prop of the component it
	// returns already accepts a `KitFormApi`, that type being an intersection over TanStack's.
	return { useForm, Form, FormRenderer, withForm, withFieldGroup }
}

/**
 * Which mode the caller picked.
 *
 * `form` is the discriminant: the uncontrolled shape declares it as `form?: never`, so its
 * only legal value there is `undefined`.
 */
function isControlled(props: { form?: unknown }): props is FormControlledProps {
	return props.form !== undefined
}

/** The bundle `createForm` returns — mirrors `DataGridBundle` in the grid packages. */
export type FormBundle = ReturnType<typeof createForm>
