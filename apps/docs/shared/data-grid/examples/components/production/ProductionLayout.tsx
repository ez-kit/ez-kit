'use client'

import { useDataGridTable } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

/**
 * The orders console's own layout, shared by every example in this directory.
 *
 * It is what the five removed layout options used to spell out on each grid:
 *
 * ```tsx
 * sorting={{ toolbar: true }}
 * visibility
 * filtering={{ variant: 'popover', chips: { position: 'above' }, toolbar: true }}
 * ```
 *
 * None of that described the table — it described this tree. So it lives here once, as a
 * component, and each grid names it instead of restating it: either as `children`, or through
 * `components={{ core: { Layout: ProductionLayout } }}` for a whole subtree.
 *
 * The two action bars come last, which is where the default `floating` variant belongs: it
 * overlays the rows, and document order keeps it out of the tab order until there is something
 * to act on. A grid that asks for `selection: { bar: 'inline' }` writes them first instead —
 * nothing places them for you.
 *
 * One control is **gated**, and the rest are not, for a reason worth knowing before writing a
 * layout of your own: a control reads its feature's API, and a grid that never registered that
 * feature does not have one — so mounting it is a render-time `TypeError`, not a no-op. Four
 * examples share this layout and only `creating` varies between their sets, so only
 * `CreateTrigger` needs the check. The shipped presets do the same thing for all five of their
 * controls (`useToolbarControls`), because they serve every grid rather than four known ones.
 */
export function ProductionLayout() {
	// Config refs only, no state read — a layout that re-rendered on every keystroke would
	// cascade into the table below it.
	const canCreate = Boolean(useDataGridTable().options.creating)

	return (
		<>
			<DataGrid.Toolbar
				start={<DataGrid.GlobalFilterInput />}
				end={
					<>
						<DataGrid.ClearFiltersButton />
						{canCreate && <DataGrid.CreateTrigger />}
						<DataGrid.SortMenuTrigger />
						<DataGrid.VisibilityTrigger />
					</>
				}
			/>
			{/* Above the table, which is where `chips: { position: 'above' }` put it. */}
			<DataGrid.ActiveFiltersBar />
			<DataGrid.Table>
				<DataGrid.Header>
					{({ headerGroups }) =>
						headerGroups.map((headerGroup) => (
							<DataGrid.HeaderRow
								key={headerGroup.id}
								headerGroup={headerGroup}
							>
								{({ headers }) =>
									headers.map((header) => (
										<DataGrid.HeaderCell
											key={header.id}
											header={header}
										>
											{/*
											 * `filterPopover` rather than `filter` — the same control behind the kit's
											 * trigger, which is all `filtering: { variant: 'popover' }` ever meant. With
											 * this many columns the inline form would cost the header its height.
											 */}
											{({ sortTrigger, filterPopover, menu }) => (
												<div data-slot='header-main'>
													{sortTrigger}
													{filterPopover}
													{menu}
												</div>
											)}
										</DataGrid.HeaderCell>
									))
								}
							</DataGrid.HeaderRow>
						))
					}
				</DataGrid.Header>
				<DataGrid.Body />
			</DataGrid.Table>
			{/* The page-size selector shares the bottom bar with the page controls. */}
			<DataGrid.BottomBar />
			<DataGrid.DraftBar />
			<DataGrid.SelectionBar />
		</>
	)
}
