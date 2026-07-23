import { isValidationError, zodSafeParseToResult } from '../validation'

import type {
	CommitStatus,
	ValidateConfig,
	ValidateContext,
	ValidateOn,
	ValidationErrors,
	ValidationResult,
} from '../validation'
import type { InitialTableState, RowData, Table, TableFeature, TableState } from '@tanstack/table-core'

/**
 * Context passed to {@link CreatingConfig.onSave}.
 *
 * @typeParam TData - row data type
 */
export type CreatingSaveContext<TData> = {
	/** Field values currently in the create form. */
	values: Partial<TData>
	/** Aborted when the user cancels create, calls cancel(), or the table unmounts. */
	signal: AbortSignal
}

const DEFAULT_VALIDATE_ON: ValidateOn = 'submit'
const DEFAULT_DEBOUNCE_MS = 200
const GENERIC_FORM_ERROR = 'Unexpected error'

export type CreatingState = {
	isOpen: boolean
	values: Record<string, unknown>
	errors: ValidationErrors
	formError: string | null
	commitStatus: CommitStatus
}

export type CreatingConfig<TData> = {
	mode?: 'row' | 'modal' | 'pin-row'
	validate?: ValidateConfig<TData>
	validateOn?: ValidateOn
	validateDebounceMs?: number
	/**
	 * Called when the user commits the create form. Return nothing for
	 * synchronous handlers, a `Promise` for async work. Throw
	 * {@link ValidationError} from inside to surface server-side validation
	 * errors back into the form state.
	 */
	onSave: (ctx: CreatingSaveContext<TData>) => void | Promise<void>
}

export type CreatingApi<TData = unknown> = {
	start: () => void
	cancel: () => void
	commit: () => Promise<void>
	setValue: (key: string, value: unknown) => void
	setValues: (patch: Partial<TData>) => void
	setErrors: (errors: ValidationErrors | null) => void
	setFormError: (msg: string | null) => void
	validate: () => Promise<ValidationResult>
	/** Internal — called by FieldState.onBlur in the react adapter. */
	validateField: (columnId: string) => Promise<void>
	getState: () => CreatingState
}

declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState {
		creating: CreatingState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableOptionsResolved<TData extends RowData> {
		creating?: CreatingConfig<TData>
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Table<TData extends RowData> {
		creating: CreatingApi<TData>
	}
}

const INITIAL_STATE: CreatingState = {
	isOpen: false,
	values: {},
	errors: {},
	formError: null,
	commitStatus: 'idle',
}

function isAbortError(e: unknown): boolean {
	return typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError'
}

function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'))
			return
		}
		const onAbort = (): void => {
			clearTimeout(timer)
			signal.removeEventListener('abort', onAbort)
			reject(new DOMException('Aborted', 'AbortError'))
		}
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', onAbort)
			resolve()
		}, ms)
		signal.addEventListener('abort', onAbort)
	})
}

export const CreatingFeature: TableFeature<RowData> = {
	getInitialState: (state?: InitialTableState) =>
		({
			...state,
			creating: { ...INITIAL_STATE },
		}) as Partial<TableState>,

	createTable: (table: Table<RowData>) => {
		// Single AbortController per table instance.
		// Aborted on: new commit, new validate, new validateField, cancel, start.
		let controller: AbortController | undefined

		const getConfig = (): CreatingConfig<RowData> | undefined => table.options.creating
		const getState = (): CreatingState => table.getState().creating

		const writeState = (patch: Partial<CreatingState>): void => {
			table.setState((prev) => ({
				...prev,
				creating: { ...prev.creating, ...patch },
			}))
		}

		const resolveColumnMeta = (columnId: string) => {
			const col = table.getAllColumns().find((c) => c.id === columnId)
			return col?.columnDef.meta
		}

		const resolveValidateOn = (columnId: string): ValidateOn => {
			const fromColumn = resolveColumnMeta(columnId)?.validateOn
			if (fromColumn) return fromColumn
			const config = getConfig()
			const validate = config?.validate
			if (validate && typeof validate === 'object' && validate.validateOn) return validate.validateOn
			return config?.validateOn ?? DEFAULT_VALIDATE_ON
		}

		const resolveDebounceMs = (columnId: string): number => {
			const fromColumn = resolveColumnMeta(columnId)?.validateDebounceMs
			if (fromColumn !== undefined) return fromColumn
			const config = getConfig()
			const validate = config?.validate
			if (validate && typeof validate === 'object' && validate.validateDebounceMs !== undefined)
				return validate.validateDebounceMs
			return config?.validateDebounceMs ?? DEFAULT_DEBOUNCE_MS
		}

		const runValidate = async (values: Record<string, unknown>, ctx: ValidateContext): Promise<ValidationResult> => {
			const config = getConfig()
			if (!config?.validate) return null
			if (typeof config.validate === 'function') {
				return await config.validate(values, ctx)
			}
			return zodSafeParseToResult(config.validate.schema, values)
		}

		const resetController = (): AbortController => {
			controller?.abort()
			const c = new AbortController()
			controller = c
			return c
		}

		const validateAndApplyField = async (columnId: string, signal: AbortSignal): Promise<void> => {
			if (signal.aborted) return
			const config = getConfig()
			if (!config?.validate) return

			writeState({ commitStatus: 'validating' })
			const values = getState().values
			let result: ValidationResult
			try {
				result = await runValidate(values, { signal, cell: { columnId } })
			} catch (e) {
				if (isAbortError(e)) return
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (signal.aborted) return
				writeState({ commitStatus: 'idle' })
				throw e
			}
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (signal.aborted) return

			table.setState((prev) => {
				// Drop previous error for this column, then re-apply if present in result.
				const { [columnId]: _removed, ...rest } = prev.creating.errors
				const fieldErrs = result?.errors?.[columnId]
				const nextErrors = fieldErrs && fieldErrs.length > 0 ? { ...rest, [columnId]: fieldErrs } : rest
				return {
					...prev,
					creating: { ...prev.creating, errors: nextErrors, commitStatus: 'idle' },
				}
			})
		}

		const scheduleChangeValidation = (columnId: string): void => {
			const c = resetController()
			const ms = resolveDebounceMs(columnId)
			void (async () => {
				try {
					await abortableSleep(ms, c.signal)
					if (c.signal.aborted) return
					await validateAndApplyField(columnId, c.signal)
				} catch (e) {
					if (isAbortError(e)) return
					throw e
				}
			})()
		}

		const api: CreatingApi = {
			start: () => {
				resetController()
				writeState({
					isOpen: true,
					values: {},
					errors: {},
					formError: null,
					commitStatus: 'idle',
				})
			},

			cancel: () => {
				controller?.abort()
				controller = undefined
				writeState({
					isOpen: false,
					values: {},
					errors: {},
					formError: null,
					commitStatus: 'idle',
				})
			},

			commit: async () => {
				const config = getConfig()
				if (!config) return
				if (getState().commitStatus !== 'idle') return // UI invariant — second click is no-op

				const c = resetController()

				writeState({
					errors: {},
					formError: null,
					commitStatus: 'validating',
				})

				const values = getState().values

				// ── validate phase ───────────────────────────────────────────
				if (config.validate) {
					let result: ValidationResult
					try {
						result = await runValidate(values, { signal: c.signal })
					} catch (e) {
						if (c.signal.aborted) return
						writeState({ commitStatus: 'idle' })
						throw e
					}
					if (c.signal.aborted) return
					if (result !== null) {
						writeState({
							errors: result.errors ?? {},
							formError: result.formError ?? null,
							commitStatus: 'idle',
						})
						return
					}
				}

				// ── save phase ───────────────────────────────────────────────
				writeState({ commitStatus: 'saving' })
				try {
					await config.onSave({ values, signal: c.signal })
					if (c.signal.aborted) return
					// Reset to closed/empty state on success
					writeState({
						isOpen: false,
						values: {},
						errors: {},
						formError: null,
						commitStatus: 'idle',
					})
				} catch (e) {
					if (c.signal.aborted) return
					if (isValidationError(e)) {
						writeState({
							errors: e.errors,
							formError: e.formError ?? null,
							commitStatus: 'idle',
						})
						return
					}
					writeState({
						formError: GENERIC_FORM_ERROR,
						commitStatus: 'idle',
					})
					throw e
				}
			},

			setValue: (key, value) => {
				table.setState((prev) => {
					const { [key]: _removed, ...remainingErrors } = prev.creating.errors
					return {
						...prev,
						creating: {
							...prev.creating,
							values: { ...prev.creating.values, [key]: value },
							errors: remainingErrors,
							// formError intentionally untouched
						},
					}
				})
				if (resolveValidateOn(key) === 'change' && getConfig()?.validate) {
					scheduleChangeValidation(key)
				}
			},

			setValues: (patch) => {
				table.setState((prev) => ({
					...prev,
					creating: {
						...prev.creating,
						values: { ...prev.creating.values, ...(patch as Record<string, unknown>) },
					},
				}))
			},

			setErrors: (errors) => {
				writeState({ errors: errors ?? {} })
			},

			setFormError: (msg) => {
				writeState({ formError: msg })
			},

			validate: async () => {
				const config = getConfig()
				if (!config?.validate) return null
				const c = resetController()
				const values = getState().values
				writeState({ commitStatus: 'validating' })
				let result: ValidationResult
				try {
					result = await runValidate(values, { signal: c.signal })
				} catch (e) {
					if (c.signal.aborted) return null
					writeState({ commitStatus: 'idle' })
					throw e
				}
				if (c.signal.aborted) return null
				writeState({
					errors: result?.errors ?? {},
					formError: result?.formError ?? null,
					commitStatus: 'idle',
				})
				return result
			},

			validateField: async (columnId) => {
				const c = resetController()
				try {
					await validateAndApplyField(columnId, c.signal)
				} catch (e) {
					if (isAbortError(e)) return
					throw e
				}
			},

			getState,
		}

		table.creating = api
	},
}
