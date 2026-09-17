'use client'

import { GridShell } from '@ez-kit/data-grid-react'

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
 * `GridShell` is the one piece worth importing rather than writing: it places the draft and
 * selection bars either side of the grid depending on `selection.bar.variant`, which is a
 * behaviour question rather than a layout one.
 */
export function ProductionLayout() {
	return (
		<GridShell>
			<DataGrid.Toolbar
				start={<DataGrid.GlobalFilterInput />}
				end={
					<>
						<DataGrid.ClearFiltersButton />
						<DataGrid.CreateTrigger />
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
		</GridShell>
	)
}
