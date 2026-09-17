'use client'

import { GridShell } from '@ez-kit/data-grid-react'

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
 */
export function CrudLayout() {
	return (
		<GridShell>
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
			<DataGrid.BottomBar />
		</GridShell>
	)
}
