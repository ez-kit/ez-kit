import { ColumnFormMode, resolveColumnFormConfig } from '../../column/resolve-form-config'
import { DEFAULT_VALIDATE_DEBOUNCE_MS } from '../../defaults'
import { assignTableInstanceData, readOwnSlice, writeOwnSlice } from '../../feature-state'
import { CommitStatus, isValidationError, ValidateOn, zodSafeParseToResult } from '../validation'

import type { FormColumnMeta, ResolvedColumnFormConfig } from '../../column/resolve-form-config'
import type { AnyTable } from '../../feature-state'
import type { FeatureToggle } from '../../utils/feature-flag'
import type { ValidateConfig, ValidateContext, ValidationErrors, ValidationResult } from '../validation'
import type { RowData, Table, TableFeature, TableFeatures } from '@tanstack/table-core'

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
	// `TRow & object` rather than `TRow`: v9's `RowData` is `Record<string, any> | Array<any>`,
	// and `TRow` is unconstrained here because `ColumnCreatingConfig` defaults it to `unknown`.
	// The intersection adds nothing for any real row type — rows are objects — and is what keeps
	// this public type naming `Table` rather than degrading to a structural stand-in.
	//
	// `TableFeatures` — the base, where every feature key is optional — is the widest
	// instantiation, so `ExtractFeatureMapTypes` contributes every feature's table API and a
	// callback written against this context keeps reaching what it reached under v8. The same
	// choice `RowActionsContext` makes, for the same reason: this type is not generic over a
	// feature set and the callback is handed a table whose set it never named.
	table: Table<TableFeatures, TRow & object>
	/** Id of the column whose default is being resolved. */
	columnId: string
}

/**
 * Context passed to the function form of {@link CreatingConfig.defaultValues}.
 *
 * Minimal for the same reason as {@link CreateDefaultValueContext} — see its doc comment,
 * including the note on `TRow & object` and on the `TableFeatures` instantiation.
 *
 * @typeParam TRow - row data type
 */
export type CreateDefaultValuesContext<TRow> = {
	table: Table<TableFeatures, TRow & object>
}

const DEFAULT_VALIDATE_ON: ValidateOn = ValidateOn.Submit
const GENERIC_FORM_ERROR = 'Unexpected error'

export type CreatingState = {
	isOpen: boolean
	values: Record<string, unknown>
	errors: ValidationErrors
	formError: string | null
	commitStatus: CommitStatus
}

/**
 * How the create flow behaves. `mode` and not `variant` because the members differ in
 * behaviour, not only in layout: `pin-row` keeps the form permanently open and renders no
 * create trigger at all. The repo rule is `mode` = changes semantics, `variant` = changes
 * layout only.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `mode: 'modal'` is equally valid and needs no import. See {@link CreatingMode}.
 */
export const CreatingMode = {
	/** An extra row appended to the body while the form is open. */
	Row: 'row',
	/** A modal dialog opened from the toolbar's create trigger. */
	Modal: 'modal',
	/** A permanently pinned row at the top of the body; no create trigger is rendered. */
	PinRow: 'pin-row',
} as const

export type CreatingMode = (typeof CreatingMode)[keyof typeof CreatingMode]

export type CreatingConfig<TData> = FeatureToggle & {
	/** How the create flow behaves. Default: {@link CreatingMode.Row}. */
	mode?: CreatingMode
	validate?: ValidateConfig<TData>
	/** When a field validates. Default: {@link ValidateOn.Submit}. */
	validateOn?: ValidateOn
	/**
	 * Debounce (ms) before validation runs while the user types. Applies only when the resolved
	 * `validateOn` is {@link ValidateOn.Change}. Default:
	 * {@link DEFAULT_VALIDATE_DEBOUNCE_MS} (200). Override per column with
	 * `column.creating.debounce`. Same word and unit as `editing.debounce` and
	 * `filtering.debounce`.
	 */
	debounce?: number
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

/**
 * The in-flight `AbortController`s for a table, held in a box rather than directly.
 *
 * `initTableInstanceData` installs the member once; every swap after that mutates a field of the
 * box, so nothing ever reassigns the property that was installed. That is what lets
 * `resetTableInstanceData` clear them without needing the whole `Table_FeatureMap` entry back in
 * hand, and what keeps `table.creating`'s closure and the reset hook looking at one box.
 *
 * **Two controllers, because two different things cancel them.** A field validation is cancelled
 * by the next blur or keystroke; a form operation is cancelled by `cancel`, by the next commit, or
 * by a table reset. They shared one controller until it was measured that a field event then
 * cancelled a save: see {@link resetFormController}.
 */
// `| undefined` explicitly: under `exactOptionalPropertyTypes` a bare `form?:` could not be
// cleared by assignment, and clearing both is what `cancel` and `resetTableInstanceData` do.
export type CreatingAbortBox = {
	/** `commit`, `commitCell` and `validate` — whatever owns the form as a whole. */
	form?: AbortController | undefined
	/** `validateField` and the debounced change validation — one field, one blur, one keystroke. */
	field?: AbortController | undefined
}

declare module '@tanstack/table-core' {
	// Declaration merging needs interfaces; these are the shapes upstream declares as such.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Plugins {
		creatingFeature: TableFeature
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_FeatureMap {
		creatingFeature: { creating: CreatingState }
	}

	// `TableState_FeatureMap` feeds `TableState<TFeatures>` only; `TableState_All` is what feature
	// internals — and `SliceKey` in `../../feature-state` — read through. A feature that augments
	// only the first cannot name its own slice at `readOwnSlice(table, 'creating')`.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_All {
		creating?: CreatingState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		creatingFeature: { creating?: CreatingConfig<TData> }
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		creatingFeature: {
			/** The whole create flow — open, mutate, validate, commit, cancel. */
			creating: CreatingApi<TData>
			/** Internal. The in-flight validate / save controller. See {@link CreatingAbortBox}. */
			_creatingAbort: CreatingAbortBox
		}
	}
}

/**
 * The closed, empty form — what `getInitialState` seeds and what `cancel` and a successful
 * `commit` write back.
 *
 * **Frozen, and frozen at both levels.** Those writes are `{ ...INITIAL_STATE }`, a shallow copy,
 * so the `values` and `errors` the slice ends up holding are *this object's* — by reference, where
 * v8 wrote a fresh `{}` at each site. Nothing mutates them today, so this closes a latent aliasing
 * hazard rather than a live bug; it is worth closing because this constant is the shape the
 * remaining feature ports copy from. A shallow `Object.freeze` would not have done it: the hazard
 * is the nested objects, not the outer one, so both are frozen and the seed is a true constant.
 */
const INITIAL_STATE: CreatingState = Object.freeze({
	isOpen: false,
	values: Object.freeze({}),
	errors: Object.freeze({}),
	formError: null,
	commitStatus: CommitStatus.Idle,
})

/**
 * The column shape this feature reads.
 *
 * Structural for the reason `EditingColumn` in `../editing/editing.ts` spells out: a `Column`'s
 * members are resolved from the table's feature set, which a feature cannot see its own table's.
 * The second reason that used to be given here — that `ColumnMeta` was still at v8 arity in
 * `../../column/resolve-form-config` — is gone: that file names `ColumnMeta<TableFeatures, object>`
 * now, as {@link FormColumnMeta}, which is what `resolveColumnForm` below casts to.
 */
type CreatingColumnMeta = {
	creating?: false | { defaultValue?: unknown } | undefined
	isSystemColumn?: boolean | undefined
}

type CreatingColumn = { id: string; columnDef: { meta?: CreatingColumnMeta | undefined } }

/**
 * A table, as this feature's free functions see it.
 *
 * Every helper below takes it as its first argument rather than closing over one — the shape
 * `editing` established, and what lets `initTableInstanceData` hand the table in rather than have
 * the API object capture it from a `createTable` closure that no longer exists in v9.
 */
type CreatingTable = AnyTable & {
	getAllColumns: () => CreatingColumn[]
}

/**
 * The feature's own option, read off a table whose `TFeatures` is unresolved.
 *
 * `table.options` is `TableOptions<TFeatures, TData>`, assembled from `TableOptions_FeatureMap`
 * by feature key, so a key this feature merged in is not provable inside the feature itself.
 * Upstream's custom-feature skill reads its own option the same way. This survived the removal of
 * the v8 `declare module` blocks unchanged, as it was expected to: it is a property of feature
 * code, not of the shadowing those blocks did.
 */
const creatingOption = (table: { readonly options: object }): CreatingConfig<RowData> | undefined =>
	(table.options as { creating?: CreatingConfig<RowData> }).creating

/**
 * The table's abort box, read off a table whose `TFeatures` is unresolved.
 *
 * Same reason as {@link creatingOption}: `Table_FeatureMap` contributes `_creatingAbort` only when
 * `creatingFeature` is provably in `TFeatures`, which it is not from inside the feature. The
 * **write** side needs no cast — `assignTableInstanceData` checks the member names against the
 * declaration above.
 */
const abortBox = (table: AnyTable): CreatingAbortBox =>
	(table as unknown as { _creatingAbort: CreatingAbortBox })._creatingAbort

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

/** The current slice. `creating` is this feature's own, so the read is not optional. */
function readCreating(table: AnyTable): CreatingState {
	return readOwnSlice(table, 'creating')
}

/**
 * Merge a patch into the slice.
 *
 * `writeOwnSlice`, not `table.setState`: the write now touches one slice instead of rebuilding
 * the whole `TableState`, so a subscriber to another slice is no longer woken by a keystroke in a
 * form field. Every write this feature makes is to `creating` alone — no operation writes two
 * slices, so nothing here needs `batch`.
 */
function writeCreating(table: AnyTable, patch: Partial<CreatingState>): void {
	writeOwnSlice(table, 'creating', (prev) => ({ ...prev, ...patch }))
}

function columnMeta(table: CreatingTable, columnId: string): CreatingColumnMeta | undefined {
	return table.getAllColumns().find((c) => c.id === columnId)?.columnDef.meta
}

/**
 * The column's create-form settings, falling back **per field** to its edit-form ones —
 * the same rule the React layer applies to `component` and `description`, through the
 * same helper, so a column that states how one form should behave does not have to
 * restate it for the other.
 */
function resolveColumnForm(table: CreatingTable, columnId: string): ResolvedColumnFormConfig | undefined {
	// `columnMeta` reads a meta off a table this function is not generic over, and `ColumnMeta`
	// is invariant in both its `TFeatures` and its `TData` (`in out` on each), so no instantiation
	// it could return is assignable to any other. The cast is to the one name the helper declares
	// for that, and it is the same cast the React layer makes at its own call site.
	const meta = columnMeta(table, columnId) as FormColumnMeta | undefined
	const resolved = resolveColumnFormConfig(meta, ColumnFormMode.Creating)
	return resolved === false ? undefined : resolved
}

function resolveValidateOn(table: CreatingTable, columnId: string): ValidateOn {
	const fromColumn = resolveColumnForm(table, columnId)?.validateOn
	if (fromColumn) return fromColumn
	return creatingOption(table)?.validateOn ?? DEFAULT_VALIDATE_ON
}

function resolveDebounceMs(table: CreatingTable, columnId: string): number {
	const fromColumn = resolveColumnForm(table, columnId)?.debounce
	if (fromColumn !== undefined) return fromColumn
	return creatingOption(table)?.debounce ?? DEFAULT_VALIDATE_DEBOUNCE_MS
}

async function runValidate(
	table: CreatingTable,
	values: Record<string, unknown>,
	ctx: ValidateContext,
): Promise<ValidationResult> {
	const config = creatingOption(table)
	if (!config?.validate) return null
	if (typeof config.validate === 'function') {
		return await config.validate(values, ctx)
	}
	return zodSafeParseToResult(config.validate.schema, values)
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
function resetFieldController(table: CreatingTable): AbortController | undefined {
	if (readCreating(table).commitStatus !== CommitStatus.Idle) return undefined

	const box = abortBox(table)
	box.field?.abort()
	const c = new AbortController()
	box.field = c
	return c
}

/** Tear both down — a new form opens, the user cancels, or the table resets. */
function abortAll(table: AnyTable): void {
	const box = abortBox(table)
	box.form?.abort()
	box.field?.abort()
	box.form = undefined
	box.field = undefined
}

async function validateAndApplyField(table: CreatingTable, columnId: string, signal: AbortSignal): Promise<void> {
	if (signal.aborted) return
	const config = creatingOption(table)
	if (!config?.validate) return

	const values = readCreating(table).values
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

	writeOwnSlice(table, 'creating', (prev) => {
		// Drop previous error for this column, then re-apply if present in result.
		const { [columnId]: _removed, ...rest } = prev.errors
		const fieldErrs = result?.errors?.[columnId]
		const nextErrors = fieldErrs && fieldErrs.length > 0 ? { ...rest, [columnId]: fieldErrs } : rest
		return { ...prev, errors: nextErrors }
	})
}

function scheduleChangeValidation(table: CreatingTable, columnId: string): void {
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
 * Builds the seed for `state.creating.values`: column-level `creating.defaultValue`
 * first (in final column order, system columns skipped), then the table-level
 * `creating.defaultValues` shallow-merged over them so the table level wins per key.
 *
 * Runs on every start() — the resolved values are a snapshot of the table as it is
 * when the form opens, not of how it was constructed.
 */
function resolveDefaultValues(table: CreatingTable): Record<string, unknown> {
	// The two context types name `Table`, which this feature can no longer name at v9 arity from
	// inside a hook; the table is restated as the context's own field type at the one point it is
	// handed to a consumer's callback, so the public shape stays the thing being satisfied.
	const asContextTable = table as unknown as CreateDefaultValueContext<RowData>['table']

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
						table: asContextTable,
						columnId: col.id,
					})
				: defaultValue
	}

	const fromTable = creatingOption(table)?.defaultValues
	if (fromTable === undefined) return fromColumns
	// CreatingConfig is instantiated with RowData (= any) inside the feature, so the
	// resolved patch widens to `any` here — narrow it back before merging.
	const resolved = (typeof fromTable === 'function' ? fromTable({ table: asContextTable }) : fromTable) as Record<
		string,
		unknown
	>
	return { ...fromColumns, ...resolved }
}

/** The one table member this feature installs — a namespace object, not a method. */
function createCreatingApi(table: CreatingTable): CreatingApi<RowData> {
	return {
		start: () => {
			abortAll(table)
			writeCreating(table, {
				isOpen: true,
				values: resolveDefaultValues(table),
				errors: {},
				formError: null,
				commitStatus: CommitStatus.Idle,
			})
		},

		cancel: () => {
			abortAll(table)
			// Values reset to empty, not to the defaults: the form is closed at this point
			// and the next start() re-applies them.
			writeCreating(table, { ...INITIAL_STATE })
		},

		commit: async () => {
			const config = creatingOption(table)
			if (!config) return
			if (readCreating(table).commitStatus !== CommitStatus.Idle) return // UI invariant — second click is no-op

			const c = resetFormController(table)

			writeCreating(table, {
				errors: {},
				formError: null,
				commitStatus: CommitStatus.Validating,
			})

			const values = readCreating(table).values

			// ── validate phase ───────────────────────────────────────────
			if (config.validate) {
				let result: ValidationResult
				try {
					result = await runValidate(table, values, { signal: c.signal })
				} catch (e) {
					if (c.signal.aborted) return
					writeCreating(table, { commitStatus: CommitStatus.Idle })
					throw e
				}
				if (c.signal.aborted) return
				if (result !== null) {
					writeCreating(table, {
						errors: result.errors ?? {},
						formError: result.formError ?? null,
						commitStatus: CommitStatus.Idle,
					})
					return
				}
			}

			// ── save phase ───────────────────────────────────────────────
			writeCreating(table, { commitStatus: CommitStatus.Saving })
			try {
				await config.onSave({ values, signal: c.signal })
				if (c.signal.aborted) return
				// Reset to closed/empty state on success
				writeCreating(table, { ...INITIAL_STATE })
			} catch (e) {
				if (c.signal.aborted) return
				if (isValidationError(e)) {
					writeCreating(table, {
						errors: e.errors,
						formError: e.formError ?? null,
						commitStatus: CommitStatus.Idle,
					})
					return
				}
				writeCreating(table, {
					formError: GENERIC_FORM_ERROR,
					commitStatus: CommitStatus.Idle,
				})
				throw e
			}
		},

		setValue: (key, value) => {
			writeOwnSlice(table, 'creating', (prev) => {
				const { [key]: _removed, ...remainingErrors } = prev.errors
				return {
					...prev,
					values: { ...prev.values, [key]: value },
					errors: remainingErrors,
					// formError intentionally untouched
				}
			})
			if (resolveValidateOn(table, key) === ValidateOn.Change && creatingOption(table)?.validate) {
				scheduleChangeValidation(table, key)
			}
		},

		setValues: (patch) => {
			writeOwnSlice(table, 'creating', (prev) => ({
				...prev,
				values: { ...prev.values, ...(patch as Record<string, unknown>) },
			}))
		},

		setErrors: (errors) => {
			writeCreating(table, { errors: errors ?? {} })
		},

		setFormError: (msg) => {
			writeCreating(table, { formError: msg })
		},

		validate: async () => {
			const config = creatingOption(table)
			if (!config?.validate) return null
			const c = resetFormController(table)
			const values = readCreating(table).values
			writeCreating(table, { commitStatus: CommitStatus.Validating })
			let result: ValidationResult
			try {
				result = await runValidate(table, values, { signal: c.signal })
			} catch (e) {
				if (c.signal.aborted) return null
				writeCreating(table, { commitStatus: CommitStatus.Idle })
				throw e
			}
			if (c.signal.aborted) return null
			writeCreating(table, {
				errors: result?.errors ?? {},
				formError: result?.formError ?? null,
				commitStatus: CommitStatus.Idle,
			})
			return result
		},

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

		getState: () => readCreating(table),
	}
}

/**
 * The create form, as a v9 table feature.
 *
 * Owns the `creating` slice — transient per-open-form state, never seeded from `initialState` —
 * and installs one namespace object, `table.creating`.
 *
 * `creating` goes in through `initTableInstanceData` rather than `constructTableAPIs`: it is a
 * namespace **object**, and `assignTableAPIs` installs one function per key, so it cannot express
 * `table.creating.commit`. `_creatingAbort` belongs there for the other reason the hook exists —
 * it is mutable per-table data.
 *
 * Unlike `editing`, this feature installs nothing on the row prototype: nothing about a create
 * form is per-row, so there is no `assignRowPrototype` here.
 */
export const creatingFeature: TableFeature = {
	// `creating` last, not `initialState` last as most features spread it: this slice is transient
	// per-open-form state and is hard-reset at construction, the same rule `editing` follows.
	getInitialState: (initialState) => ({
		...initialState,
		creating: { ...INITIAL_STATE },
	}),

	initTableInstanceData: (table) => {
		// Not a hand-written cast: `assignTableInstanceData` checks both member names against the
		// `Table_FeatureMap` entry above, so a misspelled one cannot install silently.
		assignTableInstanceData('creatingFeature', table, {
			creating: createCreatingApi(table),
			_creatingAbort: {},
		})
	},

	// Runs after `table.reset()` has restored internally owned atoms, so this does **only** the
	// part state restoration cannot: tearing down the in-flight controller, so a late `onSave`
	// resolution writes nothing. Closing the open form is already done by then — `table_reset`
	// writes every key of `table.initialState` back through `baseAtoms` in one batch, and this
	// feature's `getInitialState` put `creating: INITIAL_STATE` in that snapshot. Do not clear the
	// slice here as well: it would write an atom the reset pass already wrote, outside its batch.
	//
	// Behaviour v8 did not have — the controller lived in a closure with no reset hook to reach it.
	resetTableInstanceData: (table) => {
		abortAll(table)
	},
}
