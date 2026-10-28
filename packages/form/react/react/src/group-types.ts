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
	StandardSchemaV1,
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

type FormGroupValidator<TFormData, TName extends DeepKeys<TFormData>> =
	| undefined
	| FormGroupValidateOrFn<TFormData, TName, DeepValue<TFormData, TName>>
type FormGroupAsyncValidator<TFormData, TName extends DeepKeys<TFormData>> =
	| undefined
	| FormGroupAsyncValidateOrFn<TFormData, TName, DeepValue<TFormData, TName>>

/**
 * What `form.FormGroup`'s render prop and `useFormGroup` hand back: TanStack's form group, plus
 * `Field`, `NativeField` and `errors`. TanStack's form group has no `Field` of its own, so it is
 * added by intersection.
 *
 * `handleSubmit` keeps TanStack's signature and submits this branch: it clears the branch's server
 * errors, runs its fields, the groups inside it and its own validators, then `onGroupSubmit`
 * (R61, R63). An invalid submit focuses the branch's first error (R71).
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
		onMount?: FormGroupValidator<TFormData, TName>
		onChange?: FormGroupValidator<TFormData, TName>
		onChangeAsync?: FormGroupAsyncValidator<TFormData, TName>
		onChangeAsyncDebounceMs?: number
		onBlur?: FormGroupValidator<TFormData, TName>
		onBlurAsync?: FormGroupAsyncValidator<TFormData, TName>
		onBlurAsyncDebounceMs?: number
		onSubmit?: FormGroupValidator<TFormData, TName>
		onSubmitAsync?: FormGroupAsyncValidator<TFormData, TName>
		onDynamic?: FormGroupValidator<TFormData, TName>
		onDynamicAsync?: FormGroupAsyncValidator<TFormData, TName>
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
 * (R69). `Submit` is not among them: it has no `name` to resolve. `TSubmitMeta` is the submit meta
 * `NativeField`'s field carries — the block's own, open for a form group as its `NativeField` is.
 */
export type GroupFields<TGroup, TFields extends FormFieldRegistry, TSubmitMeta = Open> = Omit<
	FormFieldComponents<TGroup, TFields> & FormPrimitives<TGroup, TFields>,
	'Submit'
> & { NativeField: LensFieldComponent<TGroup, TSubmitMeta> }

/** What a `withFieldGroup` block's group has beyond TanStack's field group (R64, R70). */
type FieldGroupOwnMembers<TSubmitMeta> = {
	/** The block's own messages — those its validators report with no path (R64). */
	errors: string[]
	/**
	 * Submits the block, never the form (R70): clears the server errors inside it, runs its fields and
	 * its validators, then the `onGroupSubmit` it was placed with. An invalid submit focuses the
	 * block's first error (R71). For the whole form, call `form.handleSubmit()`.
	 */
	handleSubmit: (meta?: TSubmitMeta) => Promise<void>
}

/**
 * What a `withFieldGroup` block's `render` receives: the field group, plus {@link GroupFields}, the
 * block's `errors` and its own `handleSubmit` in place of TanStack's.
 */
export type FieldGroupScope<TGroup, TFields extends FormFieldRegistry, TSubmitMeta = never> = Omit<
	FieldGroupInstance<TGroup, TSubmitMeta>,
	keyof GroupFields<TGroup, TFields, TSubmitMeta> | keyof FieldGroupOwnMembers<TSubmitMeta>
> &
	GroupFields<TGroup, TFields, TSubmitMeta> &
	FieldGroupOwnMembers<TSubmitMeta>

/** What `form.FormGroup`'s `children` receives: the form group, plus {@link GroupFields}. */
export type FormGroupScope<TFormData, TName extends DeepKeys<TFormData>, TFields extends FormFieldRegistry> = Omit<
	FormGroupInstance<TFormData, TName>,
	keyof GroupFields<DeepValue<TFormData, TName>, TFields>
> &
	GroupFields<DeepValue<TFormData, TName>, TFields>

/** A group validator: a Standard Schema over the group's own shape, or a function over its value. */
export type GroupValidator<TGroup> = StandardSchemaV1<TGroup, unknown> | ((props: { value: TGroup }) => unknown)

/** An async group validator: as {@link GroupValidator}, the function also handed an abort signal. */
export type GroupAsyncValidator<TGroup> =
	| StandardSchemaV1<TGroup, unknown>
	| ((props: { value: TGroup; signal: AbortSignal }) => unknown)

/**
 * A `withFieldGroup` block's `validators` (R65): each slot is checked against the block's own shape.
 * Issues with a path land on the real field; issues without one are the block's `group.errors`. A
 * function may also return TanStack's `{ fields, group }` to route its errors itself. A whole-form
 * submit does not run them: the block's own submit does, and a rule that must hold the form belongs
 * in the form's validators. `onDynamic*` is left out: it needs TanStack's `revalidateLogic`.
 */
export type GroupValidators<TGroup> = {
	onMount?: GroupValidator<TGroup>
	onChange?: GroupValidator<TGroup>
	onChangeAsync?: GroupAsyncValidator<TGroup>
	onChangeAsyncDebounceMs?: number
	onBlur?: GroupValidator<TGroup>
	onBlurAsync?: GroupAsyncValidator<TGroup>
	onBlurAsyncDebounceMs?: number
	onSubmit?: GroupValidator<TGroup>
	onSubmitAsync?: GroupAsyncValidator<TGroup>
}

/**
 * Called by a valid group submit with the group's value, typed by the block, and the submit meta —
 * `undefined` when `group.handleSubmit()` was called without one: a block has no default (R81).
 */
export type OnGroupSubmit<TGroup, TSubmitMeta> = (props: { value: TGroup; meta: TSubmitMeta | undefined }) => unknown

/** What both placements of a block share beyond `fields`. */
type GroupSubmitPlacement<TGroup, TSubmitMeta> = {
	/** Called when `group.handleSubmit()` finds the block valid (R70). */
	onGroupSubmit?: OnGroupSubmit<TGroup, TSubmitMeta> | undefined
}

/**
 * Where a `withFieldGroup` block lies, with `form`: `fields` — a path to a `TGroup` branch, or a map
 * from each of the block's keys to a path — is checked against that form.
 */
export type FieldGroupPlacementProps<TFormData, TGroup, TSubmitMeta = never> = GroupSubmitPlacement<
	TGroup,
	TSubmitMeta
> & {
	form: FormInstance<TFormData, NoRegistry, NoRegistry>
	fields: DeepKeysOfType<TFormData, TGroup | null | undefined> | FieldsMap<TFormData, TGroup>
}

/**
 * Where a `withFieldGroup` block lies, without `form`: the block reads the form above it, and
 * `fields` is a cast, not a check — any path, or a map naming every key of the block (R68).
 */
export type UncheckedFieldGroupPlacementProps<TGroup, TSubmitMeta = never> = GroupSubmitPlacement<
	TGroup,
	TSubmitMeta
> & {
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
	/** The block's own rules, over its own shape ({@link GroupValidators}). */
	validators?: GroupValidators<NoInfer<TGroup>>
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
export type FieldGroupBlock<TGroup, TSubmitMeta, TRenderProps extends object> = {
	<TFormData>(
		props: PropsWithChildren<NoInfer<TRenderProps> & FieldGroupPlacementProps<TFormData, TGroup, TSubmitMeta>>,
	): ReactNode
	(props: PropsWithChildren<NoInfer<TRenderProps> & UncheckedFieldGroupPlacementProps<TGroup, TSubmitMeta>>): ReactNode
}
