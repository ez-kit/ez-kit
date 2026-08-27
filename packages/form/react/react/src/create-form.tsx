'use client'

import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
import { useMemo } from 'react'

import { buildFieldComponents } from './build-field-components'
import { splitFormProps } from './form-options'
import { FormShell } from './form-shell'
import { NO_INJECTED_COMPONENTS } from './kit-form'
import { isRendererControlled, renderSchemaFields, schemaDefaultValues } from './schema/form-renderer'

import type { BindableForm } from './bindable-form'
import type { FormComponents } from './contract'
import type { FormControlledProps, AnyFormProps, FormUncontrolledImplProps, FormUncontrolledProps } from './form-props'
import type { KitFormApi } from './kit-form'
import type {
	AnyFormRendererProps,
	FormRendererControlledProps,
	FormRendererUncontrolledImplProps,
	FormRendererUncontrolledProps,
} from './schema/form-renderer'
import type { AnyFormSchema, FormAsyncValidateOrFn, FormOptions, FormValidateOrFn } from '@ez-kit/form-core'
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
	const { useAppForm } = createFormHook({
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
		const { schema, translate, form: _ignored, ...rest } = props
		const { options, elementProps } = splitFormProps(rest)
		// Spec §4.6: the schema's own `defaultValue` entries seed the form when the caller
		// supplies none — theirs wins whenever they do.
		const defaultValues = {
			...schemaDefaultValues(schema as AnyFormSchema<TFormData>),
			...(options.defaultValues as Record<string, unknown> | undefined),
		}
		const instance = useForm({
			...options,
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
				{renderSchemaFields(schema, instance, components, translate)}
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
			const { form, schema, translate, ...elementProps } = props
			return (
				<FormShell
					form={form}
					FormElement={components.Form}
					elementProps={elementProps}
				>
					{renderSchemaFields(schema, form, components, translate)}
				</FormShell>
			)
		}

		// Overload resolution has already checked the caller; the implementation signature is
		// deliberately the loose one, so the shape is spelled out again for the inner component.
		return <UncontrolledFormRenderer {...(props as FormRendererUncontrolledImplProps)} />
	}

	return { useForm, Form, FormRenderer }
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
