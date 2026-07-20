import { Button as HeroButton, Form as HeroForm } from '@heroui/react'

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
 * HeroUI's `Form` — the same React Aria `Form` the kit's fields already expect.
 *
 * Rendering it (rather than a bare `<form>`) puts the fields inside React Aria's form and
 * validation contexts, so `<FieldError>` and the `isInvalid` wiring inside `TextField` &
 * co. behave exactly as HeroUI documents them, and a `type='reset'` button resets through
 * the same path.
 *
 * `validationBehavior='aria'` because TanStack Form owns validation and submission here:
 * `'native'` (React Aria's default) would let the browser's constraint validation block or
 * duplicate that. In `'aria'` mode React Aria only exposes state through ARIA attributes,
 * never intercepting the submit.
 *
 * The contract's shell props are the full `<form>` set, which is wider than React Aria's
 * typed props — `data-form=''` and `noValidate` from `@ez-kit/form-react` have nowhere to
 * go. `render` is React Aria's escape hatch for exactly that: it hands us the props it
 * computed for the element, and we merge the contract's on top so every one of them lands
 * on the real `<form>`. Contract props win by design — a caller's explicit `noValidate` or
 * `onSubmit` should not be silently dropped.
 */
export function Form({ className, children, ...props }: FormElementProps): ReactNode {
	return (
		<HeroForm
			className={['flex flex-col gap-4', className].filter(Boolean).join(' ')}
			validationBehavior='aria'
			render={(formProps) => (
				<form
					{...formProps}
					{...props}
				/>
			)}
		>
			{children}
		</HeroForm>
	)
}
