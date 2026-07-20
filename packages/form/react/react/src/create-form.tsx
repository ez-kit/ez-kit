'use client'

import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
import { useMemo } from 'react'

import { buildFieldComponents } from './build-field-components'

import type { BindableForm } from './bindable-form'
import type { FormComponents } from './contract'
import type { FormFieldComponents } from './field-props'
import type { FormAsyncValidateOrFn, FormOptions, FormValidateOrFn } from '@ez-kit/form-core'

/**
 * TanStack's own component slots stay empty: the kit's primitives are injected through
 * `createForm({ components })` and reach the fields by closure, so nothing has to travel
 * through `AppField` / `AppForm` context.
 */
const NO_INJECTED_COMPONENTS = {} as const

export type CreateFormOptions = {
	/** The kit's implementation of the UI contract. Every primitive is required. */
	components: FormComponents
}

/**
 * Create a `useForm` hook bound to one UI kit's components — the `createDataGrid`
 * analogue for forms.
 *
 * The returned hook is a **superset of TanStack Form's `useForm`**: the instance carries
 * flat, fully-wired field components (`form.TextField`, `form.NumberField`, …) plus
 * `form.SubmitButton` and `form.Form`, while the entire native API (`form.Field`,
 * `form.Subscribe`, `form.handleSubmit`, `form.state`, `form.AppField`, …) stays
 * untouched on the same object.
 *
 * Validation is pure pass-through: hand TanStack's native standard-schema validators
 * (zod / valibot / arktype) via `validators.onChange` / `onBlur` / `onSubmit`.
 *
 * @example
 * // in a kit package
 * export const { useForm } = createForm({ components })
 *
 * // in an app
 * const form = useForm({ defaultValues: { email: '' }, onSubmit: ({ value }) => save(value) })
 * <form.Form>
 *   <form.TextField name="email" label="Email" />
 *   <form.SubmitButton>Save</form.SubmitButton>
 * </form.Form>
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
	) {
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

	return { useForm }
}

/** The bundle `createForm` returns — mirrors `DataGridBundle` in the grid packages. */
export type FormBundle = ReturnType<typeof createForm>

/** A form instance carrying both the native TanStack API and the flat field components. */
export type BoundForm<TForm, TFormData> = TForm & FormFieldComponents<TFormData>
