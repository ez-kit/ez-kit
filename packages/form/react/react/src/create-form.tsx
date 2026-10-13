'use client'

import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { buildFieldComponents } from './build-field-components'
import { createFieldBinding, nativeFieldOf } from './field-binding'
import { withFieldGroup } from './field-groups'
import { deriveFieldTypeIds } from './field-registry'
import { focusFirstError } from './focus-first-error'
import { FormProvider } from './form-context'
import { createFormGroup } from './form-group'
import { splitFormProps } from './form-options'
import { FormShell } from './form-shell'
import { NO_INJECTED_COMPONENTS } from './kit-form'
import { assertNoReservedKeys, assertNoSharedKeys, FormFactoryName } from './reserved-keys'
import { attachServerErrors } from './server-errors'

import type { BindableForm } from './bindable-form'
import type { KitFormBlock, KitWithFormProps } from './composition'
import type { FormComponentRegistry, FormComponents, FormElementProps, FormFieldSlots, NoRegistry } from './contract'
import type { BuiltInFieldKey, PropsOf, ValueOf } from './field-props'
import type { FormFieldRegistry } from './field-registry'
import type { FormBehaviourOptions } from './form-behaviour'
import type { AnyFormInstance } from './form-context'
import type { FormInstance } from './form-instance'
import type { FormControlledProps, AnyFormProps, FormUncontrolledImplProps, FormUncontrolledProps } from './form-props'
import type { KitFormApi } from './kit-form'
import type { ReservedKeyGuard, SharedKeyGuard } from './reserved-keys'
import type { CustomFieldRenderProps } from './schema/registries'
import type { ServerErrors, ServerErrorsHost } from './server-errors'
import type { FormAsyncValidateOrFn, FormOptions, FormValidateOrFn } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * Every key of `TFields` that is not a built-in, checked against what the generic binder hands
 * it: `CustomFieldRenderProps` over the value and props the entry's `defineFieldType` phantoms
 * declare — or `unknown` and an untyped bag when it has none.
 *
 * A homomorphic remap (`keyof TFields` filtered by an `as` clause) so each key keeps its `?`: a
 * custom field spread in conditionally — `...(flag ? { RatingField } : {})` — is optional in the
 * value and must stay optional in the check, or the intersection would demand it.
 */
export type CustomFieldChecks<TFields> = {
	[TKey in keyof TFields as TKey extends BuiltInFieldKey ? never : TKey]: (
		props: CustomFieldRenderProps<
			ValueOf<Exclude<TFields[TKey], undefined>>,
			PropsOf<Exclude<TFields[TKey], undefined>>
		>,
	) => ReactNode
}

export type CreateFormOptions<
	TFields extends FormFieldRegistry = NoRegistry,
	TComponents extends FormComponentRegistry = NoRegistry,
> = {
	/**
	 * The `<form>` element `<Form>` and `<SchemaForm>` render. A plain `<form>` when omitted.
	 *
	 * It receives the full `<form>` props — `onSubmit`, `noValidate`, `data-form` and whatever
	 * the caller put on `<Form>` — and must put them on a real `<form>` element.
	 */
	FormElement?: (props: FormElementProps) => ReactNode
	/**
	 * The field kinds, keyed by component name — any subset of the kit's twelve and its array
	 * frame, plus whatever the app adds. Each key becomes `form.<Key>`; nothing else does.
	 *
	 * Every key that is not one of the built-ins is bound by the generic binder and reachable as
	 * `form.<Key>`, under the document id its name derives (`RatingField` → `rating`).
	 *
	 * Every value is re-asserted here against what its binder will hand it, because the bound
	 * alone checks nothing: `FormFieldRegistry` takes `any` props — parameters are contravariant,
	 * so a narrower bound would reject a correct kit. The spread-and-override form —
	 * `{ ...allFormFields, TextField: X }` — is an object literal checked against the registry,
	 * never against a kit's own `satisfies`. Two checks close that:
	 *
	 * - a **built-in** key against its slot in `FormFieldSlots` (the `Pick`), so
	 *   `TextField: (p: { totallyUnrelated: symbol }) => null` does not reach the text binder;
	 * - **every other** key against the generic binder's `CustomFieldRenderProps`, typed from the
	 *   phantoms `defineFieldType` writes ({@link CustomFieldChecks}), so a misspelt built-in —
	 *   `TextFeild: MyTextField` — is an error rather than a custom field handed props its
	 *   component never declared.
	 *
	 * Both checks are spelled over `NoInfer<TFields>`, so `TFields` is inferred from the value as
	 * written and only checked here. That is also why the built-in check is a `Pick` over the keys
	 * passed rather than the whole `FormFieldSlots`: TypeScript drops a source that *is* one member
	 * of an intersection target from inference, so `TFields & FormFieldSlots` given a value typed
	 * `: FormFieldSlots` left `TFields` with nothing to infer from — and the instance with no fields.
	 */
	fields?: TFields &
		Pick<FormFieldSlots, keyof NoInfer<TFields> & keyof FormFieldSlots> &
		CustomFieldChecks<NoInfer<TFields>> &
		ReservedKeyGuard<NoInfer<TFields>>
	/**
	 * Any components, each attached to the instance as-is under its key: `{ SaveBar }` gives
	 * `<form.SaveBar />` with `SaveBar`'s own props. A component reads the form through
	 * `useFormContext()`, so it is the same component whether it is rendered as `form.SaveBar` or
	 * directly.
	 *
	 * **A component needs a provider above it.** It reads the form from context, which `<Form>`,
	 * `<SchemaForm>` and `<FormProvider>` set. An instance from `useForm` rendered under a
	 * hand-written `<form>` — no `<Form>` — has to be wrapped in `<FormProvider form={form}>`, or
	 * `form.SubmitButton` throws `useFormContext()`'s error. The components are not bound to the
	 * instance on purpose: binding them would make `form.SaveBar` and `<SaveBar />` two different
	 * components.
	 *
	 * The `& Pick<FormComponents, …>` re-asserts the props of the four keys the kit contract
	 * names, for the reason — and in the shape — `fields` re-asserts the built-ins. `SubmitButton`,
	 * `Section`, `GridItem` and `Wizard` are also what `SchemaForm` draws a `submit`, `section`,
	 * grid cell and stepped document with.
	 *
	 * Both registries also reject, at the key, a name the instance already owns (`Subscribe`,
	 * `state`, `Field`, `Submit`, … — {@link ReservedKeyGuard}) and a name used in both registries
	 * ({@link SharedKeyGuard}), and `createForm` throws on either. Like the checks above they read
	 * `NoInfer<…>` only — the `fields` guard is also spelled over it, and so is `TFields` here — so
	 * `createForm({ components: { SaveBar } })` still infers `TFields` from nothing and type-checks.
	 */
	components?: TComponents &
		Pick<FormComponents, keyof NoInfer<TComponents> & keyof FormComponents> &
		ReservedKeyGuard<NoInfer<TComponents>> &
		SharedKeyGuard<NoInfer<TComponents>, NoInfer<TFields>>
}

/**
 * Create the form bundle bound to one UI kit's components — the `createDataGrid`
 * analogue for forms.
 *
 * `useForm` is a **superset of TanStack Form's `useForm`**: the instance carries flat,
 * fully-wired components for exactly the `fields` and `components` passed, plus the two
 * primitives every form has (`form.Submit`, `form.Array`), while the native API
 * (`form.Field`, `form.Subscribe`, `form.handleSubmit`, `form.state`, …) stays on the same
 * object. TanStack's `Field` is also there as `form.NativeField`; `form.AppField` is replaced by
 * the binding seam every bound field renders through (`field-binding.tsx`). `Form` renders the
 * `<form>` element, either around a caller-owned instance or around one it creates itself.
 *
 * Every option is optional: `createForm()` alone gives a form with a plain `<form>` and only
 * the primitives.
 *
 * Validation is pure pass-through: hand TanStack's native standard-schema validators
 * (zod / valibot / arktype) via `validators.onChange` / `onBlur` / `onSubmit`.
 *
 * @example
 * // in a kit package
 * export const { useForm, Form } = createForm({
 *   FormElement,
 *   fields: allFormFields,
 *   components: allFormComponents,
 * })
 *
 * // in an app that registers the fields it uses and a component of its own
 * export const { useForm, Form } = createForm({
 *   FormElement,
 *   fields: { TextField, NumberField, RatingField },
 *   components: { SubmitButton, SaveBar },
 * })
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
 *
 * `SchemaForm` is not here: a document-driven form comes from `createSchemaForm`, which takes the
 * same options and returns this bundle plus `SchemaForm`. Keeping it out is what keeps the schema
 * renderer out of an app that writes its forms in JSX.
 */
export function createForm<
	TFields extends FormFieldRegistry = NoRegistry,
	TComponents extends FormComponentRegistry = NoRegistry,
>(options: CreateFormOptions<TFields, TComponents> = {}) {
	return createFormInternals<TFields, TComponents>(options, FormFactoryName.CreateForm).bundle
}

/**
 * The body both factories share: the bundle `createForm` returns, plus the pieces
 * `createSchemaForm` builds `SchemaForm` from. Not exported from the package.
 *
 * Called with **explicit** type arguments by both factories: their own `options` parameter
 * already carries the checks, and inferring `TFields` again from a `TFields & Pick<…>` source
 * can land on the intersection rather than on `TFields`.
 *
 * Nothing in here names the schema renderer, so a bundle reaching only `createForm` does not
 * carry it.
 */
export function createFormInternals<TFields extends FormFieldRegistry, TComponents extends FormComponentRegistry>(
	options: CreateFormOptions<TFields, TComponents>,
	/** The factory the app called — what a configuration error names. */
	factory: FormFactoryName,
) {
	/**
	 * Read once, here, so every consumer below — the field builder, the schema renderer and the
	 * three `FormElement` call sites — sees the same component identities. Nothing is filled in:
	 * a key that was not passed is not on the instance, and `SchemaForm` names what a document
	 * needed and did not get.
	 */
	const FormElement: ((props: FormElementProps) => ReactNode) | typeof DEFAULT_FORM_ELEMENT =
		options.FormElement ?? DEFAULT_FORM_ELEMENT
	const fields: FormFieldRegistry = options.fields ?? {}
	const components: FormComponentRegistry & FormComponents = options.components ?? {}

	// `Object.assign(form, fieldComponents, components)` below would write a reserved or shared
	// key over the instance's own member — or over the field of the same name — so refuse both
	// here, in every environment, and before `deriveFieldTypeIds`: a reserved key such as `Field`
	// otherwise fails there first, with a message about its document id rather than about the key.
	assertNoReservedKeys(fields, 'fields', factory)
	assertNoReservedKeys(components, 'components', factory)
	assertNoSharedKeys(fields, components, factory)

	/**
	 * Each component name's document id (`RatingField` → `rating`), derived here for **both**
	 * factories: the registry is static authored config, so a key that derives a duplicate or
	 * reserved document id is a configuration error the app hears about at startup — from
	 * `createForm` too, which never reads a document — rather than on the first document that
	 * happens to use it. `createSchemaForm` re-keys the registry by these ids.
	 */
	const fieldTypeIds = deriveFieldTypeIds(fields)

	const { fieldContext, formContext } = createFormHookContexts()
	const { useAppForm, withForm: tanstackWithForm } = createFormHook({
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
		formOptions: FormOptions<
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
		> &
			FormBehaviourOptions<TFormData>,
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
		TSubmitMeta,
		TFields,
		TComponents
	> {
		const { focusOnError = true, serverErrors: appliedServerErrors, ...tanstackOptions } = formOptions
		const form = useAppForm({
			...tanstackOptions,
			// Runs inside `handleSubmit`, long after `form` is assigned. `formApi.update` re-syncs the
			// options on every render, so this always sees the latest flag and the latest callback.
			onSubmitInvalid: (props) => {
				if (focusOnError) focusFirstFieldWithErrors(form)
				tanstackOptions.onSubmitInvalid?.(props)
			},
		})

		const serverErrors = useMemo(() => attachServerErrors(form as unknown as ServerErrorsHost), [form])
		useEffect(() => serverErrors.connect(), [serverErrors])

		// Read when the errors are applied, which is after the render that set it.
		const focusOnErrorRef = useRef(focusOnError)
		useEffect(() => {
			focusOnErrorRef.current = focusOnError
		}, [focusOnError])

		const setServerErrors = useCallback(
			(errors: ServerErrors<TFormData>) => {
				serverErrors.apply(errors)
				if (focusOnErrorRef.current) focusFirstFieldWithErrors(form)
			},
			[serverErrors, form],
		)
		useEffect(() => {
			if (appliedServerErrors !== undefined) setServerErrors(appliedServerErrors)
		}, [appliedServerErrors, setServerErrors])

		// TanStack's `Field`, captured before the assign below replaces the instance's `AppField`
		// with the binding seam — see `nativeFieldOf`.
		const native = useMemo(() => {
			const NativeField = nativeFieldOf(form as unknown as Parameters<typeof nativeFieldOf>[0])
			return { NativeField, AppField: createFieldBinding(NativeField) }
		}, [form])

		// The instance's `FormGroup` is this package's, so its group carries `NativeField`. It reads
		// `form.NativeField` when a group renders, which is after the assign below.
		const FormGroup = useMemo(
			() => createFormGroup(form as unknown as FormInstance<TFormData, NoRegistry, NoRegistry>),
			[form],
		)

		// The binders read `form.AppField` when they render — after the assign below — so they
		// bind through the seam without being handed it.
		const fieldComponents = useMemo(
			() => buildFieldComponents<TFormData>(form as unknown as BindableForm, native.NativeField, fields),
			// The form instance is stable for the lifetime of the component, so the field
			// components — and therefore the mounted inputs — are built exactly once.
			[form, native],
		)

		// Augmenting the instance rather than spreading it: the TanStack form API is a class
		// with prototype methods and getters, which a spread would flatten and break. The
		// components go on as-is — they read the form from context, so nothing binds them.
		return useMemo(
			() =>
				Object.assign(
					form,
					native,
					{ FormGroup, setServerErrors },
					fieldComponents,
					components,
				) as unknown as KitFormApi<
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
					TFields,
					TComponents
				>,
			[form, native, FormGroup, setServerErrors, fieldComponents],
		)
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
			TSubmitMeta,
			TFields,
			TComponents
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
			> &
				FormBehaviourOptions<TFormData>,
		)

		return (
			<FormShell
				form={instance}
				FormElement={FormElement}
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
	function Form<TValues>(props: FormControlledProps<TValues>): ReactNode
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
			TSubmitMeta,
			TFields,
			TComponents
		>,
	): ReactNode
	function Form(props: AnyFormProps): ReactNode {
		if (isControlled(props)) {
			const { form, children, ...elementProps } = props
			return (
				<FormShell
					form={form}
					FormElement={FormElement}
					elementProps={elementProps}
				>
					{children}
				</FormShell>
			)
		}

		// Overload resolution has already checked the caller; the implementation signature is
		// deliberately the loose one, so the shape is spelled out again for the inner component.
		return <UncontrolledForm {...(props as FormUncontrolledImplProps<TFields, TComponents>)} />
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
			TRenderProps,
			TFields,
			TComponents
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
		TRenderProps,
		TFields,
		TComponents
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
			TRenderProps,
			TFields,
			TComponents
		>
	}

	// The bundle's `withFieldGroup` is the package's own (`field-groups.tsx`).
	return {
		bundle: { useForm, Form, FormProvider, withForm, withFieldGroup },
		internals: { useForm, FormElement, fields, components, fieldTypeIds },
	}
}

/** The members of an instance the focus walk reads. */
type ErrorFocusSource = {
	formId: string
	getFieldMeta: (name: string) => { errors: readonly unknown[] } | undefined
}

/** Focus the first field of `form`, in DOM order, that has errors — after a failed submit or server errors. */
function focusFirstFieldWithErrors(form: ErrorFocusSource): void {
	focusFirstError(form.formId, (name) => (form.getFieldMeta(name)?.errors.length ?? 0) > 0)
}

/**
 * The `<form>` element when the caller passed no `FormElement`: the intrinsic tag, which takes
 * exactly the props a kit's element is handed.
 */
const DEFAULT_FORM_ELEMENT = 'form'

/**
 * Which mode the caller picked.
 *
 * `form` is the discriminant: the uncontrolled shape declares it as `form?: never`, so its
 * only legal value there is `undefined`. Narrowing it to a whole instance rests on the controlled
 * overload, which already required one; `AnyFormProps` only asks for `handleSubmit`.
 */
function isControlled(props: AnyFormProps): props is AnyFormProps & { form: AnyFormInstance; children: ReactNode } {
	return props.form !== undefined
}

/**
 * The bundle `createForm` returns — mirrors `DataGridBundle` in the grid packages.
 *
 * Spelled with an explicit instantiation rather than a bare `ReturnType<typeof createForm>`:
 * on a generic function that form instantiates at the constraint, which would quietly type
 * every bundle over `FormFieldRegistry` and lose the app's own field kinds.
 */
export type FormBundle<
	TFields extends FormFieldRegistry = NoRegistry,
	TComponents extends FormComponentRegistry = NoRegistry,
> = ReturnType<typeof createForm<TFields, TComponents>>
