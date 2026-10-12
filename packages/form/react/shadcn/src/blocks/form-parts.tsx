import { useFormContext } from '@ez-kit/form-react'

import { Button as ButtonPrimitive } from '@form-shadcn/components/ui/button'
import { cn } from '@form-shadcn/lib/utils'

import type { FormElementProps, SubmitButtonProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/** The form-level parts of the shadcn kit: the `<form>` element and the submit button. */

export function FormElement({ className, children, ...props }: FormElementProps): ReactNode {
	return (
		<form
			className={cn('grid gap-4', className)}
			{...props}
		>
			{children}
		</form>
	)
}

/**
 * The kit's submit button, built on `form.Submit` and reading the form from context, so the same
 * component works as `form.SubmitButton` and as a plain `<SubmitButton />`.
 *
 * Inside a `<form>` it is an ordinary submit button and the `<form>`'s own submit handler runs.
 * Under a `FormProvider` with no `<form>` the browser has nothing to submit, so the click submits
 * the form itself; checking the button's form owner is what keeps the two paths from both firing.
 *
 * The owner wins over the context. A button whose owner is a different `<form>` than the context
 * form — `<Form A>` around `<FormProvider B>` around this button — submits its owner, A; the
 * context form, B, is submitted only when the button has no form owner at all.
 */
export function SubmitButton({ children, disabled }: SubmitButtonProps): ReactNode {
	const form = useFormContext()
	return (
		<form.Submit>
			{({ canSubmit, isSubmitting, submit }) => (
				<ButtonPrimitive
					data-slot='form-submit'
					type='submit'
					disabled={disabled === true || !canSubmit || isSubmitting}
					onClick={(event) => {
						if (event.currentTarget.form === null) void submit()
					}}
				>
					{children}
				</ButtonPrimitive>
			)}
		</form.Submit>
	)
}
