import { useFormContext } from '@ez-kit/form-react'
import { Button as HeroButton, Form as HeroForm } from '@heroui/react'

import type { FormElementProps, SubmitButtonProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/** The form-level parts of the HeroUI kit: the `<form>` element and the submit button. */

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
export function FormElement({ className, children, ...props }: FormElementProps): ReactNode {
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
				<HeroButton
					data-form-submit=''
					type='submit'
					variant='primary'
					isDisabled={disabled === true || !canSubmit || isSubmitting}
					onPress={(event) => {
						if ((event.target as HTMLButtonElement).form === null) void submit()
					}}
				>
					{children}
				</HeroButton>
			)}
		</form.Submit>
	)
}
