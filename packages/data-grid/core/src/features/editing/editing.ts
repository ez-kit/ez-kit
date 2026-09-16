import { assignPrototypeAPIs } from '@tanstack/table-core'

import { DEFAULT_VALIDATE_DEBOUNCE_MS } from '../../defaults'
import { assignTableInstanceData, readOwnSlice, writeOwnSlice } from '../../feature-state'
import { CommitStatus, isValidationError, ValidateOn, zodSafeParseToResult } from '../validation'

import type { ColumnEditingConfig } from '../../column/types'
import type { AnyTable } from '../../feature-state'
import type { FeatureToggle } from '../../utils/feature-flag'
import type { ValidateConfig, ValidateContext, ValidationErrors, ValidationResult } from '../validation'
import type { RowData, TableFeature, TableFeatures } from '@tanstack/table-core'

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

const DEFAULT_VALIDATE_ON: ValidateOn = ValidateOn.Submit
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
	/** When a field validates. Default: {@link ValidateOn.Submit}. */
	validateOn?: ValidateOn
	/**
	 * Debounce (ms) before validation runs while the user types. Applies only when the resolved
	 * `validateOn` is {@link ValidateOn.Change}. Default:
	 * {@link DEFAULT_VALIDATE_DEBOUNCE_MS} (200). Override per column with `column.editing.debounce`.
	 *
	 * Spelled `debounce`, like `filtering.debounce` and `globalFiltering.debounce` — one word for
	 * "wait this long before acting on typing". The unit is milliseconds throughout the config, so
	 * it stays out of the name.
	 */
	debounce?: number
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

/**
 * The single in-flight `AbortController` for a table, held in a box rather than directly.
 *
 * `initTableInstanceData` installs the member once; every swap after that mutates
 * `box.controller`, so nothing ever reassigns the property that was installed. That is what lets
 * `resetTableInstanceData` clear the controller without needing the whole `Table_FeatureMap` entry
 * back in hand, and what keeps `table.editing`'s closure and the reset hook looking at one box.
 */
// `| undefined` explicitly: under `exactOptionalPropertyTypes` a bare `controller?:` could not be
// cleared by assignment, and clearing it is what `cancel` and `resetTableInstanceData` both do.
export type EditingAbortBox = { controller?: AbortController | undefined }

declare module '@tanstack/table-core' {
	// Declaration merging needs interfaces; these are the shapes upstream declares as such.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Plugins {
		editingFeature: TableFeature
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_FeatureMap {
		editingFeature: { editing: EditingState }
	}

	// `TableState_FeatureMap` feeds `TableState<TFeatures>` only; `TableState_All` is what feature
	// internals — and `SliceKey` in `../../feature-state` — read through. A feature that augments
	// only the first cannot name its own slice at `readOwnSlice(table, 'editing')`.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_All {
		editing?: EditingState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		editingFeature: { editing?: EditingConfig<TData> }
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		editingFeature: {
			/** The whole edit flow — open, mutate, validate, commit, cancel. */
			editing: EditingApi<TData>
			/** Internal. The in-flight validate / save controller. See {@link EditingAbortBox}. */
			_editingAbort: EditingAbortBox
		}
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Row_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		editingFeature: {
			/** Whether this row is the one currently being edited. */
			getIsEditing: () => boolean
		}
	}
}

/**
 * The closed, empty form — what `getInitialState` seeds and what `cancel`, `commit` and
 * `commitCell` write back.
 *
 * **Frozen, and frozen at both levels.** Those writes are `{ ...INITIAL_STATE }`, a *shallow* copy,
 * so the `values` and `errors` a closed form holds are **this object's** — by reference, where v8
 * wrote a fresh `{}` at each site. Nothing mutates them today, so this closes a latent aliasing
 * hazard rather than a live bug. A shallow `Object.freeze` would not have done it: the hazard is
 * the nested objects, not the outer one, which every write replaces anyway.
 *
 * `creating.ts` carries the identical constant and the identical freeze; the two files are twins
 * and a divergence between them is a defect in one of them.
 */
const INITIAL_STATE: EditingState = Object.freeze({
	rowId: null,
	cellId: null,
	values: Object.freeze({}),
	errors: Object.freeze({}),
	formError: null,
	commitStatus: CommitStatus.Idle,
})

/**
 * The column shape this feature reads, and the row shape it snapshots.
 *
 * Structural, and it stays that way now that the v8 `declare module` blocks are gone and all
 * three names resolve at v9's arity. What blocks naming them is not shadowing but the feature set:
 * `Column`'s and `Row`'s members come from their `*_FeatureMap` keyed by `TFeatures`, which is
 * unresolved inside a feature — the same wall `../../feature-state` exists for. The all-in
 * instantiation resolves them but asserts every feature's API is present and accepts no narrow
 * table (`TS2379`), so it is not a substitute. `../ordering/row-ordering.ts` records the two
 * experiments in full.
 */
type EditingColumn = {
	id: string
	columnDef: { meta?: { editing?: false | ColumnEditingConfig; isSystemColumn?: boolean } | undefined }
}

/** The row shape `snapshotRow` and `startCell` read. Structural for the same reason. */
type EditingRow = { id: string; getValue: (columnId: string) => unknown }

/**
 * A table, as this feature's free functions see it.
 *
 * Every helper below takes it as its first argument rather than closing over one. That is not
 * cosmetic: `constructTableAPIs` and `initTableInstanceData` hand the table in, and
 * `assignRowPrototype` does not — its `fn` is handed the **row**, and reaches the table through
 * `row.table`. Hoisting is what lets both halves call the same code.
 */
type EditingTable = AnyTable & {
	getAllColumns: () => EditingColumn[]
	getColumn: (columnId: string) => EditingColumn | undefined
	getRowModel: () => { rows: EditingRow[] }
}

/** The row instance an `assignPrototypeAPIs` `fn` receives as its first argument. */
type EditingRowInstance = { id: string; table: AnyTable }

/**
 * The feature's own option, read off a table whose `TFeatures` is unresolved.
 *
 * `table.options` is `TableOptions<TFeatures, TData>`, assembled from `TableOptions_FeatureMap`
 * by feature key, so a key this feature merged in is not provable inside the feature itself.
 * Upstream's custom-feature skill reads its own option the same way. This survived the removal of
 * the v8 `declare module` blocks unchanged, as it was expected to: it is a property of feature
 * code, not of the shadowing those blocks did.
 */
const editingOption = (table: { readonly options: object }): EditingConfig<RowData> | undefined =>
	(table.options as { editing?: EditingConfig<RowData> }).editing

/**
 * The table's abort box, read off a table whose `TFeatures` is unresolved.
 *
 * Same reason as {@link editingOption}: `Table_FeatureMap` contributes `_editingAbort` only when
 * `editingFeature` is provably in `TFeatures`, which it is not from inside the feature. The
 * **write** side needs no cast — `assignTableInstanceData` checks the member names against the
 * declaration above.
 */
const abortBox = (table: AnyTable): EditingAbortBox =>
	(table as unknown as { _editingAbort: EditingAbortBox })._editingAbort

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

/** The current slice. `editing` is this feature's own, so the read is not optional. */
function readEditing(table: AnyTable): EditingState {
	return readOwnSlice(table, 'editing')
}

/**
 * Merge a patch into the slice.
 *
 * `writeOwnSlice`, not `table.setState`: the write now touches one slice instead of rebuilding
 * the whole `TableState`, so a subscriber to another slice is no longer woken by a keystroke in a
 * form field. Every write this feature makes is to `editing` alone — no operation writes two
 * slices, so nothing here needs `batch`.
 */
function writeEditing(table: AnyTable, patch: Partial<EditingState>): void {
	writeOwnSlice(table, 'editing', (prev) => ({ ...prev, ...patch }))
}

/** The column's own editing config, or `undefined` when it disabled editing entirely. */
function resolveColumnEditing(table: EditingTable, columnId: string): ColumnEditingConfig | undefined {
	const fromColumn = table.getAllColumns().find((c) => c.id === columnId)?.columnDef.meta?.editing
	return fromColumn === false ? undefined : fromColumn
}

function resolveValidateOn(table: EditingTable, columnId: string): ValidateOn {
	const fromColumn = resolveColumnEditing(table, columnId)?.validateOn
	if (fromColumn) return fromColumn
	return editingOption(table)?.validateOn ?? DEFAULT_VALIDATE_ON
}

function resolveDebounceMs(table: EditingTable, columnId: string): number {
	const fromColumn = resolveColumnEditing(table, columnId)?.debounce
	if (fromColumn !== undefined) return fromColumn
	return editingOption(table)?.debounce ?? DEFAULT_VALIDATE_DEBOUNCE_MS
}

async function runValidate(
	table: EditingTable,
	values: Record<string, unknown>,
	ctx: ValidateContext,
): Promise<ValidationResult> {
	const config = editingOption(table)
	if (!config?.validate) return null
	if (typeof config.validate === 'function') {
		return await config.validate(values, ctx)
	}
	return zodSafeParseToResult(config.validate.schema, values)
}

/** Abort whatever is in flight and install a fresh controller in the box. */
function resetController(table: AnyTable): AbortController {
	const box = abortBox(table)
	box.controller?.abort()
	const c = new AbortController()
	box.controller = c
	return c
}

async function validateAndApplyField(table: EditingTable, columnId: string, signal: AbortSignal): Promise<void> {
	if (signal.aborted) return
	const config = editingOption(table)
	if (!config?.validate) return

	writeEditing(table, { commitStatus: CommitStatus.Validating })
	const values = readEditing(table).values
	let result: ValidationResult
	try {
		result = await runValidate(table, values, { signal, cell: { columnId } })
	} catch (e) {
		if (isAbortError(e)) return
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (signal.aborted) return
		writeEditing(table, { commitStatus: CommitStatus.Idle })
		throw e
	}
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (signal.aborted) return

	writeOwnSlice(table, 'editing', (prev) => {
		const { [columnId]: _removed, ...rest } = prev.errors
		const fieldErrs = result?.errors?.[columnId]
		const nextErrors = fieldErrs && fieldErrs.length > 0 ? { ...rest, [columnId]: fieldErrs } : rest
		return { ...prev, errors: nextErrors, commitStatus: CommitStatus.Idle }
	})
}

function scheduleChangeValidation(table: EditingTable, columnId: string): void {
	const c = resetController(table)
	const ms = resolveDebounceMs(table, columnId)
	void (async () => {
		try {
			await abortableSleep(ms, c.signal)
			if (c.signal.aborted) return
			await validateAndApplyField(table, columnId, c.signal)
		} catch (e) {
			if (isAbortError(e)) return
			throw e
		}
	})()
}

function snapshotRow(table: EditingTable, rowId: string): Record<string, unknown> {
	const row = table.getRowModel().rows.find((r) => r.id === rowId)
	const initial: Record<string, unknown> = {}
	if (!row) return initial
	for (const col of table.getAllColumns()) {
		if (col.id && col.columnDef.meta?.isSystemColumn !== true) {
			initial[col.id] = row.getValue(col.id)
		}
	}
	return initial
}

/** The one table member this feature installs — a namespace object, not a method. */
function createEditingApi(table: EditingTable): EditingApi<RowData> {
	return {
		start: (rowId) => {
			resetController(table)
			writeEditing(table, {
				rowId,
				cellId: null,
				values: snapshotRow(table, rowId),
				errors: {},
				formError: null,
				commitStatus: CommitStatus.Idle,
			})
		},

		startCell: (rowId, columnId) => {
			// A column that opted out with `editing: false` is not editable in any mode.
			// The React layer already renders no double-click affordance for it; this
			// makes the programmatic path agree rather than quietly opening an input.
			if (table.getColumn(columnId)?.columnDef.meta?.editing === false) return
			resetController(table)
			const row = table.getRowModel().rows.find((r) => r.id === rowId)
			const initialValue = row?.getValue(columnId)
			writeEditing(table, {
				rowId,
				cellId: `${rowId}_${columnId}`,
				values: { [columnId]: initialValue },
				errors: {},
				formError: null,
				commitStatus: CommitStatus.Idle,
			})
		},

		cancel: () => {
			const box = abortBox(table)
			box.controller?.abort()
			box.controller = undefined
			writeEditing(table, { ...INITIAL_STATE })
		},

		commit: async () => {
			const config = editingOption(table)
			if (!config) return
			const { rowId, commitStatus, values } = readEditing(table)
			if (!rowId) return
			if (commitStatus !== CommitStatus.Idle) return // UI invariant

			const c = resetController(table)

			writeEditing(table, {
				errors: {},
				formError: null,
				commitStatus: CommitStatus.Validating,
			})

			if (config.validate) {
				let result: ValidationResult
				try {
					result = await runValidate(table, values, { signal: c.signal })
				} catch (e) {
					if (c.signal.aborted) return
					writeEditing(table, { commitStatus: CommitStatus.Idle })
					throw e
				}
				if (c.signal.aborted) return
				if (result !== null) {
					writeEditing(table, {
						errors: result.errors ?? {},
						formError: result.formError ?? null,
						commitStatus: CommitStatus.Idle,
					})
					return
				}
			}

			writeEditing(table, { commitStatus: CommitStatus.Saving })
			try {
				await config.onSave({ rowId, values, signal: c.signal })
				if (c.signal.aborted) return
				writeEditing(table, { ...INITIAL_STATE })
			} catch (e) {
				if (c.signal.aborted) return
				if (isValidationError(e)) {
					writeEditing(table, {
						errors: e.errors,
						formError: e.formError ?? null,
						commitStatus: CommitStatus.Idle,
					})
					return
				}
				writeEditing(table, {
					formError: GENERIC_FORM_ERROR,
					commitStatus: CommitStatus.Idle,
				})
				throw e
			}
		},

		commitCell: async () => {
			const config = editingOption(table)
			if (!config) return
			const { rowId, cellId, commitStatus, values } = readEditing(table)
			if (!rowId || !cellId) return
			if (commitStatus !== CommitStatus.Idle) return

			const columnId = extractColumnId(rowId, cellId)
			const cellValues: Record<string, unknown> = { [columnId]: values[columnId] }

			const c = resetController(table)

			writeEditing(table, {
				errors: {},
				formError: null,
				commitStatus: CommitStatus.Validating,
			})

			if (config.validate) {
				let result: ValidationResult
				try {
					result = await runValidate(table, cellValues, { signal: c.signal, cell: { columnId } })
				} catch (e) {
					if (c.signal.aborted) return
					writeEditing(table, { commitStatus: CommitStatus.Idle })
					throw e
				}
				if (c.signal.aborted) return
				if (result !== null) {
					const fieldErrs = result.errors?.[columnId]
					writeEditing(table, {
						// In cell mode only the edited column's error is surfaced;
						// cross-field refine errors land in `formError`-free zone (ignored).
						errors: fieldErrs && fieldErrs.length > 0 ? { [columnId]: fieldErrs } : {},
						formError: null,
						commitStatus: CommitStatus.Idle,
					})
					return
				}
			}

			writeEditing(table, { commitStatus: CommitStatus.Saving })
			try {
				await config.onSave({ rowId, values: cellValues, signal: c.signal })
				if (c.signal.aborted) return
				writeEditing(table, { ...INITIAL_STATE })
			} catch (e) {
				if (c.signal.aborted) return
				if (isValidationError(e)) {
					writeEditing(table, {
						errors: e.errors,
						formError: e.formError ?? null,
						commitStatus: CommitStatus.Idle,
					})
					return
				}
				writeEditing(table, {
					formError: GENERIC_FORM_ERROR,
					commitStatus: CommitStatus.Idle,
				})
				throw e
			}
		},

		setValue: (key, value) => {
			writeOwnSlice(table, 'editing', (prev) => {
				const { [key]: _removed, ...remainingErrors } = prev.errors
				return {
					...prev,
					values: { ...prev.values, [key]: value },
					errors: remainingErrors,
				}
			})
			if (resolveValidateOn(table, key) === ValidateOn.Change && editingOption(table)?.validate) {
				scheduleChangeValidation(table, key)
			}
		},

		setValues: (patch) => {
			writeOwnSlice(table, 'editing', (prev) => ({
				...prev,
				values: { ...prev.values, ...(patch as Record<string, unknown>) },
			}))
		},

		setErrors: (errors) => {
			writeEditing(table, { errors: errors ?? {} })
		},

		setFormError: (msg) => {
			writeEditing(table, { formError: msg })
		},

		validate: async () => {
			const config = editingOption(table)
			if (!config?.validate) return null
			const c = resetController(table)
			const values = readEditing(table).values
			writeEditing(table, { commitStatus: CommitStatus.Validating })
			let result: ValidationResult
			try {
				result = await runValidate(table, values, { signal: c.signal })
			} catch (e) {
				if (c.signal.aborted) return null
				writeEditing(table, { commitStatus: CommitStatus.Idle })
				throw e
			}
			if (c.signal.aborted) return null
			writeEditing(table, {
				errors: result?.errors ?? {},
				formError: result?.formError ?? null,
				commitStatus: CommitStatus.Idle,
			})
			return result
		},

		validateField: async (columnId) => {
			const c = resetController(table)
			try {
				await validateAndApplyField(table, columnId, c.signal)
			} catch (e) {
				if (isAbortError(e)) return
				throw e
			}
		},

		getState: () => readEditing(table),
	}
}

/**
 * Row / cell / modal editing, as a v9 table feature.
 *
 * Owns the `editing` slice — transient per-open-form state, never seeded from `initialState` —
 * and installs one namespace object, `table.editing`, plus `row.getIsEditing()`.
 *
 * `editing` goes in through `initTableInstanceData` rather than `constructTableAPIs`: it is a
 * namespace **object**, and `assignTableAPIs` installs one function per key, so it cannot express
 * `table.editing.commit`. `_editingAbort` belongs there for the other reason the hook exists —
 * it is mutable per-table data, which a prototype-shared method may read but must never close
 * over.
 */
export const editingFeature: TableFeature = {
	// `editing` last, not `initialState` last as every other feature spreads it: this slice is
	// transient per-open-form state and is hard-reset at construction. `TableConfig`'s
	// `initialState` rejects it at the type level for the same reason; this is the runtime half.
	getInitialState: (initialState) => ({
		...initialState,
		editing: { ...INITIAL_STATE },
	}),

	initTableInstanceData: (table) => {
		// Not a hand-written cast: `assignTableInstanceData` checks both member names against the
		// `Table_FeatureMap` entry above, so a misspelled one cannot install silently.
		assignTableInstanceData('editingFeature', table, {
			editing: createEditingApi(table),
			_editingAbort: {},
		})
	},

	// Runs after `table.reset()` has restored internally owned atoms, so this does **only** the
	// part state restoration cannot: tearing down the in-flight controller, so a late `onSave`
	// resolution writes nothing. Closing the open form is already done by then — `table_reset`
	// writes every key of `table.initialState` back through `baseAtoms` in one batch, and this
	// feature's `getInitialState` put `editing: INITIAL_STATE` in that snapshot. Do not clear the
	// slice here as well: it would write an atom the reset pass already wrote, outside its batch.
	//
	// Behaviour v8 did not have — the controller lived in a closure with no reset hook to reach it.
	resetTableInstanceData: (table) => {
		const box = abortBox(table)
		box.controller?.abort()
		box.controller = undefined
	},

	assignRowPrototype: (prototype, table) => {
		assignPrototypeAPIs('editingFeature', prototype, table, {
			// `getFunctionNameInfo` strips the `row_` prefix, so this installs as
			// `row.getIsEditing`.
			//
			// **`fn` receives the row first.** `assignPrototypeAPIs` installs
			// `function (...args) { return fn(this, ...args) }` in the plain branch and
			// `fn(self, ...deps)` in the memoized one — unlike `assignTableAPIs`, which installs
			// `fn` verbatim. Writing this as a closure over the hook's `table` would put every
			// argument off by one, silently, because `fn` is typed `(self: any, ...args: any)`.
			//
			// The table comes from `row.table`, not from the closure: every stock feature reads
			// state that way, and a method that captures nothing stays correct if the prototype is
			// ever reused. Per-**table** data in a closure would be sound; per-row data never is.
			row_getIsEditing: {
				fn: (row: EditingRowInstance) => readEditing(row.table).rowId === row.id,
			},
		})
	},
}
