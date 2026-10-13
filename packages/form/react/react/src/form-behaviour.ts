import type { ServerErrors } from './server-errors'

/** Behaviour this package adds to a form, beside TanStack's own options. */
export type FormBehaviourOptions<TFormData> = {
	/**
	 * After a submit that fails validation, focus the first field — in DOM order — that has an
	 * error. On by default; `false` turns it off. The form's own `onSubmitInvalid` runs after it.
	 * It also governs the focus that follows server errors.
	 */
	focusOnError?: boolean
	/**
	 * Errors a server reported — the declarative form of `form.setServerErrors`, and the shape
	 * `useActionState` hands back. Applied on mount and whenever the value changes **by reference**;
	 * the same object again applies nothing, so an error the user has since edited away stays gone.
	 * One source: a controlled `<Form form={…}>` does not take it — pass it to your own `useForm`.
	 */
	serverErrors?: ServerErrors<TFormData> | undefined
}

/** Every key of {@link FormBehaviourOptions}, for `<Form>`'s prop split. Self-checking like `FORM_OPTION_KEYS`. */
export const BEHAVIOUR_OPTION_KEYS: Record<keyof FormBehaviourOptions<unknown>, true> = {
	focusOnError: true,
	serverErrors: true,
}
