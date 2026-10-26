import { ReorderMode } from '@ez-kit/data-grid-core'

/** Which move affordances one reorderable surface offers, once the adapter question is settled. */
export type ReorderAffordances = {
	/** The surface's entries register with the drag adapter and carry a grip. */
	drag: boolean
	/** The surface's entries carry the one-step move pair. */
	moveControls: boolean
}

/** A surface's option as the author wrote it — `undefined` takes the surface's own default. */
export type AuthoredReorderMode = boolean | ReorderMode | undefined

const NONE: ReorderAffordances = { drag: false, moveControls: false }

/**
 * Resolve one surface's {@link ReorderMode} into the pair of affordances it renders.
 *
 * **One function for the four surfaces** — the header, the column panel, the sort builder and a
 * row — so that they cannot drift apart on what a value means. Only the default differs between them,
 * which is why it is an argument: `true` for the header, `false` for the panel, whether
 * multi-sort is on for the builder, and `'both'` for a row.
 *
 * `hasAdapter` is `useDndEnabled()`, which is why this is a plain function the components call
 * rather than a member of the resolved options: a controlled grid builds those outside
 * `<DataGrid>`, where that context does not reach. `resolved-options.ts` has the account. The row
 * is the exception: `useDataGrid` resolves it, against the adapter it already reads to decide the
 * `__drag__` column, so that the column and the menu pair answer from the same fact.
 *
 * A grip needs an adapter, and nothing written in the config conjures one: without it, `'drag'`
 * and `'both'` resolve to the step pair alone — a grip with no mechanics behind it would promise
 * something the grid cannot do. `useReorderModeWarning` says so in development.
 */
export function resolveReorderMode(
	mode: AuthoredReorderMode,
	fallback: boolean | ReorderMode,
	hasAdapter: boolean,
): ReorderAffordances {
	const value = mode ?? fallback

	if (value === false) return NONE
	if (value === ReorderMode.Step) return { drag: false, moveControls: true }
	if (value === ReorderMode.Both) return { drag: hasAdapter, moveControls: true }

	// `true` and `'drag'`: the grip when the grid can drag, the step pair when it cannot.
	return { drag: hasAdapter, moveControls: !hasAdapter }
}

/** Whether a surface asked for a grip by name — the condition the missing-adapter warning reads. */
export function wantsDrag(mode: AuthoredReorderMode): boolean {
	return mode === ReorderMode.Drag || mode === ReorderMode.Both
}
