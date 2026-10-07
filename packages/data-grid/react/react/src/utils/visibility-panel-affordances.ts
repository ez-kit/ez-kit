import type { ResolvedGridOptions } from '../resolved-options'

/** Which move affordances one column panel offers, once the adapter question is settled. */
export type PanelAffordances = {
	/** Panel rows register with the drag adapter and carry a grip. */
	drag: boolean
	/** Panel rows carry the one-step move pair. */
	moveControls: boolean
}

/**
 * Resolve the column panel's two affordances — the half of `ordering.column.visibilityMenu` that
 * `useDataGrid` deliberately left open.
 *
 * **Two readers, one function, for the reason `getVisibilityPanelColumns` is also one function:**
 * `<DataGrid.VisibilityTrigger>` decides the move pair from it and `<DataGrid.VisibilityItem>`
 * decides the drag, and a disagreement between them is a panel offering nothing or offering both.
 * The defaults are the interesting part and they are mutual — `moveControls` falls back to the
 * inverse of the *resolved* drag, not of the authored one — so the two cannot be worked out
 * separately at the two call sites.
 *
 * `hasAdapter` is `useDndEnabled()`, which is why this is a plain function both components call
 * rather than a member of the resolved options: a controlled grid builds those outside
 * `<DataGrid>`, where that context does not reach. `resolved-options.ts` has the account.
 *
 * An authored `drag: true` with no adapter resolves **off**: a grip with no mechanics behind it is
 * an affordance promising something the grid cannot do, which is the condition
 * {@link useDndEnabled} exists to gate. The panel then takes the arrows, and the trigger warns.
 */
export function resolvePanelAffordances(
	visibilityMenu: ResolvedGridOptions['ordering']['visibilityMenu'],
	hasAdapter: boolean,
): PanelAffordances {
	if (!visibilityMenu.enabled) return { drag: false, moveControls: false }

	const drag = (visibilityMenu.drag ?? hasAdapter) && hasAdapter

	return { drag, moveControls: visibilityMenu.moveControls ?? !drag }
}
