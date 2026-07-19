import { Label as LabelPrimitive } from '@form-shadcn/components/ui/label'
import { cn } from '@form-shadcn/lib/utils'

import type { DescriptionProps, ErrorTextProps, FieldRootProps, LabelProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * Field chrome for the shadcn kit.
 *
 * All visual styling for a field lives here — `@ez-kit/form-react` ships none. These are
 * `blocks/` adapters over the vendored primitives in `components/ui/`, which stay
 * untouched (see CLAUDE.md).
 */

export function FieldRoot({ className, children, ...props }: FieldRootProps): ReactNode {
	return (
		<div
			data-slot='form-field'
			className={cn('grid gap-2', className)}
			{...props}
		>
			{children}
		</div>
	)
}

export function Label({ htmlFor, children }: LabelProps): ReactNode {
	return (
		<LabelPrimitive
			data-slot='form-label'
			htmlFor={htmlFor}
		>
			{children}
		</LabelPrimitive>
	)
}

export function Description({ id, children }: DescriptionProps): ReactNode {
	return (
		<p
			data-slot='form-description'
			id={id}
			className='text-sm text-muted-foreground'
		>
			{children}
		</p>
	)
}

export function ErrorText({ id, errors }: ErrorTextProps): ReactNode {
	return (
		<p
			data-slot='form-error'
			id={id}
			role='alert'
			className='text-sm font-medium text-destructive'
		>
			{errors.join(', ')}
		</p>
	)
}
