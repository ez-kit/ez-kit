import type { ColumnCreatingConfig, ColumnEditingConfig } from './types'
import type { ColumnMeta, TableFeatures } from '@tanstack/table-core'

/**
 * Which of the two write forms a column's field is being resolved for.
 *
 * The members are the feature names, so the value reads the same as the config key it selects
 * (`meta.creating` / `meta.editing`).
 */
export const ColumnFormMode = {
	Creating: 'creating',
	Editing: 'editing',
} as const

export type ColumnFormMode = (typeof ColumnFormMode)[keyof typeof ColumnFormMode]

/**
 * The per-field settings a column contributes to one write form — `component`, `description`,
 * `validateOn`, `debounce`.
 */
export type ResolvedColumnFormConfig = ColumnCreatingConfig & ColumnEditingConfig

/**
 * Resolves a column's form config for one mode, applying the documented
 * **creating-falls-back-to-editing** rule.
 *
 * The fallback is per **field**, not per object: `creating: { description }` beside
 * `editing: { component, validateOn }` yields the creating description and the editing
 * component and `validateOn`, which is what "falls back to `editing.component` when omitted"
 * says. Falling back per object — returning the whole `creating` the moment it exists — was
 * the previous behaviour for `validateOn` / `debounce`, and no behaviour at all for
 * `component` and `description`: the create form read `meta.creating` alone, so a column that
 * declared only `editing.component` rendered its custom input while editing and the generic
 * fallback input while creating, contradicting the option's own documentation in three places.
 *
 * Returns `false` when the column opts out of this form entirely, and `undefined` when it
 * configures nothing.
 */
/**
 * The meta shape this helper reads, at the widest instantiation v9 allows.
 *
 * `ColumnMeta` is declared `in out` on both `TFeatures` and `TData`, so it is **invariant** in
 * each: no concrete `ColumnMeta<TFeatures, TRow>` is assignable to any other instantiation, and
 * there is no signature here that a caller holding a real column's meta could satisfy without a
 * cast. Naming the widest one and letting callers cast to it is therefore the honest shape, and
 * it costs nothing — the two fields read below (`editing`, `creating`) are ours, declared by this
 * package's own merge, and neither varies with the feature set or the row type.
 */
export type FormColumnMeta = ColumnMeta<TableFeatures, object>

export function resolveColumnFormConfig(
	meta: FormColumnMeta | undefined,
	mode: ColumnFormMode,
): false | ResolvedColumnFormConfig | undefined {
	const editing = meta?.editing
	if (mode === ColumnFormMode.Editing) return editing

	const creating = meta?.creating
	if (creating === false) return false
	// `editing: false` says "this column is not editable", not "leave it out of the create
	// form" — a create-only field (an initial password, a one-time import key) is exactly a
	// column you fill in once and never edit. So it contributes no fallback, and nothing else.
	const editingFallback = editing === false ? undefined : (editing as ColumnEditingConfig | undefined)
	if (creating === undefined && editingFallback === undefined) return undefined

	return { ...editingFallback, ...(creating as ColumnCreatingConfig | undefined) }
}
