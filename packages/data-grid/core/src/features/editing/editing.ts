import { isValidationError, zodSafeParseToResult } from '../validation'

import type { FeatureToggle } from '../../utils/feature-flag'
import type {
	CommitStatus,
	ValidateConfig,
	ValidateContext,
	ValidateOn,
	ValidationErrors,
	ValidationResult,
} from '../validation'
import type { InitialTableState, Row, RowData, Table, TableFeature, TableState } from '@tanstack/table-core'

/**
 * Context passed to {@link EditingConfig.onSave}.
 *
 * @typeParam TData - row data type
 */
export type EditingSaveContext<TData> = {
	/** ID of the row being edited (TanStack row.id). */
	rowId: string
	/** Field values currently in the form. In cell mode contains only the edited column. */
	values: Partial<TData>
	/** Aborted when the user cancels edit, calls cancel(), or the table unmounts. */
	signal: AbortSignal
}

const DEFAULT_VALIDATE_ON: ValidateOn = 'submit'
const DEFAULT_DEBOUNCE_MS = 200
const GENERIC_FORM_ERROR = 'Unexpected error'

export type EditingState = {
	rowId: string | null
	/** Populated only in cell mode (`<rowId>_<columnId>`). */
	cellId: string | null
	values: Record<string, unknown>
	errors: ValidationErrors
	formError: string | null
	commitStatus: CommitStatus
}

/**
 * How the edit flow behaves. `mode` and not `variant` because the members differ in
 * behaviour, not only in layout: `cell` edits a single field while `row` / `modal` edit the
 * whole row. The repo rule is `mode` = changes semantics, `variant` = changes layout only.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `mode: 'modal'` is equally valid and needs no import. See {@link EditingMode}.
 */
export const EditingMode = {
	/** The row itself swaps its cells for inputs. The default. */
	Row: 'row',
	/** A modal dialog holding the whole row's fields. */
	Modal: 'modal',
	/** Only the clicked cell becomes an input. */
	Cell: 'cell',
} as const

export type EditingMode = (typeof EditingMode)[keyof typeof EditingMode]

export type EditingConfig<TData> = FeatureToggle & {
	/** How the edit flow behaves. Default: {@link EditingMode.Row}. */
	mode?: EditingMode
	validate?: ValidateConfig<TData>
	validateOn?: ValidateOn
	validateDebounceMs?: number
	/**
	 * Called when the user commits the edit form (or cell). Return nothing for
	 * synchronous handlers, a `Promise` for async work. Throw
	 * {@link ValidationError} from inside to surface server-side validation
	 * errors back into the form state.
	 */
	onSave: (ctx: EditingSaveContext<TData>) => void | Promise<void>
}

export type EditingApi<TData = unknown> = {
	start: (rowId: string) => void
	startCell: (rowId: string, columnId: string) => void
	cancel: () => void
	commit: () => Promise<void>
	commitCell: () => Promise<void>
	setValue: (key: string, value: unknown) => void
	setValues: (patch: Partial<TData>) => void
	setErrors: (errors: ValidationErrors | null) => void
	setFormError: (msg: string | null) => void
	validate: () => Promise<ValidationResult>
	/** Internal — called by FieldState.onBlur in the react adapter. */
	validateField: (columnId: string) => Promise<void>
	getState: () => EditingState
}

declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState {
		editing: EditingState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableOptionsResolved<TData extends RowData> {
		editing?: EditingConfig<TData>
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Table<TData extends RowData> {
		editing: EditingApi<TData>
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Row<TData extends RowData> {
		getIsEditing: () => boolean
	}
}

const INITIAL_STATE: EditingState = {
	rowId: null,
	cellId: null,
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

function extractColumnId(rowId: string, cellId: string): string {
	return cellId.startsWith(`${rowId}_`) ? cellId.slice(rowId.length + 1) : cellId
}

export const EditingFeature: TableFeature<RowData> = {
	getInitialState: (state?: InitialTableState) =>
		({
			...state,
			editing: { ...INITIAL_STATE },
		}) as Partial<TableState>,

	createTable: (table: Table<RowData>) => {
		// Single AbortController per table instance. Shared between commit / validate / blur / change.
		let controller: AbortController | undefined

		const getConfig = (): EditingConfig<RowData> | undefined => table.options.editing
		const getState = (): EditingState => table.getState().editing

		const writeState = (patch: Partial<EditingState>): void => {
			table.setState((prev) => ({
				...prev,
				editing: { ...prev.editing, ...patch },
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
				const { [columnId]: _removed, ...rest } = prev.editing.errors
				const fieldErrs = result?.errors?.[columnId]
				const nextErrors = fieldErrs && fieldErrs.length > 0 ? { ...rest, [columnId]: fieldErrs } : rest
				return {
					...prev,
					editing: { ...prev.editing, errors: nextErrors, commitStatus: 'idle' },
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

		const snapshotRow = (rowId: string): Record<string, unknown> => {
			const row = table.getRowModel().rows.find((r) => r.id === rowId)
			const initial: Record<string, unknown> = {}
			if (!row) return initial
			for (const col of table.getAllColumns()) {
				if (col.id && !col.columnDef.meta?.isSystemColumn) {
					initial[col.id] = row.getValue(col.id)
				}
			}
			return initial
		}

		const api: EditingApi = {
			start: (rowId) => {
				resetController()
				writeState({
					rowId,
					cellId: null,
					values: snapshotRow(rowId),
					errors: {},
					formError: null,
					commitStatus: 'idle',
				})
			},

			startCell: (rowId, columnId) => {
				resetController()
				const row = table.getRowModel().rows.find((r) => r.id === rowId)
				const initialValue = row?.getValue(columnId)
				writeState({
					rowId,
					cellId: `${rowId}_${columnId}`,
					values: { [columnId]: initialValue },
					errors: {},
					formError: null,
					commitStatus: 'idle',
				})
			},

			cancel: () => {
				controller?.abort()
				controller = undefined
				writeState({ ...INITIAL_STATE })
			},

			commit: async () => {
				const config = getConfig()
				if (!config) return
				const { rowId, commitStatus, values } = getState()
				if (!rowId) return
				if (commitStatus !== 'idle') return // UI invariant

				const c = resetController()

				writeState({
					errors: {},
					formError: null,
					commitStatus: 'validating',
				})

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

				writeState({ commitStatus: 'saving' })
				try {
					await config.onSave({ rowId, values, signal: c.signal })
					if (c.signal.aborted) return
					writeState({ ...INITIAL_STATE })
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

			commitCell: async () => {
				const config = getConfig()
				if (!config) return
				const { rowId, cellId, commitStatus, values } = getState()
				if (!rowId || !cellId) return
				if (commitStatus !== 'idle') return

				const columnId = extractColumnId(rowId, cellId)
				const cellValues: Record<string, unknown> = { [columnId]: values[columnId] }

				const c = resetController()

				writeState({
					errors: {},
					formError: null,
					commitStatus: 'validating',
				})

				if (config.validate) {
					let result: ValidationResult
					try {
						result = await runValidate(cellValues, { signal: c.signal, cell: { columnId } })
					} catch (e) {
						if (c.signal.aborted) return
						writeState({ commitStatus: 'idle' })
						throw e
					}
					if (c.signal.aborted) return
					if (result !== null) {
						const fieldErrs = result.errors?.[columnId]
						writeState({
							// In cell mode only the edited column's error is surfaced;
							// cross-field refine errors land in `formError`-free zone (ignored).
							errors: fieldErrs && fieldErrs.length > 0 ? { [columnId]: fieldErrs } : {},
							formError: null,
							commitStatus: 'idle',
						})
						return
					}
				}

				writeState({ commitStatus: 'saving' })
				try {
					await config.onSave({ rowId, values: cellValues, signal: c.signal })
					if (c.signal.aborted) return
					writeState({ ...INITIAL_STATE })
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
					const { [key]: _removed, ...remainingErrors } = prev.editing.errors
					return {
						...prev,
						editing: {
							...prev.editing,
							values: { ...prev.editing.values, [key]: value },
							errors: remainingErrors,
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
					editing: {
						...prev.editing,
						values: { ...prev.editing.values, ...(patch as Record<string, unknown>) },
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

		table.editing = api
	},

	createRow: (row: Row<RowData>, table: Table<RowData>) => {
		row.getIsEditing = () => table.getState().editing.rowId === row.id
	},
}
