import { useGridComponents } from '../components-context'
import { GridMenuIcon, GridMenuVariant } from '../menu'

import { useDataGridState, useDataGridTable } from './table-context'
import { columnNameOf } from './visually-hidden'

import type { GridMenuSection } from '../menu'

/** Ids for the entries of a chip's menu. Unique within that menu, nothing more. */
const GroupLevelActionId = {
	MoveOuter: 'move-outer',
	MoveInner: 'move-inner',
	Remove: 'remove',
} as const

const LEVEL_SECTION = 'group-level'

/**
 * Compound member: one chip per active grouping level, outermost first.
 *
 * Mounted by composition, never by an option —
 * `<DataGrid.Toolbar start={<DataGrid.GroupByBar />} />`. Renders `null` when nothing is
 * grouped, so a layout can mount it unconditionally and a grid that never groups pays a
 * subscription and no DOM.
 *
 * **Each chip's controls are a `core.Menu`, not three bare buttons, and that is a constraint
 * rather than a preference.** This package authors no class and no glyph, and `core.Button`
 * takes only `children` — so inline Remove / Move controls would have nothing to draw and both
 * kits would have to invent a CSS-glyph contract for them. The menu reuses the icon vocabulary
 * the kits already map (`GridMenuIcon.MoveUp` / `.MoveDown` / `.Ungroup`) and gets the
 * disabled-at-the-ends convention for free, the same one column reordering uses. The cost is
 * that removing a level is two clicks rather than one; `AGENTS.md` names `core.Menu` as where
 * a group-by control belongs, so this is that rule applied rather than an improvisation.
 *
 * **There is deliberately no "add a level" picker here.** The column menu's
 * {@link ColumnActionId.GroupBy} already adds one, and a second affordance for it would need a
 * menu variant of its own while duplicating what the header already offers. Adding one later is
 * additive.
 */
export function GroupByBar() {
	const table = useDataGridTable()
	const { Menu } = useGridComponents().core
	const messages = table.grid.messages.groupBar
	/*
	 * Read as its own slice, never stitched together with another.
	 *
	 * A selector returning a fresh object every call is the documented infinite-loop case — the
	 * store compares by reference, so an object literal never compares equal and the component
	 * re-renders forever. `s.grouping` is the array the table already holds, so this is stable
	 * between changes.
	 *
	 * Optional-chained: the slice exists only with `columnGroupingFeature` registered, and a
	 * layout may mount this bar on a grid that never groups. See `feature-optionality.test.tsx`.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const grouping = useDataGridState((s) => s.grouping) ?? EMPTY_GROUPING

	if (grouping.length === 0) return null

	/** `grouping` with the level at `from` moved to `to`. Pure — the slice is never mutated. */
	const reordered = (from: number, to: number): string[] => {
		const next = [...grouping]
		const [moved] = next.splice(from, 1)
		if (moved !== undefined) next.splice(to, 0, moved)

		return next
	}

	return (
		<div
			data-slot='group-by-bar'
			role='group'
			aria-label={messages.label}
		>
			<span data-slot='group-by-bar-label'>{messages.label}</span>
			{grouping.map((columnId, index) => {
				const column = table.getColumn(columnId)
				const label = columnNameOf(column?.columnDef.header, columnId)
				const sections: GridMenuSection[] = [
					{
						id: LEVEL_SECTION,
						items: [
							{
								id: GroupLevelActionId.MoveOuter,
								label: messages.moveOuter,
								icon: GridMenuIcon.MoveUp,
								disabled: index === 0,
								onAction: () => {
									table.setGrouping(reordered(index, index - 1))
								},
							},
							{
								id: GroupLevelActionId.MoveInner,
								label: messages.moveInner,
								icon: GridMenuIcon.MoveDown,
								disabled: index === grouping.length - 1,
								onAction: () => {
									table.setGrouping(reordered(index, index + 1))
								},
							},
							{
								id: GroupLevelActionId.Remove,
								label: messages.remove,
								icon: GridMenuIcon.Ungroup,
								onAction: () => {
									table.setGrouping(grouping.filter((id) => id !== columnId))
								},
							},
						],
					},
				]

				return (
					<span
						key={columnId}
						data-slot='group-by-chip'
						data-column-id={columnId}
						// The level's depth, so a kit can number or indent the chips. Physical words
						// would be wrong here and logical ones meaningless: nesting is not a screen
						// axis, so it neither flips under RTL nor runs up and down — it is just how
						// deep the level sits, which is what the attribute says.
						data-level={index}
					>
						<span data-slot='group-by-chip-label'>{label}</span>
						<Menu
							variant={GridMenuVariant.Row}
							sections={sections}
							aria-label={`${messages.label}: ${label}`}
						/>
					</span>
				)
			})}
		</div>
	)
}

/** One shared empty slice, so a grid without grouping never allocates and never re-renders. */
const EMPTY_GROUPING: readonly string[] = Object.freeze([])
