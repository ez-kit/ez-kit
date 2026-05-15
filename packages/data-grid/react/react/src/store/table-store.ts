import type { DataTable, TableState } from '@ez-kit/data-grid-core'

/**
 * `useSyncExternalStore`-compatible view over a {@link DataTable}.
 *
 * The core `DataTable` already exposes `subscribe(listener)` and
 * `getSnapshot(): TableState`. This wrapper adds a deterministic
 * `getServerSnapshot()` (so SSR rendering is stable) and a single named
 * surface for the React adapter to consume.
 */
export type TableStore = {
	/** Subscribe to all table state changes. Returns an unsubscribe function. */
	subscribe: (listener: () => void) => () => void
	/** Returns a referentially stable snapshot of the current table state. */
	getSnapshot: () => TableState
	/** Returns a deterministic snapshot for server rendering. Always the initial state. */
	getServerSnapshot: () => TableState
}

/**
 * Build a {@link TableStore} from a {@link DataTable}. The store reuses the
 * table's own `subscribe`/`getSnapshot` (no extra listener layer) and freezes
 * the initial snapshot for SSR.
 */
export function createTableStore<TRow extends object>(table: DataTable<TRow>): TableStore {
	const initialSnapshot = table.getSnapshot()
	return {
		subscribe: table.subscribe,
		getSnapshot: table.getSnapshot,
		getServerSnapshot: () => initialSnapshot,
	}
}
