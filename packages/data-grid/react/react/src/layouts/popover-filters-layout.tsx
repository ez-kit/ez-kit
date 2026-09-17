import { Body } from '../data-grid/body'
import { Header } from '../data-grid/header'
import { DataGridHeaderCell } from '../data-grid/header-cell'
import { DataGridHeaderRow } from '../data-grid/header-row'
import { Pagination } from '../data-grid/pagination'
import { DataGridTable } from '../data-grid/table'
import { Toolbar } from '../data-grid/toolbar'

import { GridShell } from './default-layout'
import { useToolbarEnd, useToolbarStart } from './toolbar-controls'

/**
 * {@link DefaultLayout} with each column's filter behind a popover trigger in its header —
 * what `filtering: { variant: 'popover' }` used to ask for.
 *
 * The cost of removing that enum, stated plainly: choosing the popover means expanding the
 * table down to `<DataGrid.HeaderCell>` — four levels instead of one word. This preset **is**
 * that expansion, so a consumer who wants it names a layout rather than writing it out. Every
 * level below `DataGrid.Table` renders its own default except the header cell, which swaps
 * `filter` for `filterPopover`: the same control, behind the kit's `FilterPopover` trigger.
 * Never both — they are one control in two presentations, and the pair would field the same
 * filter value twice.
 */
export function PopoverFiltersLayout() {
	const start = useToolbarStart()
	const end = useToolbarEnd()

	return (
		<GridShell>
			<Toolbar
				start={start}
				end={end}
			/>
			<DataGridTable>
				<Header>
					{({ headerGroups }) =>
						headerGroups.map((headerGroup) => (
							<DataGridHeaderRow
								key={headerGroup.id}
								headerGroup={headerGroup}
							>
								{({ headers }) =>
									headers.map((header) => (
										<DataGridHeaderCell
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
										</DataGridHeaderCell>
									))
								}
							</DataGridHeaderRow>
						))
					}
				</Header>
				<Body />
			</DataGridTable>
			<Pagination />
		</GridShell>
	)
}
