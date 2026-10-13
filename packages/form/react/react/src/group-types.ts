import type { BoundFieldComponent } from './field-props'
import type { NoInjectedComponents } from './kit-form'
import type {
	DeepKeys,
	DeepValue,
	FieldsMap,
	FormGroupApi,
	FormGroupAsyncValidateOrFn,
	FormGroupOptions,
	FormGroupValidateOrFn,
} from '@tanstack/form-core'
import type { AppFieldExtendedReactFieldGroupApi, LensFieldComponent } from '@tanstack/react-form'
import type { ReactNode } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack's validator parameters, left open as FormInstance leaves them
type Open = any

type NativeFieldGroup<TGroup, TSubmitMeta> = AppFieldExtendedReactFieldGroupApi<
	unknown,
	TGroup,
	string | FieldsMap<unknown, TGroup>,
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
	TSubmitMeta,
	NoInjectedComponents,
	NoInjectedComponents
>

/**
 * What `withFieldGroup`'s `render` and `useFieldGroup` hand back: TanStack's field group, with this
 * package's `Field` in place of TanStack's, plus `NativeField`. `Field` is replaced with `Omit`, not
 * by intersection, for the reason the instance's is (see `BoundForm`).
 */
export type FieldGroupInstance<TGroup, TSubmitMeta = never> = Omit<NativeFieldGroup<TGroup, TSubmitMeta>, 'Field'> & {
	/** An author's own control, bound like a registered field, with `name` read through the group's `fields`. */
	Field: BoundFieldComponent<TGroup>
	/**
	 * TanStack's render-prop field, named through the group's `fields` (a path or a map). Named as
	 * TanStack's `LensFieldComponent` directly rather than as the group's `Field`, so retyping
	 * `Field` cannot change it.
	 */
	NativeField: LensFieldComponent<TGroup, TSubmitMeta>
}

type GroupValidator<TFormData, TName extends DeepKeys<TFormData>> =
	| undefined
	| FormGroupValidateOrFn<TFormData, TName, DeepValue<TFormData, TName>>
type GroupAsyncValidator<TFormData, TName extends DeepKeys<TFormData>> =
	| undefined
	| FormGroupAsyncValidateOrFn<TFormData, TName, DeepValue<TFormData, TName>>

/**
 * What `form.FormGroup`'s render prop and `useFormGroup` hand back: TanStack's form group, plus
 * `Field` and `NativeField`. TanStack's form group has no `Field` of its own, so it is added by
 * intersection.
 */
export type FormGroupInstance<TFormData, TName extends DeepKeys<TFormData>> = FormGroupApi<
	TFormData,
	TName,
	DeepValue<TFormData, TName>,
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
> & {
	/** An author's own control, bound like a registered field, with `name` relative to the group's own. */
	Field: BoundFieldComponent<DeepValue<TFormData, TName>>
	/**
	 * TanStack's render-prop field, with `name` (and the validators' listen-to lists) relative to the
	 * group's own. Typed as TanStack's `LensFieldComponent`, as a field group's is: the `field` its
	 * render prop receives is the root form's, so `field.name` is the absolute path, typed `string`.
	 */
	NativeField: LensFieldComponent<DeepValue<TFormData, TName>, Open>
	/** The group's own messages — those its validators report with no path (R64). */
	errors: string[]
}

/**
 * `form.FormGroup`'s props: TanStack's group options with `name` and `validators` typed per call.
 * Each validator slot is the union of what TanStack accepts there, rather than a type parameter per
 * slot: inference of one parameter per slot through a nested object fails (measured), and the
 * value type the validator receives is what matters to an author.
 */
export type FormGroupProps<TFormData, TName extends DeepKeys<TFormData>> = Omit<
	FormGroupOptions<
		TFormData,
		TName,
		DeepValue<TFormData, TName>,
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
	>,
	'name' | 'validators'
> & {
	name: TName
	validators?: {
		onMount?: GroupValidator<TFormData, TName>
		onChange?: GroupValidator<TFormData, TName>
		onChangeAsync?: GroupAsyncValidator<TFormData, TName>
		onChangeAsyncDebounceMs?: number
		onBlur?: GroupValidator<TFormData, TName>
		onBlurAsync?: GroupAsyncValidator<TFormData, TName>
		onBlurAsyncDebounceMs?: number
		onSubmit?: GroupValidator<TFormData, TName>
		onSubmitAsync?: GroupAsyncValidator<TFormData, TName>
		onDynamic?: GroupValidator<TFormData, TName>
		onDynamicAsync?: GroupAsyncValidator<TFormData, TName>
		onDynamicAsyncDebounceMs?: number
	}
	children: (group: FormGroupInstance<TFormData, TName>) => ReactNode
}

/** The instance's `form.FormGroup`: `name` is inferred per call, and the render prop is typed from it. */
export type FormGroupComponentOf<TFormData> = <const TName extends DeepKeys<TFormData>>(
	props: FormGroupProps<TFormData, TName>,
) => ReactNode
