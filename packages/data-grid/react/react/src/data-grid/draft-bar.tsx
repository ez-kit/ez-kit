import { useGridComponents } from '../components-context'

import { resolveActionBarVariant } from './action-bar-variant'
import { useDataGridState, useDataGridTable } from './table-context'

import type { ActionBarVariant } from '../types'
import type { PendingCount } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

/** What a `<DataGrid.DraftBar>` render function receives. */
export type DataGridDraftBarRenderArgs = {
	/** How many sorts / column filters / searches are pending, per axis. */
	pending: PendingCount
	/** Rows selected right now — cleared by `onApply`, since a new query can drop them. */
	selectedCount: number
	/** The resolved action-bar variant, shared with the selection bar. */
	variant: ActionBarVariant
	/** Commits the whole draft — one state change, one request. */
	onApply: () => void
	/** Throws the draft away and restores the applied query. */
	onReset: () => void
}

export type DataGridDraftBarProps = {
	/**
	 * Custom draft bar, replacing the kit's `DraftBar` component.
	 *
	 * Nothing is rendered — `children` included — while `draft` is off or the draft is clean,
	 * so a custom bar never appears with nothing to apply.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.DraftBar>
	 *   {({ pending, onApply, onReset }) => (
	 *     <div>
	 *       <span>{pending.total} pending</span>
	 *       <button onClick={onApply}>Apply</button>
	 *       <button onClick={onReset}>Reset</button>
	 *     </div>
	 *   )}
	 * </DataGrid.DraftBar>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridDraftBarRenderArgs) => ReactNode)
}

/**
 * Pending-draft section of the shared action bar.
 *
 * While a draft is pending it owns the bar outright: the selection section
 * collapses to a non-interactive count chip. That is not a layout preference —
 * applying a query can drop the selected rows from the result set, so bulk
 * actions over that selection would act on a stale set.
 *
 * Renders only under `draft`, and only while `table.draft` is dirty.
 */
export function DraftBar({ children }: DataGridDraftBarProps = {}) {
	// Broad subscription — the bar must re-render as the draft accumulates.
	const table = useDataGridTable()
	// Deliberately broad: `draft.isDirty()` spans sorting, column filters,
	// global search and `applied`, and the bar also reads `rowSelection`.
	useDataGridState((s) => s)
	const { DraftBar: DraftBarComponent } = useGridComponents().draft

	if (table.options.draft !== true) return null

	const open = table.draft.isDirty()
	if (!open) return null

	const args: DataGridDraftBarRenderArgs = {
		pending: table.draft.getPendingCount(),
		selectedCount: Object.keys(table.getState().rowSelection).length,
		variant: resolveActionBarVariant(table),
		onApply: () => {
			table.draft.apply()
		},
		onReset: () => {
			table.draft.reset()
		},
	}

	if (children !== undefined) {
		return typeof children === 'function' ? children(args) : children
	}

	return (
		<DraftBarComponent
			open={open}
			pending={args.pending}
			selectedCount={args.selectedCount}
			variant={args.variant}
			onApply={args.onApply}
			onReset={args.onReset}
		/>
	)
}
