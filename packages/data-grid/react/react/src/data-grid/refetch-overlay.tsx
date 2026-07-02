import { useGridComponents } from '../components-context'

import { useTable } from './table-context'

/** data-slot value for the refetch overlay host row. */
export const REFETCH_OVERLAY_SLOT = 'refetch-overlay' as const

/**
 * Structural, **unstyled** overlay rendered over existing rows while a background
 * refetch is in flight (`isFetching && !isPending && rows.length > 0`). The loading
 * status is fully controlled via `state.loading`; the grid derives this predicate.
 *
 * Visibility predicate:
 * - `isPending` → skeleton path (see `LoadingBody`), NOT this overlay
 * - `isFetching && !isPending && rows > 0` → this component is rendered
 * - idle → nothing
 *
 * Zero visual styling lives here. A `<tr>/<td>` host carries only
 * `data-slot="refetch-overlay"` so UI kits can target it with CSS or use
 * `position: absolute` on the injected `RefetchOverlay` component to overlay
 * the full tbody (dim effect, spinner, etc.).
 */
export function RefetchOverlayHost({ columnCount }: { columnCount: number }) {
	const gridComponents = useGridComponents()
	const { Tr, Td } = gridComponents.core
	const { RefetchOverlay } = gridComponents['fallback-states']
	const table = useTable()
	const visibleColumnCount = columnCount > 0 ? columnCount : table.getVisibleLeafColumns().length

	return (
		<Tr data-slot={REFETCH_OVERLAY_SLOT}>
			<Td
				colSpan={visibleColumnCount}
				data-slot={REFETCH_OVERLAY_SLOT}
			>
				<RefetchOverlay columnCount={visibleColumnCount} />
			</Td>
		</Tr>
	)
}
