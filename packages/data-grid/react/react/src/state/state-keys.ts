import type { TableState } from '@ez-kit/data-grid-core'

/**
 * Top-level TableState keys this feature can persist. Closed set — modeled as a
 * const tuple + derived union so the same keys are referenced everywhere, never
 * re-spelled as bare string literals.
 */
export const PERSISTABLE_STATE_KEYS = [
	'sorting',
	'columnFilters',
	'globalFilter',
	'pagination',
	'rowSelection',
	'columnVisibility',
	'columnPinning',
	'rowPinning',
	'expanded',
	'columnSizing',
] as const satisfies readonly (keyof TableState)[]

export type PersistableStateKey = (typeof PERSISTABLE_STATE_KEYS)[number]

/**
 * Opinionated default: shareable "view" state only. Excludes `rowSelection` and
 * `expanded` — both key off row ids that may not survive a data reload and are
 * usually session-ephemeral rather than shareable. Opt into them via `keys`.
 */
export const DEFAULT_STATE_KEYS = [
	'sorting',
	'columnFilters',
	'globalFilter',
	'pagination',
	'columnVisibility',
	'columnPinning',
	'rowPinning',
	'columnSizing',
] as const satisfies readonly PersistableStateKey[]

/** JSON-safe subset of TableState produced by {@link extractState} and {@link parseState}. */
export type DataGridState = Partial<Pick<TableState, PersistableStateKey>>

export type DataGridStateOptions = {
	/** Allowlist of slices to include. Default: {@link DEFAULT_STATE_KEYS}. */
	keys?: readonly PersistableStateKey[]
}
