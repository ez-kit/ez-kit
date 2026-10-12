'use client'

import { createContext, useContext } from 'react'

import type { FormInstance } from './form-instance'
import type { ReactNode } from 'react'

/**
 * Any form instance, at its widest — what `FormProvider` accepts and what the context holds.
 *
 * Every `useForm` result is assignable: the value type and both registries are open.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the widest instance, see above
export type AnyFormInstance = FormInstance<any, any>

/**
 * What `useFormContext()` returns: the form's base API — `Subscribe`, `state`, `handleSubmit`,
 * `Submit`, `Array`, … — without the fields a bundle registered, and with values of type `unknown`.
 *
 * A component that names paths in the form's data is a slice of one form or a reusable block, and
 * `withForm` / `withFieldGroup` type it where it is placed. The context serves components that do
 * not depend on a particular form: a save bar, an error summary, a kit's `SubmitButton`.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- an empty field registry; no components either
export type FormContextApi = FormInstance<unknown, {}>

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
	// Through `unknown`: the widest instance names every built-in field kind, which the base API
	// deliberately does not, so TypeScript sees no overlap between the two to convert along.
	return form as unknown as FormContextApi
}
