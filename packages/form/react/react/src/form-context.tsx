'use client'

import { createContext, useContext } from 'react'

import type { NoRegistry } from './contract'
import type { FormInstance } from './form-instance'
import type { ReactNode } from 'react'

/**
 * Any form instance, at its widest — what `FormProvider` accepts and what the context holds.
 *
 * Every `useForm` result is assignable: the value type and the field registry are open, and the
 * component set is the empty one — an instance's components are extra members on top of it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the widest instance, see above
export type AnyFormInstance = FormInstance<any, any, NoRegistry>

/**
 * What `useFormContext()` returns: the form's base API — `Subscribe`, `state`, `handleSubmit`,
 * `Submit`, `Array`, … — without the fields a bundle registered, and with values of type `unknown`.
 *
 * A component that names paths in the form's data is a slice of one form or a reusable block, and
 * `withForm` / `withFieldGroup` type it where it is placed. The context serves components that do
 * not depend on a particular form: a save bar, an error summary, a kit's `SubmitButton`.
 */
export type FormContextApi = FormInstance<unknown, NoRegistry, NoRegistry>

/**
 * One context for the whole package, not one per `createForm` call: the prebuilt `Form`,
 * `SchemaForm` and `FormProvider` of a kit are built by separate factory calls and must still see
 * each other's form.
 */
const FormContext = createContext<AnyFormInstance | null>(null)

/** Provides `form` to `useFormContext()` without rendering a `<form>`. */
export function FormProvider({ form, children }: { form: AnyFormInstance; children: ReactNode }): ReactNode {
	return <FormContext.Provider value={form}>{children}</FormContext.Provider>
}

/** The nearest form above this component, as its base API. */
export function useFormContext(): FormContextApi {
	const form = useContext(FormContext)
	if (form === null) {
		throw new Error('useFormContext() must be called inside <Form>, <SchemaForm> or <FormProvider>.')
	}
	return form
}
