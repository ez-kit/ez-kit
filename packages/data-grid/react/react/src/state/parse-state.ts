import { DEFAULT_STATE_KEYS } from './state-keys'

import type { DataGridState, DataGridStateOptions, PersistableStateKey } from './state-keys'
import type { TableState } from '@ez-kit/data-grid-core'

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
 * Assign a validated slice into the accumulator. Generic over a single key `K` so the
 * write type-checks. `value` was structurally validated by {@link isValidSlice}; the input
 * is untrusted, so casting to the slice type here is the deliberate boundary conversion.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function assignSlice<K extends PersistableStateKey>(out: DataGridState, key: K, value: unknown): void {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	out[key] = value as TableState[K]
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
