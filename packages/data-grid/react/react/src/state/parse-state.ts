import { DEFAULT_STATE_KEYS } from './state-keys'

import type { DataGridState, DataGridStateOptions, PersistableStateKey } from './state-keys'

/** Expected top-level JS shape of each persistable slice, for lightweight validation. */
const SLICE_KIND: Record<PersistableStateKey, 'array' | 'object' | 'expanded' | 'any'> = {
	sorting: 'array',
	columnFilters: 'array',
	globalFilter: 'any',
	pagination: 'object',
	rowSelection: 'object',
	columnVisibility: 'object',
	columnPinning: 'object',
	rowPinning: 'object',
	expanded: 'expanded',
	columnSizing: 'object',
	draft: 'object',
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Structural guard — checks only the top-level kind, not deep contents. */
function isValidSlice(key: PersistableStateKey, value: unknown): boolean {
	switch (SLICE_KIND[key]) {
		case 'array':
			return Array.isArray(value)
		case 'object':
			return isPlainObject(value)
		case 'expanded':
			return value === true || isPlainObject(value)
		case 'any':
			return true
	}
}

/**
 * Assign a validated slice into the accumulator. `value` was structurally validated by
 * {@link isValidSlice}.
 */
function assignSlice(out: DataGridState, key: PersistableStateKey, value: unknown): void {
	// One cast, at the single validated write: `DataGridState` is a `Partial<Pick<TableState,…>>`
	// intersected with the seed-only `draft`, so its keys no longer share one value type.
	;(out as Record<string, unknown>)[key] = value
}

/**
 * Validate + prune an UNTRUSTED, already-decoded value into a typed {@link DataGridState}.
 * The consumer owns JSON.parse / URL-decode; this does NOT parse strings. Never throws —
 * non-object input yields `{}`, keys outside the allowlist are dropped, and slices with the
 * wrong top-level type are dropped. URL and localStorage are user-editable, so this is the
 * single validation choke point.
 */
export function parseState(stored: unknown, options?: DataGridStateOptions): DataGridState {
	if (!isPlainObject(stored)) return {}
	const keys = options?.keys ?? DEFAULT_STATE_KEYS
	const out: DataGridState = {}
	for (const key of keys) {
		const value = stored[key]
		if (value !== undefined && isValidSlice(key, value)) {
			assignSlice(out, key, value)
		}
	}
	return out
}
