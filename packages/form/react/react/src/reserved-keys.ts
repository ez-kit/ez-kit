import type { FormPrimitives } from './field-props'
import type { NativeMembers, NoInjectedComponents, ServerErrorMembers } from './kit-form'
import type { StepMembers } from './steps/steps'
import type { AppFieldExtendedReactFormApi } from '@tanstack/react-form'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- only the key set of the instance type is read
type AnyArg = any

/**
 * Every key the form instance already owns. A field or component registered under one of these
 * would be written over it by `Object.assign` — `Subscribe` silently replaced, `state` (a getter)
 * a `TypeError` — so `createForm` refuses them.
 *
 * Derived from the type `useAppForm` returns — TanStack's `FormApi` and `ReactFormApi` (`Field`,
 * `FormGroup`, `Subscribe`) plus `AppField` / `AppForm` — instantiated exactly as `createForm`
 * instantiates it, so the list is what the instance carries before this package adds anything.
 * Then the members this package adds — the primitives ({@link FormPrimitives}), TanStack's
 * `Field` renamed ({@link NativeMembers}), `setServerErrors` ({@link ServerErrorMembers}) and the
 * step flow, `Steps` and `Step` ({@link StepMembers}).
 *
 * Never written down as a free list: `RESERVED_FORM_KEYS` below is annotated with this union, so a
 * TanStack upgrade that adds or removes a member fails to compile here. `keyof` sees only the
 * public members — a TypeScript-`private` field of `FormApi` is still on the object at runtime and
 * is not in this list.
 */
export type ReservedFormKey =
	| keyof AppFieldExtendedReactFormApi<
			AnyArg,
			AnyArg,
			AnyArg,
			AnyArg,
			AnyArg,
			AnyArg,
			AnyArg,
			AnyArg,
			AnyArg,
			AnyArg,
			AnyArg,
			AnyArg,
			NoInjectedComponents,
			NoInjectedComponents
	  >
	| keyof FormPrimitives<unknown>
	| keyof NativeMembers<unknown>
	| keyof ServerErrorMembers<unknown>
	| keyof StepMembers<unknown>

export const RESERVED_FORM_KEYS: Record<ReservedFormKey, true> = {
	// TanStack's `FormApi`
	options: true,
	baseStore: true,
	fieldMetaDerived: true,
	formGroupMetaDerived: true,
	store: true,
	fieldInfo: true,
	formGroupApis: true,
	state: true,
	timeoutIds: true,
	_formId: true,
	formId: true,
	runValidator: true,
	mount: true,
	update: true,
	reset: true,
	validateAllFields: true,
	validateArrayFieldsStartingFrom: true,
	validateField: true,
	validateSync: true,
	validateAsync: true,
	validate: true,
	handleSubmit: true,
	_handleSubmit: true,
	getFieldValue: true,
	getFieldMeta: true,
	getFormGroupMeta: true,
	getFieldInfo: true,
	setFieldMeta: true,
	resetFieldMeta: true,
	setFieldValue: true,
	deleteField: true,
	pushFieldValue: true,
	insertFieldValue: true,
	replaceFieldValue: true,
	removeFieldValue: true,
	swapFieldValues: true,
	moveFieldValues: true,
	clearFieldValues: true,
	resetField: true,
	setErrorMap: true,
	getAllErrors: true,
	parseValuesWithSchema: true,
	parseValuesWithSchemaAsync: true,
	// `ReactFormApi`, and what `createFormHook` adds
	Field: true,
	FormGroup: true,
	Subscribe: true,
	AppField: true,
	AppForm: true,
	// this package
	Submit: true,
	Array: true,
	NativeField: true,
	setServerErrors: true,
	Steps: true,
	Step: true,
}

/** The factory a registry was passed to, named at the head of every message it throws. */
export const FormFactoryName = {
	CreateForm: 'createForm',
	CreateSchemaForm: 'createSchemaForm',
} as const

export type FormFactoryName = (typeof FormFactoryName)[keyof typeof FormFactoryName]

/**
 * Throws when `registry` (named `option` in the message) registers a reserved key. `factory` is the
 * function the app called, so the message names the call site it can find.
 */
export function assertNoReservedKeys(
	registry: object,
	option: 'fields' | 'components',
	factory: FormFactoryName,
): void {
	for (const key of Object.keys(registry)) {
		if (Object.hasOwn(RESERVED_FORM_KEYS, key)) {
			throw new Error(`${factory}: "${key}" is reserved by the form instance and cannot be registered in ${option}.`)
		}
	}
}

/** Throws when one key is registered as both a field and a component, naming `factory`. */
export function assertNoSharedKeys(fields: object, components: object, factory: FormFactoryName): void {
	for (const key of Object.keys(fields)) {
		if (Object.hasOwn(components, key)) {
			throw new Error(`${factory}: "${key}" is registered in both fields and components.`)
		}
	}
}

/**
 * Type-level guard: each reserved key of `T` must be this message, which no component is.
 *
 * A homomorphic remap (`keyof T` filtered by an `as` clause), so a key keeps its `?`; every other
 * key maps to nothing, so the guard intersects as `{}` on a registry that reserves none.
 */
export type ReservedKeyGuard<T> = {
	[K in keyof T as K extends ReservedFormKey ? K : never]: `Error: "${K & string}" is reserved by the form instance`
}

/**
 * Type-level guard: each key of `TComponents` that `TFields` also names must be this message.
 *
 * Only literal keys on **both** sides count: a registry typed by its bound (`Record<string, …>`)
 * names no key, and its index signature would otherwise match every key of the other registry and
 * turn each component into an error. Such a registry is still checked at runtime.
 */
export type SharedKeyGuard<TComponents, TFields> = {
	[K in keyof TComponents as K extends string
		? string extends K
			? never
			: string extends keyof TFields
				? never
				: K extends keyof TFields
					? K
					: never
		: never]: `Error: "${K & string}" is registered in both fields and components`
}
