import { featureConfig, isFeatureEnabled } from '../../utils/feature-flag'

import type { FeatureToggle } from '../../utils/feature-flag'
import type { InitialTableState, Row, RowData, Table, TableFeature, TableState } from '@tanstack/table-core'

export type ConfirmationConfig = {
	title?: string
	description?: string | ((row: Row<unknown>) => string)
}

/**
 * Confirmation copy for a bulk delete. Separate from {@link ConfirmationConfig} for one
 * reason: `description` is handed the whole selection, not a row. A prompt that cannot say
 * "Delete 3 orders?" is not a prompt for deleting three orders.
 */
export type BulkConfirmationConfig = {
	title?: string
	description?: string | ((rows: Row<unknown>[]) => string)
}

/**
 * Context passed to {@link DeletingConfig.onDelete}.
 *
 * @typeParam TData - row data type
 */
export type DeletingContext<TData> = {
	/** ID of the row being deleted (TanStack row.id). */
	rowId: string
	/** Full TanStack row instance — access `row.original`, `row.getValue()`, etc. */
	row: Row<TData>
	/** Aborted when the user cancels deletion via deleting.cancel() or the table unmounts. */
	signal: AbortSignal
}

/**
 * Context passed to {@link BulkDeletingConfig.onDelete}.
 *
 * @typeParam TData - row data type
 */
export type BulkDeletingContext<TData> = {
	/** IDs of every selected row, in selection order. */
	rowIds: string[]
	/** The selected rows themselves — `row.original`, `row.getValue()`, … */
	rows: Row<TData>[]
	/** Aborted when the user cancels the staged bulk delete, or the table unmounts. */
	signal: AbortSignal
}

/**
 * Deleting the selected rows at once.
 *
 * Lives here, under `deleting`, rather than on the selection bar that happens to render the
 * button: bulk delete is the delete feature operating on more than one row, and its handler and
 * its prompt belong next to the per-row ones. It used to sit on `selection.bar`, so a grid
 * that had configured `deleting` got no bulk affordance until it repeated the handler and the
 * confirmation copy under a presentational option.
 */
export type BulkDeletingConfig<TData> = FeatureToggle & {
	/**
	 * One call for the whole selection — the shape a server API for "delete these ids" wants.
	 *
	 * Omit it and the grid falls back to {@link DeletingConfig.onDelete}, once per selected row,
	 * which is what a client-side store needs and means `bulk: true` is the whole config for it.
	 *
	 * Either way the deleted ids leave `state.rowSelection` once the handler resolves — a bar
	 * counting rows that no longer exist is never what anyone wanted, and clearing it by hand
	 * from every handler was the previous shape's parting gift.
	 */
	onDelete?: (ctx: BulkDeletingContext<TData>) => void | Promise<void>
	/**
	 * Prompt before deleting. `true` uses count-aware default copy;
	 * {@link BulkConfirmationConfig} overrides it. Independent of
	 * {@link DeletingConfig.confirmation} — deleting twelve rows at once may deserve a prompt
	 * where deleting one does not.
	 */
	confirmation?: boolean | BulkConfirmationConfig
}

export type DeletingConfig<TData> = FeatureToggle & {
	/** Delete one row. Required — it is what makes the feature exist at all. */
	onDelete: (ctx: DeletingContext<TData>) => void | Promise<void>
	/** Prompt before deleting one row. `true` uses default copy. */
	confirmation?: boolean | ConfirmationConfig
	/**
	 * Delete the current selection in one gesture. `false` / omitted — no bulk affordance;
	 * `true` — enabled, looping {@link DeletingConfig.onDelete} over the selected rows;
	 * {@link BulkDeletingConfig} — a single handler for the whole set, its own prompt, or both.
	 *
	 * The selection bar renders the Delete button iff this resolves to on and row selection is
	 * enabled — there is nothing to bulk-delete without a selection.
	 */
	bulk?: boolean | BulkDeletingConfig<TData>
}

/**
 * The bulk half of {@link DeletingApi}, reached as `table.deleting.bulk`.
 *
 * Its own object rather than four `*Bulk*` methods beside the per-row four: the two halves take
 * different arguments and are gated by different options, and nesting keeps `request` / `confirm`
 * / `cancel` spelled the same on both.
 */
export type BulkDeletingApi = {
	/** Delete the given rows — the bulk handler, or `onDelete` per row when there is none. */
	delete: (rowIds: string[]) => Promise<void>
	/** Delete the current selection, staging a confirmation first when one is configured. */
	request: () => void
	/** Run the staged bulk delete. */
	confirm: () => Promise<void>
	/** Drop the staged bulk delete without running it. */
	cancel: () => void
}

/**
 * Everything deleting can be told to do, reached as `table.deleting`.
 *
 * A namespace, like `table.creating`, `table.editing` and `table.draft` — the three write
 * features now read the same way. It replaces eight flat methods on the table root
 * (`requestDeleteRow`, `confirmBulkDelete`, … — now gone), which spelled one concept in two vocabularies
 * and put eight names into the completion list for `table.`.
 */
export type DeletingApi = {
	/** Delete one row now, skipping any confirmation. */
	delete: (rowId: string) => Promise<void>
	/** Delete one row, staging a confirmation first when one is configured. */
	request: (rowId: string) => void
	/** Run the staged per-row delete. */
	confirm: () => Promise<void>
	/** Drop the staged per-row delete without running it. */
	cancel: () => void
	/** Deleting the current selection in one gesture. */
	bulk: BulkDeletingApi
}

declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableOptionsResolved<TData extends RowData> {
		deleting?: DeletingConfig<TData>
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState {
		pendingDeleteRowId: string | null
		/** True while a bulk (selection-bar) delete is staged awaiting confirmation. */
		pendingBulkDelete: boolean
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table<TData extends RowData> {
		deleting: DeletingApi
	}
}

export const DeletingFeature: TableFeature<RowData> = {
	getInitialState: (state?: InitialTableState) =>
		({
			...state,
			pendingDeleteRowId: null,
			pendingBulkDelete: false,
		}) as Partial<TableState>,

	createTable: (table: Table<RowData>) => {
		// Single AbortController per table instance.
		// Aborted on: a new delete, deleting.cancel.
		let controller: AbortController | undefined

		const resetController = (): AbortController => {
			controller?.abort()
			const c = new AbortController()
			controller = c
			return c
		}

		const deleteRow = async (rowId: string): Promise<void> => {
			const config = table.options.deleting
			if (!config) return
			const row = table.getRowModel().rows.find((r) => r.id === rowId)
			if (!row) return
			const c = resetController()
			await config.onDelete({ rowId, row, signal: c.signal })
		}

		/**
		 * Drop ids from the selection. Run after a bulk delete: leaving deleted rows selected
		 * means a selection bar counting rows that no longer exist, and every consumer clearing
		 * it by hand from its own handler.
		 */
		const deselect = (rowIds: string[]): void => {
			if (rowIds.length === 0) return
			const removed = new Set(rowIds)
			table.setState((state) => ({
				...state,
				rowSelection: Object.fromEntries(Object.entries(state.rowSelection).filter(([id]) => !removed.has(id))),
			}))
		}

		const deleteRows = async (rowIds: string[]): Promise<void> => {
			const config = table.options.deleting
			if (!config) return
			const bulk = featureConfig(config.bulk)
			const rows = rowIds
				.map((id) => table.getRowModel().rows.find((r) => r.id === id))
				.filter((r): r is Row<RowData> => r !== undefined)
			if (rows.length === 0) return
			const c = resetController()
			const ids = rows.map((r) => r.id)
			if (bulk?.onDelete) {
				await bulk.onDelete({ rowIds: ids, rows, signal: c.signal })
				deselect(ids)
				return
			}
			// No single-call handler: the per-row one, once per row. Sequential rather than
			// `Promise.all` so a store that mutates an array per call sees each write land, and
			// so a failure stops the run instead of leaving a partial set half-applied.
			for (const row of rows) {
				await config.onDelete({ rowId: row.id, row, signal: c.signal })
			}
			deselect(ids)
		}

		/** Ids of the currently selected rows, in the order TanStack holds them. */
		const selectedRowIds = (): string[] =>
			Object.entries(table.getState().rowSelection)
				.filter(([, isSelected]) => isSelected)
				.map(([id]) => id)

		table.deleting = {
			delete: deleteRow,

			request: (rowId) => {
				const config = table.options.deleting
				if (!config) return
				if (config.confirmation) {
					table.setState((state) => ({ ...state, pendingDeleteRowId: rowId }))
				} else {
					void deleteRow(rowId)
				}
			},

			confirm: async () => {
				const pendingId = table.getState().pendingDeleteRowId
				if (!pendingId) return
				table.setState((state) => ({ ...state, pendingDeleteRowId: null }))
				await deleteRow(pendingId)
			},

			cancel: () => {
				controller?.abort()
				controller = undefined
				table.setState((state) => ({ ...state, pendingDeleteRowId: null }))
			},

			bulk: {
				delete: deleteRows,

				request: () => {
					const config = table.options.deleting
					if (!config || !isFeatureEnabled(config.bulk)) return
					if (featureConfig(config.bulk)?.confirmation) {
						table.setState((state) => ({ ...state, pendingBulkDelete: true }))
						return
					}
					void deleteRows(selectedRowIds())
				},

				confirm: async () => {
					if (!table.getState().pendingBulkDelete) return
					const ids = selectedRowIds()
					table.setState((state) => ({ ...state, pendingBulkDelete: false }))
					await deleteRows(ids)
				},

				cancel: () => {
					controller?.abort()
					controller = undefined
					table.setState((state) => ({ ...state, pendingBulkDelete: false }))
				},
			},
		}
	},
}
