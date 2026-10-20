import { useSelector } from '@tanstack/react-form'
import { createStore } from '@tanstack/react-store'

import { formatOwnErrors } from '../own-errors'
import { serverErrorsOf } from '../server-errors'
import { isScopeErrorKey } from '../validated-scope'

import type { BindableForm, SubmitState } from '../bindable-form'
import type { SubmitProps } from '../field-props'
import type { Readable } from '@tanstack/react-store'
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

/** The form's own errors: every `errorMap` slot but a map group's (R67) or a step's, which are theirs. */
function formLevelErrors(errorMap: Record<string, unknown>): unknown[] {
	return Object.entries(errorMap)
		.filter(([key]) => !isScopeErrorKey(key))
		.map(([, value]) => value)
}

/** What `Submit` reads when the instance has no server-errors controller (a hand-built form). */
const NO_SERVER_ERRORS: Readable<readonly string[]> = /* @__PURE__ */ createStore<readonly string[]>([])

/** The form-level messages `form.setServerErrors` put on `form`, re-rendering when they change. */
function useServerFormErrors(form: object): readonly string[] {
	return useSelector(serverErrorsOf(form)?.formErrors ?? NO_SERVER_ERRORS)
}

/** The form's errors with no path, as `form.Submit` hands them: its validators', then the server's. */
export function useFormErrors(form: object): string[] {
	const serverFormErrors = useServerFormErrors(form)
	const errorMap = useSelector(
		(form as { store: Parameters<typeof useSelector>[0] }).store,
		(state) => (state as { errorMap: Record<string, unknown> }).errorMap,
	)
	return formatOwnErrors([...formLevelErrors(errorMap), ...serverFormErrors])
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
		const serverFormErrors = useServerFormErrors(form)
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
