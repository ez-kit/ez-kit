import { BottomBar } from '../data-grid/bottom-bar'
import { DraftBar } from '../data-grid/draft-bar'
import { SelectionBar } from '../data-grid/selection-bar'
import { DataGridTable } from '../data-grid/table'
import { Toolbar } from '../data-grid/toolbar'

import { useToolbarEnd, useToolbarStart } from './toolbar-controls'

/**
 * {@link DefaultLayout} with the page-size selector beside the page controls instead of in the
 * toolbar — what `pagination: { pageSizer: 'footer' }` used to ask for.
 *
 * `<BottomBar/>` rather than `<Pagination/>` is the whole difference: on its own the pagination
 * is a full-width centred bar, while the bottom bar's slot lays its contents out as a row with
 * two ends, which is what a sizer and the page controls sharing one line needs.
 */
export function BottomBarLayout() {
	const start = useToolbarStart()
	const end = useToolbarEnd()

	return (
		<>
			<Toolbar
				start={start}
				end={end}
			/>
			<DataGridTable />
			<BottomBar />
			<DraftBar />
			<SelectionBar />
		</>
	)
}
