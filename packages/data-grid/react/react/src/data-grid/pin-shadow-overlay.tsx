import { useTable } from './table-context'

/**
 * Renders the overlay that shows scroll shadows alongside pinned columns.
 *
 * The wrapper carries `data-slot="pin-shadow-overlay"` plus the runtime-computed
 * `left` / `right` pixel offsets (sum of pinned-column widths) as inline styles
 * — these values are read from the table model and can't move to CSS.
 *
 * Each shadow div uses `data-pin-shadow="left" | "right"`. Positioning is set
 * by the structural stylesheet (`@ez-kit/data-grid-react/styles.css`); the
 * actual visual shadow (box-shadow, opacity, transition) lives in each UI kit's
 * stylesheet, since it's a visual choice.
 *
 * CSS vars `--dg-pin-left-shadow` / `--dg-pin-right-shadow` (0 or 1) on the
 * table wrapper drive the shadow opacity.
 */
export function PinShadowOverlay() {
	const table = useTable()
	const leftCols = table.getLeftLeafColumns()
	const rightCols = table.getRightLeafColumns()

	if (leftCols.length === 0 && rightCols.length === 0) return null

	const leftSize = leftCols.reduce((acc, col) => acc + col.getSize(), 0)
	const rightSize = rightCols.reduce((acc, col) => acc + col.getSize(), 0)

	return (
		<div
			aria-hidden
			data-slot='pin-shadow-overlay'
			style={{ left: leftSize, right: rightSize }}
		>
			{leftCols.length > 0 && <div data-pin-shadow='left' />}
			{rightCols.length > 0 && <div data-pin-shadow='right' />}
		</div>
	)
}
