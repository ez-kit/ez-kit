import { FormProvider } from './form-context'

import type { FormElementProps } from './contract'
import type { AnyFormInstance } from './form-context'
import type { ReactNode } from 'react'

type FormShellProps = {
	/** The instance whose `handleSubmit` the `<form>` is wired to, and which the context serves. */
	form: AnyFormInstance
	/** The kit's `<form>` element, or the intrinsic `'form'` when none was passed. */
	FormElement: ((props: FormElementProps) => ReactNode) | 'form'
	children: ReactNode
	elementProps: Omit<FormElementProps, 'onSubmit' | 'children'>
}

/**
 * The `<form>` element itself, wired to one instance.
 *
 * Both modes of `<Form>` end here, so submission behaves identically whether the caller
 * owns the instance or `<Form>` created it.
 */
export function FormShell({ form, FormElement, children, elementProps }: FormShellProps): ReactNode {
	return (
		<FormProvider form={form}>
			<FormElement
				data-form=''
				noValidate
				{...elementProps}
				onSubmit={(event) => {
					// The browser must not navigate, and a nested form's submit must not bubble
					// out to an enclosing one.
					event.preventDefault()
					event.stopPropagation()
					void form.handleSubmit()
				}}
			>
				{children}
			</FormElement>
		</FormProvider>
	)
}
