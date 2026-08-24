import { useGridComponents } from '../components-context'

import { resolveSelectionPanelVariant } from './selection-panel-variant'
import { useTable } from './table-context'

/**
 * Pending-draft section of the shared action bar.
 *
 * While a draft is pending it owns the bar outright: the selection section
 * collapses to a non-interactive count chip. That is not a layout preference —
 * applying a query can drop the selected rows from the result set, so bulk
 * actions over that selection would act on a stale set.
 *
 * Renders only under `deferredApply`, and only while `table.draft` is dirty.
 */
export function DraftBar() {
	// Broad subscription — the bar must re-render as the draft accumulates.
	const table = useTable()
	const { DraftBar: DraftBarComponent } = useGridComponents().draft

	if (table.options.deferredApply !== true) return null

	const open = table.draft.isDirty()
	if (!open) return null

	return (
		<DraftBarComponent
			open={open}
			pending={table.draft.getPendingCount()}
			selectedCount={Object.keys(table.getState().rowSelection).length}
			variant={resolveSelectionPanelVariant(table)}
			onApply={() => {
				table.draft.apply()
			}}
			onReset={() => {
				table.draft.reset()
			}}
		/>
	)
}
