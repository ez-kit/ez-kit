'use client'

import { DataGrid } from 'shared/DataGrid'

/**
 * The layout both CRUD examples render, so the two differ only in where their writes go.
 *
 * Two things it does that no preset covers together, which is why it is written out rather than
 * named:
 *
 * - each column's filter sits **behind a header popover** (`filterPopover` rather than
 *   `filter`) — what `filtering: { variant: 'popover' }` used to ask for, and what
 *   `PopoverFiltersLayout` would give on its own;
 * - the page-size selector is mounted at all. `pagination.items` names *which* sizes the
 *   control offers, never *whether* there is a control — mounting is a layout's decision, and
 *   `DefaultLayout` makes it the other way. Here it shares the bottom bar with the page
 *   controls, which is what `<DataGrid.BottomBar/>` with no children of its own is.
 *
 * The two action bars come last, where the default `floating` variant belongs — nothing places
 * them for you, so an `inline` bar would be written first instead.
 */
export function CrudLayout() {
	return (
		<>
			<DataGrid.Toolbar
				end={
					<>
						<DataGrid.ClearFiltersButton />
						<DataGrid.CreateTrigger />
						<DataGrid.SortMenuTrigger />
						<DataGrid.VisibilityTrigger />
					</>
				}
			/>
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
											{({ sortTrigger, filterPopover, menu }) => (
												<DataGrid.HeaderMain>
													{sortTrigger}
													{filterPopover}
													{menu}
												</DataGrid.HeaderMain>
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
			<DataGrid.BottomBar />
			{/* Last, as in every shipped preset: the bar overlays the rows it acts on, and coming
			    last keeps it out of the tab order until there is something to act on. */}
			<DataGrid.ActionBar />
		</>
	)
}
