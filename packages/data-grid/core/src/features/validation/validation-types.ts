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

export type ValidateOn = 'submit' | 'blur' | 'change'

/**
 * Single state machine for the commit pipeline (creating + editing).
 *
 * - `idle`     — нечего не происходит; форма принимает ввод
 * - `validating` — выполняется validate() (sync или async)
 * - `saving`     — выполняется onSave()
 *
 * UI-инвариант: Save disabled, пока `commitStatus !== 'idle'`.
 */
export type CommitStatus = 'idle' | 'validating' | 'saving'

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
 * `validate` config — function form OR `{ schema }` shorthand for zod.
 * `validateOn` and `validateDebounceMs` on the shorthand override the global creating/editing
 * `validateOn` / `validateDebounceMs` for that specific call.
 */
export type ValidateConfig<TData> =
	| ((values: Partial<TData>, ctx: ValidateContext) => ValidationResult | Promise<ValidationResult>)
	| { schema: ZodType; validateOn?: ValidateOn; validateDebounceMs?: number }

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

