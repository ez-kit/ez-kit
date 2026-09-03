import type { FormFieldComponents } from './field-props'
import type { FormAsyncValidateOrFn, FormValidateOrFn } from '@ez-kit/form-core'
import type { AppFieldExtendedReactFormApi } from '@tanstack/react-form'

/**
 * TanStack's own component slots stay empty: the kit's primitives are injected through
 * `createForm({ components })` and reach the fields by closure, so nothing has to travel
 * through `AppField` / `AppForm` context.
 *
 * The type is `{}`, deliberately not `Record<string, never>`: the form API type intersects
 * these slots into the instance, and an index signature of `never` would collapse every
 * field component hanging off it to `never`.
 */
export const NO_INJECTED_COMPONENTS = {} as const

export type NoInjectedComponents = typeof NO_INJECTED_COMPONENTS

/** A form instance carrying both the native TanStack API and the flat field components. */
export type BoundForm<TForm, TFormData> = TForm & FormFieldComponents<TFormData>

/**
 * What `useForm` hands back, spelled out as a nameable type.
 *
 * `<Form>` needs it: in uncontrolled mode the instance is created inside the component and
 * handed to `children`, so its type cannot be inferred from the props — it has to be
 * written down. The generic list mirrors TanStack's verbatim; narrowing it anywhere would
 * silently degrade validator and submit-meta inference for the consumer.
 */
export type KitFormApi<
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
> = BoundForm<
	AppFieldExtendedReactFormApi<
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
		NoInjectedComponents,
		NoInjectedComponents
	>,
	TFormData
>
