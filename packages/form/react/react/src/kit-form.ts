import type { AllFormComponents, AllFormFieldSlots, FormComponentRegistry } from './contract'
import type { FormFieldComponents, FormPrimitives } from './field-props'
import type { FormFieldRegistry } from './field-registry'
import type { FormGroupComponentOf } from './group-types'
import type { ServerErrors } from './server-errors'
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

/** The members this package adds that are TanStack's own, renamed: `NativeField` is TanStack's `Field`. */
export type NativeMembers<TForm> = { NativeField: TForm extends { Field: infer TField } ? TField : never }

/** The members this package adds for errors a server reported — see `server-errors.ts`. */
export type ServerErrorMembers<TFormData> = {
	/**
	 * Put errors a server reported onto the form. A field's error shows at once and goes the
	 * first time its value changes; every server error goes on the form's next submit or reset,
	 * whichever API starts it. Form-level messages arrive in `form.Submit`'s `formErrors`. The first
	 * field with an error takes focus unless `focusOnError` is `false`.
	 */
	setServerErrors: (errors: ServerErrors<TFormData>) => void
}

/**
 * A form instance carrying the native TanStack API (and TanStack's `Field` again as
 * `NativeField`), the field components it registered, the three primitives and the components it
 * registered.
 *
 * `TFields` is the registry `createForm` was given, so a field the app registered is on the
 * instance under its own key, typed from the phantoms `defineFieldType` wrote. `TComponents` is
 * the `components` bag, attached as-is: each key is `form.<Key>` with that component's own props.
 * Both are **defaulted**, which is what keeps the shorter spellings of this type compiling.
 *
 * `Field` and `FormGroup` are this package's — `Field` binds an author's own control
 * ({@link FormPrimitives}), and `FormGroup` ({@link FormGroupComponentOf}) hands a group carrying
 * `Field` and `NativeField`. Both replace TanStack's with `Omit` rather than by intersection: an
 * intersection keeps TanStack's signature as an overload, which an author would still reach — for
 * `Field`, TanStack's own documentation example (`field.state.value`) would still compile in it. The cost is that `Omit` drops
 * `FormApi`'s `private` member, so the instance is no longer assignable to a TanStack parameter
 * typed `FormApi` — TanStack's `withFieldGroup`, `useFieldGroup` and `useFormGroup` all reject it.
 * That is why those three are this package's own (`field-groups.tsx`, `form-group.tsx`), taking
 * the instance as `FormProvider` does. `NativeMembers` reads `Field` from the un-omitted `TForm`.
 */
export type BoundForm<
	TForm,
	TFormData,
	TFields extends FormFieldRegistry = AllFormFieldSlots,
	TComponents extends FormComponentRegistry = AllFormComponents,
> = Omit<TForm, 'Field' | 'FormGroup'> & { FormGroup: FormGroupComponentOf<TFormData> } & NativeMembers<TForm> &
	ServerErrorMembers<TFormData> &
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
