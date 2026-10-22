import { assignPrototypeAPIs } from '@tanstack/table-core'

import { ColumnFormMode, resolveColumnFormConfig } from '../../column/resolve-form-config'
import { DEFAULT_VALIDATE_DEBOUNCE_MS } from '../../defaults'
import { assignTableInstanceData, readOwnSlice, writeOwnSlice } from '../../feature-state'
import { abortChecks, checkValues, commitClosed, commitInFlight, runCommit, trackCommit } from '../form'
import { CommitStatus, runValidator, ValidateOn } from '../validation'

import type { ColumnEditingConfig } from '../../column/types'
import type { AnyTable } from '../../feature-state'
import type { FeatureToggle } from '../../utils/feature-flag'
import type { CommitOptions, CommitResult, FormWorkBox } from '../form'
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
	/**
	 * The row being edited, as it is in `data` (`row.original`) — every field, including the
	 * ones no column shows, such as a `version` for optimistic locking. Read-only: what is saved
	 * is `values`. `undefined` only when the row left `data` while the form was open.
	 */
	row: TData | undefined
	/**
	 * Field values currently in the form: only the fields of the edit form — no system column and
	 * no column with `editing: false`; read anything else from `row`. In cell mode, only the
	 * edited column. A form of one's own that passes `values` to `commit` sends exactly those.
	 */
	values: Partial<TData>
	/** Aborted when the user cancels edit, calls cancel(), or the table unmounts. */
	signal: AbortSignal
}

const DEFAULT_VALIDATE_ON: ValidateOn = ValidateOn.Submit

export type EditingState = {
	rowId: string | null
	/** Populated only in cell mode (`<rowId>_<columnId>`). */
	cellId: string | null
	values: Record<string, unknown>
	/**
	 * The values the form opened with — the row's, for the fields of the edit form. Written once
	 * by `start()` / `startCell()` and never by an edit, so its identity is stable for as long as
	 * the form stays open.
	 */
	initialValues: Readonly<Record<string, unknown>>
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
	/**
	 * Validate and save the row. With `values`, those replace the form's values first — the path
	 * a form of one's own takes. Resolves to a {@link CommitResult}; a second call while one is
	 * in flight resolves to the same promise.
	 */
	commit: (options?: CommitOptions) => Promise<CommitResult>
	/** Validate and save the one open cell. Resolves like {@link EditingApi.commit}. */
	commitCell: () => Promise<CommitResult>
	setValue: (key: string, value: unknown) => void
	setValues: (patch: Partial<TData>) => void
	setErrors: (errors: ValidationErrors | null) => void
	setFormError: (msg: string | null) => void
	/**
	 * Validate the form's values and write the result into the slice. Resolves `null`, running
	 * nothing, while a commit is in flight — the commit validates anyway.
	 */
	validate: () => Promise<ValidationResult>
	/**
	 * Run the configured validator over `values` and return its result, writing nothing — no
	 * values, no errors, no status. Cancelled only by the form closing, never by a save, so a form
	 * of one's own can check a field on blur freely.
	 *
	 * `null` means valid **or** that there is nothing to validate for: no validator configured, no
	 * form open, or the form closed while the check ran. Checks are not ordered against each other,
	 * so a form that runs several at once keeps the latest one's result itself.
	 */
	validateValues: (values: Record<string, unknown>) => Promise<ValidationResult>
	/** Internal — called by FieldState.onBlur in the react adapter. */
	validateField: (columnId: string) => Promise<void>
	getState: () => EditingState
}

/**
 * The in-flight `AbortController`s for a table, held in a box rather than directly.
 *
 * `initTableInstanceData` installs the member once; every swap after that mutates a field of the
 * box, so nothing ever reassigns the property that was installed. That is what lets
 * `resetTableInstanceData` clear them without needing the whole `Table_FeatureMap` entry back in
 * hand, and what keeps `table.editing`'s closure and the reset hook looking at one box.
 *
 * **Two controllers, because two different things cancel them.** A field validation is cancelled
 * by the next blur or keystroke; a form operation is cancelled by `cancel`, by the next commit, or
 * by a table reset. They shared one controller until it was measured that a field event then
 * cancelled a save: see {@link resetFormController}.
 */
// `| undefined` explicitly: under `exactOptionalPropertyTypes` a bare `form?:` could not be
// cleared by assignment, and clearing them is what `cancel` and `resetTableInstanceData` do.
export type EditingAbortBox = FormWorkBox

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
	initialValues: Object.freeze({}),
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
	getCoreRowModel: () => { rowsById: Record<string, { original: unknown } | undefined> }
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
	const validate = editingOption(table)?.validate
	return validate ? await runValidator(validate, values, ctx) : null
}

/**
 * Begin a form-level operation: supersede the previous one **and** any pending field validation.
 *
 * Field work and form work are cancelled by different events, so they cannot share a controller.
 * While they did, clicking Save with the caret still in an editor was a race between the click and
 * the blur that click causes: whichever reached the box second aborted the first. With a UI kit
 * whose button takes focus on press, the blur landed before `commit` started and everything worked.
 * With one that leaves focus where it is, the blur arrived **during** the save's `await` and
 * aborted it — so `onSave` resolved straight into `if (signal.aborted) return`, and the row sat in
 * its editor for ever, showing neither the saved value nor the rejection it should have. The
 * asymmetry was HeroUI 3.2 against 3.0; the defect was here. A field event must not cancel a form
 * operation, whatever a kit does with focus.
 *
 * The reverse **is** wanted, which is why this aborts `field` too: a save validates the whole form,
 * so a half-finished field check is not worth keeping, and letting it finish would write
 * `commitStatus: Idle` over the `Saving` this operation is about to set.
 */
function resetFormController(table: AnyTable): AbortController {
	const box = abortBox(table)
	box.form?.abort()
	box.field?.abort()
	box.field = undefined
	const c = new AbortController()
	box.form = c
	return c
}

/**
 * Begin a field-level validation, cancelling only the previous one — never the form's.
 *
 * Returns `undefined` while a form operation is in flight, and the caller then does nothing: the
 * commit validates every field anyway, and a blur that resolved afterwards would write
 * `commitStatus: Idle` over the commit's own status, re-enabling the save button mid-save.
 */
function resetFieldController(table: EditingTable): AbortController | undefined {
	if (readEditing(table).commitStatus !== CommitStatus.Idle) return undefined

	const box = abortBox(table)
	box.field?.abort()
	const c = new AbortController()
	box.field = c
	return c
}

/** Tear everything down — a new form opens, the user cancels, or the table resets. */
function abortAll(table: AnyTable): void {
	const box = abortBox(table)
	box.form?.abort()
	box.field?.abort()
	abortChecks(box)
	box.form = undefined
	box.field = undefined
	box.commit = undefined
}

/**
 * Validate one field and write only that field's errors.
 *
 * **It must not touch `commitStatus`.** That status describes the *form* — `isPending` in the
 * actions cell is `commitStatus !== Idle`, and the kits bind it to the save button's disabled
 * state. A field validation runs on blur, and the blur that matters is the one the save click
 * itself causes: pointer down on Save, focus leaves the editor, this ran, the button went disabled
 * for the length of an `await`, and React Aria cancelled the press it was in the middle of. The
 * click never became a press, `commit` was never called, and the row sat in its editor with no
 * error and no saved value. Whether the disable landed inside the press window depended on the
 * kit's focus timing, which is why it looked like a HeroUI 3.2 regression and was not one — shadcn
 * and HeroUI 3.0 simply got lucky with the ordering.
 *
 * The field's own errors are the whole output; anything wider belongs to `commit` and `validate`.
 */
async function validateAndApplyField(table: EditingTable, columnId: string, signal: AbortSignal): Promise<void> {
	if (signal.aborted) return
	const config = editingOption(table)
	if (!config?.validate) return

	const values = readEditing(table).values
	let result: ValidationResult
	try {
		result = await runValidate(table, values, { signal, cell: { columnId } })
	} catch (e) {
		if (isAbortError(e)) return
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (signal.aborted) return
		throw e
	}
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (signal.aborted) return

	writeOwnSlice(table, 'editing', (prev) => {
		const { [columnId]: _removed, ...rest } = prev.errors
		const fieldErrs = result?.errors?.[columnId]
		const nextErrors = fieldErrs && fieldErrs.length > 0 ? { ...rest, [columnId]: fieldErrs } : rest
		return { ...prev, errors: nextErrors }
	})
}

function scheduleChangeValidation(table: EditingTable, columnId: string): void {
	const c = resetFieldController(table)
	if (!c) return
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

/**
 * The row's values for the fields of the edit form — what `start()` seeds the form with.
 *
 * A field is in the form under the rule the generated form applies, through the same helper: not a
 * system column, and not opted out with `editing: false`. Seeding such a column too sent its value
 * to `onSave` as if the user had edited it; `row` in the save context is where it is read from now.
 */
function snapshotRow(table: EditingTable, rowId: string): Record<string, unknown> {
	const row = table.getRowModel().rows.find((r) => r.id === rowId)
	const initial: Record<string, unknown> = {}
	if (!row) return initial
	for (const col of table.getAllColumns()) {
		const meta = col.columnDef.meta
		if (!col.id || meta?.isSystemColumn === true) continue
		if (resolveColumnFormConfig(meta, ColumnFormMode.Editing) === false) continue
		initial[col.id] = row.getValue(col.id)
	}
	return initial
}

/** The edited row's original, looked up in the core row model so filtering and paging never hide it. */
function originalOf(table: EditingTable, rowId: string): RowData | undefined {
	return table.getCoreRowModel().rowsById[rowId]?.original as RowData | undefined
}

/** A save went through: end the open form's checks and write the closed, empty form back. */
function closeForm(table: AnyTable): void {
	abortChecks(abortBox(table))
	writeEditing(table, { ...INITIAL_STATE })
}

/** The one table member this feature installs — a namespace object, not a method. */
function createEditingApi(table: EditingTable): EditingApi<RowData> {
	return {
		start: (rowId) => {
			abortAll(table)
			const seed = snapshotRow(table, rowId)
			writeEditing(table, {
				rowId,
				cellId: null,
				values: seed,
				initialValues: seed,
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
			abortAll(table)
			const row = table.getRowModel().rows.find((r) => r.id === rowId)
			const seed = { [columnId]: row?.getValue(columnId) }
			writeEditing(table, {
				rowId,
				cellId: `${rowId}_${columnId}`,
				values: seed,
				initialValues: seed,
				errors: {},
				formError: null,
				commitStatus: CommitStatus.Idle,
			})
		},

		cancel: () => {
			abortAll(table)
			writeEditing(table, { ...INITIAL_STATE })
		},

		commit: (options) => {
			const config = editingOption(table)
			const state = readEditing(table)
			const { rowId } = state
			if (!config || !rowId) return commitClosed()
			// UI invariant — a second click is a no-op, and gets the first click's outcome.
			if (state.commitStatus !== CommitStatus.Idle) {
				return commitInFlight(abortBox(table))
			}

			const c = resetFormController(table)
			const values = options?.values ?? state.values
			writeEditing(table, {
				values,
				errors: {},
				formError: null,
				commitStatus: CommitStatus.Validating,
			})

			return trackCommit(
				abortBox(table),
				runCommit({
					signal: c.signal,
					values,
					validate: config.validate,
					validateContext: { signal: c.signal },
					save: (signal) => config.onSave({ rowId, row: originalOf(table, rowId), values, signal }),
					write: (patch) => {
						writeEditing(table, patch)
					},
					close: () => {
						closeForm(table)
					},
				}),
			)
		},

		commitCell: () => {
			const config = editingOption(table)
			const state = readEditing(table)
			const { rowId, cellId } = state
			if (!config || !rowId || !cellId) return commitClosed()
			if (state.commitStatus !== CommitStatus.Idle) {
				return commitInFlight(abortBox(table))
			}

			const columnId = extractColumnId(rowId, cellId)
			const cellValues: Record<string, unknown> = { [columnId]: state.values[columnId] }

			const c = resetFormController(table)
			writeEditing(table, {
				errors: {},
				formError: null,
				commitStatus: CommitStatus.Validating,
			})

			return trackCommit(
				abortBox(table),
				runCommit({
					signal: c.signal,
					values: cellValues,
					validate: config.validate,
					validateContext: { signal: c.signal, cell: { columnId } },
					// In cell mode only the edited column's error is surfaced; cross-field refine
					// errors and a form-level message have nowhere to show, so they are dropped.
					toProblems: (result) => {
						const fieldErrs = result.errors?.[columnId]
						return {
							errors: fieldErrs && fieldErrs.length > 0 ? { [columnId]: fieldErrs } : {},
							formError: null,
						}
					},
					save: (signal) => config.onSave({ rowId, row: originalOf(table, rowId), values: cellValues, signal }),
					write: (patch) => {
						writeEditing(table, patch)
					},
					close: () => {
						closeForm(table)
					},
				}),
			)
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
			// A commit in flight already validates; superseding it would abandon a save that may have
			// reached the server, and report it as cancelled.
			if (readEditing(table).commitStatus !== CommitStatus.Idle) return null
			const c = resetFormController(table)
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

		validateValues: (values) =>
			checkValues(abortBox(table), readEditing(table).rowId !== null, editingOption(table)?.validate, values),

		validateField: async (columnId) => {
			const c = resetFieldController(table)
			if (!c) return
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
		abortAll(table)
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
