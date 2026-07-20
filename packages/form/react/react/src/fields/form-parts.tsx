import type { BindableForm, SubmitState } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { FormWrapperProps, SubmitButtonProps } from '../field-props'
import type { ReactNode } from 'react'

function selectSubmitState(state: SubmitState): SubmitState {
	return { canSubmit: state.canSubmit, isSubmitting: state.isSubmitting }
}

/** Build the `SubmitButton` component bound to one form instance. */
export function createSubmitButton(
	form: BindableForm,
	Button: FormComponents['Button'],
): (props: SubmitButtonProps) => ReactNode {
	return function SubmitButton({ children, disabled }: SubmitButtonProps): ReactNode {
		return (
			<form.Subscribe selector={selectSubmitState}>
				{({ canSubmit, isSubmitting }) => (
					<Button
						type='submit'
						disabled={disabled === true || !canSubmit || isSubmitting}
					>
						{children}
					</Button>
				)}
			</form.Subscribe>
		)
	}
}

/** Build the `Form` wrapper component bound to one form instance. */
export function createFormWrapper(
	form: BindableForm,
	Form: FormComponents['Form'],
): (props: FormWrapperProps) => ReactNode {
	return function FormWrapper({ children, ...rest }: FormWrapperProps): ReactNode {
		return (
			<Form
				data-form=''
				noValidate
				{...rest}
				onSubmit={(event) => {
					// The browser must not navigate, and a nested form's submit must not bubble
					// out to an enclosing one.
					event.preventDefault()
					event.stopPropagation()
					void form.handleSubmit()
				}}
			>
				{children}
			</Form>
		)
	}
}
