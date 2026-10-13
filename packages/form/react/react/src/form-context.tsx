'use client'

import { createContext, useContext } from 'react'

import type { AllFormFieldSlots, NoRegistry } from './contract'
import type { FormInstance } from './form-instance'
import type { ReactNode } from 'react'

/**
 * Any form instance, at its widest — what `FormProvider` accepts and what the context holds.
 *
 * The value type and the field registry are open, and the component set is the empty one — an
 * instance's components are extra members on top of it. A concrete instance whose values hold an
 * array does not assign to it directly (see `FormProvider`); a parameter that takes one is
 * `FormInstance<TValues, NoRegistry, NoRegistry>`, generic over `TValues`, which widens to this.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the widest instance, see above
export type AnyFormInstance = FormInstance<any, any, NoRegistry>

/**
 * What `useFormContext()` returns.
 *
 * Without a type argument: the form's base API — `Subscribe`, `state`, `handleSubmit`, `Submit`,
 * `Array`, `Field`, `NativeField`, `FormGroup`, … — with values of type `unknown` and no kit fields.
 *
 * `FormContextApi<V>`: the same API typed over `V`, plus the kit's **built-in** fields with their
 * value-typed `name`. Custom fields and components are not on it: naming them would need the
 * bundle's registry, and a component the bundle registers cannot import the bundle (D6).
 */
export type FormContextApi<TValues = unknown> = unknown extends TValues
	? FormInstance<unknown, NoRegistry, NoRegistry>
	: FormInstance<TValues, AllFormFieldSlots, NoRegistry>

/**
 * One context for the whole package, not one per `createForm` call: the prebuilt `Form`,
 * `SchemaForm` and `FormProvider` of a kit are built by separate factory calls and must still see
 * each other's form.
 */
const FormContext = createContext<AnyFormInstance | null>(null)

/**
 * Provides `form` to `useFormContext()` without rendering a `<form>`.
 *
 * Generic over the values rather than typed `AnyFormInstance`: a form whose values hold an array is
 * not assignable to `FormInstance<any, …>` — `pushFieldValue` and its siblings constrain their
 * field to the array paths, and `any` has none — while `FormInstance<TValues, …>` takes every
 * `useForm` result, and widens to the context's type with no cast.
 */
export function FormProvider<TValues>({
	form,
	children,
}: {
	form: FormInstance<TValues, NoRegistry, NoRegistry>
	children: ReactNode
}): ReactNode {
	return <FormContext.Provider value={form}>{children}</FormContext.Provider>
}

/** The nearest form above this component, as its base API with `unknown` values. */
export function useFormContext(): FormContextApi
/**
 * The nearest form above this component, typed as a form over `TValues`.
 *
 * **A cast, not a check:** nothing verifies that the form above has these values, or that the
 * bundle registered the built-in field a component calls. A component that names paths in one
 * form's data is better written with `withForm` or `withFieldGroup`, which are checked where they
 * are placed; this is for small helpers such as a hint beside a field.
 */
export function useFormContext<TValues>(): FormContextApi<TValues>
export function useFormContext(): AnyFormInstance {
	const form = useContext(FormContext)
	if (form === null) {
		throw new Error('useFormContext() must be called inside <Form>, <SchemaForm> or <FormProvider>.')
	}
	return form
}

/** The nearest form, or `null` — for the helpers that also take one as a prop. Not exported from the package. */
export function useOptionalFormContext(): AnyFormInstance | null {
	return useContext(FormContext)
}

/** The error a composition helper throws when it has no form to work on (R68). */
export function missingFormMessage(helper: string): string {
	return `${helper}(): the block needs a form — pass \`form\`, or render it inside <Form>, <SchemaForm> or <FormProvider>.`
}
