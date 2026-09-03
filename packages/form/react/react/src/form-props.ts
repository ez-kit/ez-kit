import type { SubmittableForm } from './bindable-form'
import type { FormElementProps } from './contract'
import type { KitFormApi } from './kit-form'
import type { FormAsyncValidateOrFn, FormOptions, FormValidateOrFn } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * The `<form>` element's own props, minus the two `<Form>` owns.
 *
 * `onSubmit` is gone because the component routes submission to `handleSubmit` — that is
 * the whole point of it — and `children` because each mode declares its own shape.
 */
type FormElementRest = Omit<FormElementProps, 'onSubmit' | 'children'>

/**
 * Controlled mode: the caller owns the instance and passes it in.
 *
 * The instance is typed by what this component actually needs — a `handleSubmit` — rather
 * than by the full generic form API. Nothing here has to know the form's data type: the
 * typed field components travel on the caller's own instance, so `name` stays checked
 * without a single generic reaching this component.
 */
export type FormControlledProps = FormElementRest & {
	/** Instance returned by `useForm`. */
	form: SubmittableForm
	children: ReactNode
}

/**
 * Uncontrolled mode: pass the options `useForm` takes and the component runs the hook.
 *
 * `children` is a render prop because that is the only shape that keeps `name` typed:
 * React context cannot carry the `TFormData` generic, so an instance handed down through
 * context would degrade every field's `name` to a bare `string`.
 */
export type FormUncontrolledProps<
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
> = FormElementRest &
	FormOptions<
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
	> & {
		/** Mutually exclusive with the inline options — never pass both. */
		form?: never
		children: (
			form: KitFormApi<
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
		) => ReactNode
	}

/**
 * The widest shape that covers both modes.
 *
 * It is what sits behind `Form`'s two overloads — by the time a call reaches the
 * implementation, overload resolution has already picked the mode — and what a wrapper
 * that forwards props on to `<Form>` without choosing a mode should accept. It is not the
 * API: a call site should always land on one of the two overloads.
 */
export type AnyFormProps = FormElementRest & {
	form?: SubmittableForm
	children: ReactNode | ((form: never) => ReactNode)
}

/**
 * The uncontrolled shape at its least specific — what the implementation hands to the
 * inner component once the overloads have already validated the caller's props.
 */
export type FormUncontrolledImplProps = FormUncontrolledProps<
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

/**
 * `Form` accepts **either** a ready instance (controlled) **or** the full `useForm` options
 * inline (uncontrolled). The two shapes are mutually exclusive — pick one mode for the
 * lifetime of the component, since switching remounts the form and resets its state.
 *
 * @example — uncontrolled (no hook; the form lives exactly as long as this element)
 * <Form defaultValues={{ email: '' }} onSubmit={({ value }) => save(value)}>
 *   {(form) => <form.TextField name='email' label='Email' />}
 * </Form>
 *
 * @example — controlled (explicit instance, when it is read from outside the markup)
 * const form = useForm({ defaultValues: { email: '' }, onSubmit })
 * <Form form={form}>
 *   <form.TextField name='email' label='Email' />
 * </Form>
 */
export type FormProps<
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
> =
	| FormControlledProps
	| FormUncontrolledProps<
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
	  >
