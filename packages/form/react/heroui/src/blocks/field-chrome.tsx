import { Description as HeroDescription, Label as HeroLabel } from '@heroui/react'

import type { DescriptionProps, ErrorTextProps, FieldRootProps, LabelProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * Field chrome for the HeroUI kit.
 *
 * All visual styling for a field lives here — `@ez-kit/form-react` ships none.
 */

export function FieldRoot({ className, children, ...props }: FieldRootProps): ReactNode {
	return (
		<div
			data-slot='form-field'
			className={['flex flex-col gap-1', className].filter(Boolean).join(' ')}
			{...props}
		>
			{children}
		</div>
	)
}

export function Label({ htmlFor, id, children }: LabelProps): ReactNode {
	return (
		<HeroLabel
			data-slot='form-label'
			htmlFor={htmlFor}
			id={id}
		>
			{children}
		</HeroLabel>
	)
}

export function Description({ id, children }: DescriptionProps): ReactNode {
	return (
		<HeroDescription
			data-slot='form-description'
			id={id}
		>
			{children}
		</HeroDescription>
	)
}

/**
 * Deliberately **not** HeroUI's `FieldError`.
 *
 * `FieldError` is a React Aria field-context consumer: it reads the validation state of an
 * enclosing `TextField` / `Select` / `Checkbox` and must be rendered as their child. The
 * shared field frame renders chrome as *siblings* of the input, outside any HeroUI field
 * root, so the context would be missing. The error text is therefore a plain element
 * carrying HeroUI's danger token — the accessibility wiring (`role='alert'`, the id that
 * the input's `aria-describedby` points at) is supplied by the frame either way.
 */
export function ErrorText({ id, errors }: ErrorTextProps): ReactNode {
	return (
		<p
			data-slot='form-error'
			id={id}
			role='alert'
			className='text-sm text-danger'
		>
			{errors.join(', ')}
		</p>
	)
}
