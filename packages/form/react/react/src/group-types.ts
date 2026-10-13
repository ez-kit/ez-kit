import type { AllFormFieldSlots, NoRegistry } from './contract'
import type { BoundFieldComponent, FormFieldComponents, FormPrimitives } from './field-props'
import type { FormFieldRegistry } from './field-registry'
import type { FormInstance } from './form-instance'
import type { NoInjectedComponents } from './kit-form'
import type {
	DeepKeys,
	DeepKeysOfType,
	DeepValue,
	FieldsMap,
	FormGroupApi,
	FormGroupAsyncValidateOrFn,
	FormGroupOptions,
	FormGroupValidateOrFn,
} from '@tanstack/form-core'
import type { AppFieldExtendedReactFieldGroupApi, LensFieldComponent } from '@tanstack/react-form'
import type { PropsWithChildren, ReactNode } from 'react'

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
export type FormGroupProps<
	TFormData,
	TName extends DeepKeys<TFormData>,
	TFields extends FormFieldRegistry = NoRegistry,
> = Omit<
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
	/** Handed the group, with the bundle's fields named relative to it ({@link FormGroupScope}). */
	children: (group: FormGroupScope<TFormData, TName, TFields>) => ReactNode
}

/**
 * The instance's `form.FormGroup`: `name` is inferred per call, and the render prop is typed from it.
 * `TFields` is the bundle's registry, so the group carries the same fields the instance does.
 */
export type FormGroupComponentOf<TFormData, TFields extends FormFieldRegistry = NoRegistry> = <
	const TName extends DeepKeys<TFormData>,
>(
	props: FormGroupProps<TFormData, TName, TFields>,
) => ReactNode

/**
 * The bundle's fields, `Array`, `Field` and `NativeField`, named relative to the group: `name='city'`
 * inside a group over `address` is `address.city`, and a field map's own key inside a mapped block
 * (R69). `Submit` is not among them: it has no `name` to resolve.
 */
export type GroupFields<TGroup, TFields extends FormFieldRegistry> = Omit<
	FormFieldComponents<TGroup, TFields> & FormPrimitives<TGroup, TFields>,
	'Submit'
> & { NativeField: LensFieldComponent<TGroup, Open> }

/** What a `withFieldGroup` block's `render` receives: the field group, plus {@link GroupFields}. */
export type FieldGroupScope<TGroup, TFields extends FormFieldRegistry, TSubmitMeta = never> = Omit<
	FieldGroupInstance<TGroup, TSubmitMeta>,
	keyof GroupFields<TGroup, TFields>
> &
	GroupFields<TGroup, TFields>

/** What `form.FormGroup`'s `children` receives: the form group, plus {@link GroupFields}. */
export type FormGroupScope<TFormData, TName extends DeepKeys<TFormData>, TFields extends FormFieldRegistry> = Omit<
	FormGroupInstance<TFormData, TName>,
	keyof GroupFields<DeepValue<TFormData, TName>, TFields>
> &
	GroupFields<DeepValue<TFormData, TName>, TFields>

/**
 * Where a `withFieldGroup` block lies, with `form`: `fields` — a path to a `TGroup` branch, or a map
 * from each of the block's keys to a path — is checked against that form.
 */
export type FieldGroupPlacementProps<TFormData, TGroup> = {
	form: FormInstance<TFormData, NoRegistry, NoRegistry>
	fields: DeepKeysOfType<TFormData, TGroup | null | undefined> | FieldsMap<TFormData, TGroup>
}

/**
 * Where a `withFieldGroup` block lies, without `form`: the block reads the form above it, and
 * `fields` is a cast, not a check — any path, or a map naming every key of the block (R68).
 */
export type UncheckedFieldGroupPlacementProps<TGroup> = {
	form?: undefined
	fields: string | { [TKey in keyof TGroup]: string }
}

/** What the bundle's `withFieldGroup` takes: the block's own shape, its extra props and its body. */
export type WithFieldGroupOptions<
	TGroup,
	TSubmitMeta = never,
	TRenderProps extends object = Record<never, never>,
	TFields extends FormFieldRegistry = AllFormFieldSlots,
> = {
	defaultValues?: TGroup
	props?: TRenderProps
	render: (
		props: PropsWithChildren<NoInfer<TRenderProps> & { group: FieldGroupScope<TGroup, TFields, TSubmitMeta> }>,
	) => ReactNode
}

/**
 * The component `withFieldGroup` returns, placed with `form` ({@link FieldGroupPlacementProps}) or
 * without it ({@link UncheckedFieldGroupPlacementProps}). Two overloads, so `TFormData` is inferred
 * from `form` when there is one and nothing is asked of it when there is not.
 */
export type FieldGroupBlock<TGroup, TRenderProps extends object> = {
	<TFormData>(props: PropsWithChildren<NoInfer<TRenderProps> & FieldGroupPlacementProps<TFormData, TGroup>>): ReactNode
	(props: PropsWithChildren<NoInfer<TRenderProps> & UncheckedFieldGroupPlacementProps<TGroup>>): ReactNode
}
