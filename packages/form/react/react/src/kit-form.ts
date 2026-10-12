import type { AllFormComponents, AllFormFieldSlots, FormComponentRegistry } from './contract'
import type { FormFieldComponents, FormPrimitives } from './field-props'
import type { FormFieldRegistry } from './field-registry'
import type { FormAsyncValidateOrFn, FormValidateOrFn } from '@ez-kit/form-core'
import type { AppFieldExtendedReactFormApi, FieldComponent } from '@tanstack/react-form'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the validator parameters an entry's NativeField leaves open, as FormInstance does
type Open = any

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

/** The members this package adds that are TanStack's own, renamed: `NativeField` is TanStack's `Field`. */
export type NativeMembers<TForm> = { NativeField: TForm extends { Field: infer TField } ? TField : never }

/** TanStack's render-prop field over `TFormData`, with its form-level validator types left open. */
export type NativeFieldOf<TFormData> = FieldComponent<
	TFormData,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open
>

/**
 * A form instance carrying the native TanStack API (and TanStack's `Field` again as
 * `NativeField`), the field components it registered, the two primitives and the components it
 * registered.
 *
 * `TFields` is the registry `createForm` was given, so a field the app registered is on the
 * instance under its own key, typed from the phantoms `defineFieldType` wrote. `TComponents` is
 * the `components` bag, attached as-is: each key is `form.<Key>` with that component's own props.
 * Both are **defaulted**, which is what keeps the shorter spellings of this type compiling.
 */
export type BoundForm<
	TForm,
	TFormData,
	TFields extends FormFieldRegistry = AllFormFieldSlots,
	TComponents extends FormComponentRegistry = AllFormComponents,
> = TForm &
	NativeMembers<TForm> &
	FormFieldComponents<TFormData, TFields> &
	FormPrimitives<TFormData, TFields> &
	TComponents

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
	TFields extends FormFieldRegistry = AllFormFieldSlots,
	TComponents extends FormComponentRegistry = AllFormComponents,
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
	TFormData,
	TFields,
	TComponents
>
