import type { ZodType } from 'zod'

/**
 * Validation error map keyed by columnId.
 * Multi-message: each field can carry several messages (e.g. zod min(8).regex(...)).
 */
export type ValidationErrors = Record<string, string[]>

/** Result of a `validate` call. `null` means OK. */
export type ValidationProblems = {
	errors?: ValidationErrors
	formError?: string
}
export type ValidationResult = null | ValidationProblems

export type ValidateContext = {
	signal: AbortSignal
	/** Set in editing cell-mode; absent for row/modal/creating. */
	cell?: { columnId: string }
}

/**
 * When a form field runs its validation.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `validateOn: 'blur'` is equally valid and needs no import.
 */
export const ValidateOn = {
	/** Only when the form is submitted. */
	Submit: 'submit',
	/** When the field loses focus, then on every submit. */
	Blur: 'blur',
	/** On every keystroke (debounced by `validateDebounceMs`), then on every submit. */
	Change: 'change',
} as const

export type ValidateOn = (typeof ValidateOn)[keyof typeof ValidateOn]

/**
 * Single state machine for the commit pipeline (creating + editing).
 *
 * UI invariant: Save stays disabled while `commitStatus !== CommitStatus.Idle`.
 *
 * Named members for internal reference; the plain string union is what callers see, so
 * `status === 'saving'` is equally valid and needs no import.
 */
export const CommitStatus = {
	/** Nothing in flight; the form accepts input. */
	Idle: 'idle',
	/** `validate()` is running (sync or async). */
	Validating: 'validating',
	/** `onSave()` is running. */
	Saving: 'saving',
} as const

export type CommitStatus = (typeof CommitStatus)[keyof typeof CommitStatus]

/**
 * Per-field state passed to custom cell renderers in `creating` / `editing` modes.
 *
 * `id` is always present for `htmlFor` / aria wiring. `label` and `description`
 * are passed only in form contexts (creating modal, editing modal); inline
 * contexts (cell-mode editing, creating-row, filter) leave them `undefined` so
 * composite renderers can omit the corresponding chrome.
 *
 * UI kits use `error` (first message) for inline errors and `errors` (full list)
 * when they want to render multi-issue feedback. `onBlur` triggers the column's
 * configured `validateOn: 'blur'` flow; UI components should call it when the
 * input loses focus.
 *
 * @typeParam TConfig - column-level cell config (see `meta.config`)
 */
export type FieldState<TConfig = unknown> = {
	/** Stable id for `htmlFor` / aria wiring. Always present (defaults to columnId). */
	id: string
	value: unknown
	onChange: (value: unknown) => void
	/** Triggers field-level validation when the column's resolved `validateOn` is `'blur'`. */
	onBlur: () => void
	/** Optional column-level cell config (`meta.config`). */
	config?: TConfig
	/**
	 * Column label (form-context only). Composite renderers should render
	 * `<FieldLabel>` / `<Label>` only when this is defined.
	 */
	label?: string
	/**
	 * Column description / help text (form-context only). Sourced from
	 * `column.meta.description`. Composite renderers should render
	 * `<FieldDescription>` / `<Description>` only when this is defined.
	 */
	description?: string
	/** First message for the field, or `undefined` if no error. Convenience accessor over `errors[0]`. */
	error: string | undefined
	/** All messages for the field — empty when no error. */
	errors: string[]
	/** True while async field-level validation is in flight for this column. */
	isValidating: boolean
}

/**
 * `validate` config — a function, or the `{ schema }` shorthand for zod.
 *
 * **When** validation runs is not settable here. It is `editing.validateOn` /
 * `creating.validateOn` (and the per-column override under `column.editing` /
 * `column.creating`), full stop. The shorthand used to carry its own `validateOn` /
 * `validateDebounceMs` that silently won over the feature-level ones — so the same setting had
 * two spellings, only one of which existed when `validate` was written as a function, and
 * adopting a zod schema from another example quietly re-timed the whole form.
 */
export type ValidateConfig<TData> =
	| ((values: Partial<TData>, ctx: ValidateContext) => ValidationResult | Promise<ValidationResult>)
	| { schema: ZodType }

const VALIDATION_ERROR_BRAND = Symbol.for('@ez-kit/validation-error')

/**
 * Throw from `onSave` (or any commit step) to surface validation errors back
 * to the form. Library catches it and writes `errors`/`formError` into state.
 *
 * Use {@link isValidationError} (not `instanceof`) for cross-module safety.
 */
export class ValidationError extends Error {
	readonly [VALIDATION_ERROR_BRAND] = true as const
	override readonly name = 'ValidationError'
	readonly errors: ValidationErrors
	readonly formError: string | undefined

	constructor(payload: { errors?: ValidationErrors; formError?: string; message?: string }) {
		super(payload.message ?? payload.formError ?? 'Validation failed')
		this.errors = payload.errors ?? {}
		this.formError = payload.formError
	}
}

/**
 * Cross-module-safe `instanceof ValidationError`. Detects ValidationError
 * instances created in foreign realms or duplicated module copies via the
 * shared `Symbol.for` brand.
 */
export function isValidationError(e: unknown): e is ValidationError {
	if (typeof e !== 'object' || e === null) return false
	return (e as Record<PropertyKey, unknown>)[VALIDATION_ERROR_BRAND] === true
}
