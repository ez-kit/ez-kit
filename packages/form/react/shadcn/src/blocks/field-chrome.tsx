import { FormFieldType } from '@ez-kit/form-react'

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

/**
 * A checkbox reads as `[control] Label`, not as a label stacked above a lone box.
 *
 * The shared field frame renders chrome in one fixed order (label, description, input,
 * error) because that is right for every other field, so the kit reorders it here rather
 * than the frame branching per field kind. Description and error take a full row of their
 * own beneath, which a plain `flex-row-reverse` would not give them.
 */
const CHECKBOX_LAYOUT =
	'flex flex-wrap items-center gap-x-2 gap-y-1 [&>[data-slot=checkbox]]:order-1 [&>[data-slot=form-label]]:order-2 [&>[data-slot=form-description]]:order-3 [&>[data-slot=form-description]]:w-full [&>[data-slot=form-error]]:order-4 [&>[data-slot=form-error]]:w-full'

export function FieldRoot({ className, children, ...props }: FieldRootProps): ReactNode {
	const isCheckbox = props['data-field-type'] === FormFieldType.Checkbox

	return (
		<div
			data-slot='form-field'
			className={cn(isCheckbox ? CHECKBOX_LAYOUT : 'grid gap-2', className)}
			{...props}
		>
			{children}
		</div>
	)
}

export function Label({ htmlFor, id, children }: LabelProps): ReactNode {
	return (
		<LabelPrimitive
			data-slot='form-label'
			htmlFor={htmlFor}
			id={id}
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
