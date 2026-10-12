import { useFormContext } from '@ez-kit/form-react'

import { Button as ButtonPrimitive } from '@form-shadcn/components/ui/button'
import { cn } from '@form-shadcn/lib/utils'

import type { ButtonProps, FormElementProps, SubmitButtonProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/** The form-level primitives for the shadcn kit: the submit button and the `<form>` shell. */

/**
 * The marker says what the button *is*, not which slot it happens to occupy.
 *
 * `Button` was the submit button and nothing else until the array scope started handing it out
 * for add / remove / duplicate / reorder controls, at which point stamping `form-submit`
 * unconditionally tagged four non-submitting controls per row as the form's submit. App CSS
 * keying on `[data-slot='form-submit']` would hit every one of them.
 */
function slotFor(type: ButtonProps['type']): string {
	return type === 'submit' ? 'form-submit' : 'form-button'
}

export function Button({ type, disabled, onClick, children }: ButtonProps): ReactNode {
	return (
		<ButtonPrimitive
			data-slot={slotFor(type)}
			type={type ?? 'button'}
			disabled={disabled}
			onClick={onClick}
		>
			{children}
		</ButtonPrimitive>
	)
}

export function Form({ className, children, ...props }: FormElementProps): ReactNode {
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
