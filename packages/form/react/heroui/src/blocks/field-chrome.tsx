import { FormFieldType } from '@ez-kit/form-react'
import { Description as HeroDescription, Label as HeroLabel } from '@heroui/react'

import type { DescriptionProps, ErrorTextProps, FieldRootProps, LabelProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * Field chrome for the HeroUI kit.
 *
 * All visual styling for a field lives here — `@ez-kit/form-react` ships none.
 */

/**
 * A checkbox reads as `[control] Label`, not as a label stacked above a lone box.
 *
 * The shared field frame renders chrome in one fixed order (label, description, input,
 * error) because that is right for every other field, so the kit reorders it here. HeroUI's
 * checkbox root carries the `.checkbox` class, which is what the child selector targets.
 */
const CHECKBOX_LAYOUT =
	'flex flex-wrap items-center gap-x-2 gap-y-1 [&>.checkbox]:order-1 [&>[data-slot=form-label]]:order-2 [&>[data-slot=form-description]]:order-3 [&>[data-slot=form-description]]:w-full [&>[data-slot=form-error]]:order-4 [&>[data-slot=form-error]]:w-full'

export function FieldRoot({ className, children, ...props }: FieldRootProps): ReactNode {
	const layout = props['data-field-type'] === FormFieldType.Checkbox ? CHECKBOX_LAYOUT : 'flex flex-col gap-1'

	return (
		<div
			data-slot='form-field'
			className={[layout, className].filter(Boolean).join(' ')}
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
