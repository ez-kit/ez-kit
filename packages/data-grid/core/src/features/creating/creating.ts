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

/**
 * Context passed to the function form of a column's `creating.defaultValue`.
 *
 * Deliberately minimal: `table` already covers the real use cases
 * (`table.getRowCount() + 1`, `table.getState().columnFilters`, `table.getRowModel().rows[0]`).
 * The partially-accumulated `values` object is **not** passed — a default that could read the
 * defaults resolved before it would silently depend on the order the columns happen to sit in
 * the config. Cross-field seeding belongs in the table-level `creating.defaultValues`, which
 * runs once after all column defaults.
 *
 * @typeParam TRow - row data type
 */
export type CreateDefaultValueContext<TRow> = {
	table: Table<TRow>
	/** Id of the column whose default is being resolved. */
	columnId: string
}

/**
 * Context passed to the function form of {@link CreatingConfig.defaultValues}.
 *
 * Minimal for the same reason as {@link CreateDefaultValueContext} — see its doc comment.
 *
 * @typeParam TRow - row data type
 */
export type CreateDefaultValuesContext<TRow> = {
	table: Table<TRow>
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

/**
 * Where the create form is presented. A pure display concern — the commit pipeline is
 * identical for all three.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `variant: 'modal'` is equally valid and needs no import. See {@link CreatingVariant}.
 */
export const CreatingVariant = {
	/** An extra row appended to the body while the form is open. */
	Row: 'row',
	/** A modal dialog opened from the toolbar's create trigger. */
	Modal: 'modal',
	/** A permanently pinned row at the top of the body; no create trigger is rendered. */
	PinRow: 'pin-row',
} as const

export type CreatingVariant = (typeof CreatingVariant)[keyof typeof CreatingVariant]

export type CreatingConfig<TData> = {
	/** How the create form is presented. Default: {@link CreatingVariant.Row}. */
	variant?: CreatingVariant
	validate?: ValidateConfig<TData>
	validateOn?: ValidateOn
	validateDebounceMs?: number
	/**
	 * Values the create form opens with, applied **over** the per-column
	 * `creating.defaultValue` seeds (table level wins per key).
	 *
	 * Resolved on every `creating.start()`, and must be **synchronous** — see
	 * {@link ColumnCreatingConfig.defaultValue} for the reasoning behind both.
	 * The function form is detected with `typeof === 'function'`.
	 */
	defaultValues?: Partial<TData> | ((ctx: CreateDefaultValuesContext<TData>) => Partial<TData>)
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

		/**
		 * Builds the seed for `state.creating.values`: column-level `creating.defaultValue`
		 * first (in final column order, system columns skipped), then the table-level
		 * `creating.defaultValues` shallow-merged over them so the table level wins per key.
		 *
		 * Runs on every start() — the resolved values are a snapshot of the table as it is
		 * when the form opens, not of how it was constructed.
		 */
		const resolveDefaultValues = (): Record<string, unknown> => {
			const fromColumns: Record<string, unknown> = {}
			for (const col of table.getAllColumns()) {
				const meta = col.columnDef.meta
				if (!col.id || meta?.isSystemColumn) continue
				const creating = meta?.creating
				// A column without a default contributes no key at all — not a key set to undefined.
				if (!creating || creating.defaultValue === undefined) continue
				const defaultValue: unknown = creating.defaultValue
				fromColumns[col.id] =
					typeof defaultValue === 'function'
						? (defaultValue as (ctx: CreateDefaultValueContext<RowData>) => unknown)({
								table,
								columnId: col.id,
							})
						: defaultValue
			}

			const fromTable = getConfig()?.defaultValues
			if (fromTable === undefined) return fromColumns
			// CreatingConfig is instantiated with RowData (= any) inside the feature, so the
			// resolved patch widens to `any` here — narrow it back before merging.
			const resolved = (typeof fromTable === 'function' ? fromTable({ table }) : fromTable) as Record<string, unknown>
			return { ...fromColumns, ...resolved }
		}

		const api: CreatingApi = {
			start: () => {
				resetController()
				writeState({
					isOpen: true,
					values: resolveDefaultValues(),
					errors: {},
					formError: null,
					commitStatus: 'idle',
				})
			},

			cancel: () => {
				controller?.abort()
				controller = undefined
				// Values reset to empty, not to the defaults: the form is closed at this point
				// and the next start() re-applies them.
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
