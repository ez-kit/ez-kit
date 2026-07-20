import { Button as HeroButton } from '@heroui/react'

import type { ButtonProps, FormElementProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/** The form-level primitives for the HeroUI kit: the submit button and the `<form>` shell. */

export function Button({ type, disabled, children }: ButtonProps): ReactNode {
	return (
		<HeroButton
			// Not `data-slot`: HeroUI stamps its own before spreading props, so ours would win
			// and detach the element from `@heroui/styles`.
			data-form-submit=''
			type={type ?? 'button'}
			variant='primary'
			{...(disabled !== undefined ? { isDisabled: disabled } : {})}
		>
			{children}
		</HeroButton>
	)
}

/**
 * A plain `<form>`, not HeroUI's `Form`.
 *
 * HeroUI's `Form` is React Aria's, whose job is to own submission and native-validation
 * reporting for the fields inside it. Here TanStack Form owns both — the shell only needs
 * to be an element and to carry the kit's spacing. Its React Aria props are also narrower
 * than the contract's `<form>` props (`encType`, `target`, …), so wrapping it would force
 * the contract to shrink to one kit's shape.
 */
export function Form({ className, children, ...props }: FormElementProps): ReactNode {
	return (
		<form
			className={['flex flex-col gap-4', className].filter(Boolean).join(' ')}
			{...props}
		>
			{children}
		</form>
	)
}
