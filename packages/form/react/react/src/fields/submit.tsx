import { useSyncExternalStore } from 'react'

import { GROUP_ERROR_KEY_PREFIX } from '../map-group'
import { formatOwnErrors } from '../own-errors'
import { serverErrorsOf } from '../server-errors'

import type { BindableForm, SubmitState } from '../bindable-form'
import type { SubmitProps } from '../field-props'
import type { ServerErrorsController } from '../server-errors'
import type { ReactNode } from 'react'

/**
 * Selects the raw slice and nothing derived: `errorMap` keeps its store identity, so the
 * subscription's shallow comparison does not see a fresh object on every state change.
 */
function selectSubmitState(state: SubmitState): SubmitState {
	return {
		canSubmit: state.canSubmit,
		isSubmitting: state.isSubmitting,
		isDirty: state.isDirty,
		errorMap: state.errorMap,
	}
}

/** The form's own errors: every `errorMap` slot but a map group's, which is that block's (R67). */
function formLevelErrors(errorMap: Record<string, unknown>): unknown[] {
	return Object.entries(errorMap)
		.filter(([key]) => !key.startsWith(GROUP_ERROR_KEY_PREFIX))
		.map(([, value]) => value)
}

const NO_SERVER_ERRORS: readonly string[] = []

/** What `Submit` subscribes to when the instance has no server-errors controller (a hand-built form). */
const NO_CONTROLLER: Pick<ServerErrorsController, 'subscribe' | 'formErrors'> = {
	subscribe: () => () => {},
	formErrors: () => NO_SERVER_ERRORS,
}

/**
 * Build `form.Submit` for one instance — headless; the caller renders the control.
 *
 * `formErrors` is TanStack's form-level errors followed by the server's form-level messages
 * (`form.setServerErrors`), which live outside TanStack's state — so they are read from the
 * instance's controller rather than through `form.Subscribe`. A map group's own errors sit in the
 * form's `errorMap` too, and are left out: they are that block's `group.errors`.
 */
export function createSubmit(form: BindableForm): (props: SubmitProps) => ReactNode {
	const submit = (): Promise<void> => form.handleSubmit()

	return function Submit({ children }: SubmitProps): ReactNode {
		const controller = serverErrorsOf(form) ?? NO_CONTROLLER
		const serverFormErrors = useSyncExternalStore(controller.subscribe, controller.formErrors, controller.formErrors)
		return (
			<form.Subscribe selector={selectSubmitState}>
				{({ canSubmit, isSubmitting, isDirty, errorMap }) =>
					children({
						canSubmit,
						isSubmitting,
						isDirty,
						formErrors: formatOwnErrors([...formLevelErrors(errorMap), ...serverFormErrors]),
						submit,
					})
				}
			</form.Subscribe>
		)
	}
}
