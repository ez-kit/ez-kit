/** Behaviour this package adds to a form, beside TanStack's own options. */
export type FormBehaviourOptions = {
	/**
	 * After a submit that fails validation, focus the first field — in DOM order — that has an
	 * error. On by default; `false` turns it off. The form's own `onSubmitInvalid` runs after it.
	 */
	focusOnError?: boolean
}

/** Every key of {@link FormBehaviourOptions}, for `<Form>`'s prop split. Self-checking like `FORM_OPTION_KEYS`. */
export const BEHAVIOUR_OPTION_KEYS: Record<keyof FormBehaviourOptions, true> = {
	focusOnError: true,
}
