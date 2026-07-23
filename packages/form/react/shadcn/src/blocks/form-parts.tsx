import { Button as ButtonPrimitive } from '@form-shadcn/components/ui/button'
import { cn } from '@form-shadcn/lib/utils'

import type { ButtonProps, FormElementProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/** The form-level primitives for the shadcn kit: the submit button and the `<form>` shell. */

export function Button({ type, disabled, children }: ButtonProps): ReactNode {
	return (
		<ButtonPrimitive
			data-slot='form-submit'
			type={type ?? 'button'}
			disabled={disabled}
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
