import type { ColumnCreatingConfig, ColumnEditingConfig } from './types'
import type { ColumnMeta } from '@tanstack/table-core'

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
export function resolveColumnFormConfig(
	meta: ColumnMeta<unknown, unknown> | undefined,
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
