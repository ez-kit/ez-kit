import type { SubmittableForm } from './bindable-form'
import type { FormComponents, FormElementProps } from './contract'
import type { ReactNode } from 'react'

type FormShellProps = {
	/** The instance whose `handleSubmit` the `<form>` is wired to. */
	form: SubmittableForm
	/** The kit's `<form>` primitive. */
	FormElement: FormComponents['Form']
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
	)
}
