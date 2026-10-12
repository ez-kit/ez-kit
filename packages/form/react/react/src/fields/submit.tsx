import { formatFieldErrors } from '@ez-kit/form-core'

import type { BindableForm, SubmitState } from '../bindable-form'
import type { SubmitProps } from '../field-props'
import type { ReactNode } from 'react'

/**
 * Selects the raw slice and nothing derived: `errors` keeps its store identity, so the
 * subscription's shallow comparison does not see a fresh array on every state change.
 */
function selectSubmitState(state: SubmitState): SubmitState {
	return {
		canSubmit: state.canSubmit,
		isSubmitting: state.isSubmitting,
		isDirty: state.isDirty,
		errors: state.errors,
	}
}

/** Build `form.Submit` for one instance — headless; the caller renders the control. */
export function createSubmit(form: BindableForm): (props: SubmitProps) => ReactNode {
	const submit = (): Promise<void> => form.handleSubmit()

	return function Submit({ children }: SubmitProps): ReactNode {
		return (
			<form.Subscribe selector={selectSubmitState}>
				{({ canSubmit, isSubmitting, isDirty, errors }) =>
					children({ canSubmit, isSubmitting, isDirty, formErrors: formatFieldErrors(errors), submit })
				}
			</form.Subscribe>
		)
	}
}
