'use client'

import { useDataGridTable } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

import { OrdersHeaderCell } from './OrdersHeaderCell'

/**
 * The orders screen's own layout, shared by every example in this directory.
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
 * `components={{ core: { Layout: OrdersLayout } }}` for a whole subtree.
 *
 * The action bar comes last, which is where the default `floating` variant belongs: it overlays
 * the rows, and document order keeps it out of the tab order until there is something to act on.
 * A grid that asks for `selection: { bar: 'inline' }` writes it first instead — nothing places
 * it for you.
 *
 * One control is **gated**, and the rest are not, for a reason worth knowing before writing a
 * layout of your own: a control reads its feature's API, and a grid that never registered that
 * feature does not have one — so mounting it is a render-time `TypeError`, not a no-op. Four
 * examples share this layout and only `creating` varies between their sets, so only
 * `CreateTrigger` needs the check. The shipped presets do the same thing for all five of their
 * controls (`useToolbarControls`), because they serve every grid rather than four known ones.
 */
export function OrdersLayout() {
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
											 * A component, not a render function — see `OrdersHeaderCell`, which reads
											 * the same parts through `useDataGridHeaderCell()`. Either form works; this
											 * one keeps the layout about layout.
											 */}
											<OrdersHeaderCell />
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
			<DataGrid.ActionBar />
		</>
	)
}
