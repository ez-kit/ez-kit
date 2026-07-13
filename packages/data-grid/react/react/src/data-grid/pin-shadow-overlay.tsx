import { useDataGridInstance, useDataGridStore } from './table-context'

/**
 * Renders the overlay that shows scroll shadows alongside pinned columns.
 *
 * The wrapper carries `data-slot="pin-shadow-overlay"` and fills the whole table
 * wrapper (`inset: 0`) — it is a non-collapsing layer, never sized to the gap
 * between the pinned blocks.
 *
 * Each shadow div uses `data-pin-shadow="left" | "right"` and carries its OWN
 * runtime-computed pixel offset as an inline style: the left shadow sits at
 * `left = sum of left-pinned widths`, the right shadow at `right = sum of
 * right-pinned widths`. These offsets come from the table model and can't move
 * to CSS. Positioning each shadow independently (rather than sizing one shared
 * overlay to `[leftSize … width − rightSize]`) is what keeps both shadows visible
 * when the combined pinned width approaches the viewport — otherwise the shared
 * box would collapse to zero width and `overflow: hidden` would clip both shadows.
 *
 * The actual visual shadow (box-shadow, opacity, transition) lives in each UI
 * kit's stylesheet, since it's a visual choice; structural positioning
 * (`position`, `top`/`bottom`, `inset`) lives in the shared structural stylesheet
 * (`@ez-kit/data-grid-react/styles.css`).
 *
 * CSS vars `--dg-pin-left-shadow` / `--dg-pin-right-shadow` (0 or 1) on the
 * table wrapper drive the shadow opacity.
 *
 * Subscribes only to the layout slices it actually reflects — left/right column
 * sets (from `columnPinning` + `columnVisibility`) and their widths
 * (`columnSizing`). Editing / sorting / pagination etc. don't touch these.
 */
export function PinShadowOverlay() {
	const instance = useDataGridInstance()
	const table = instance.table

	useDataGridStore((s) => s.columnPinning)
	useDataGridStore((s) => s.columnVisibility)
	useDataGridStore((s) => s.columnSizing)

	const leftCols = table.getLeftLeafColumns()
	const rightCols = table.getRightLeafColumns()

	if (leftCols.length === 0 && rightCols.length === 0) return null

	const leftSize = leftCols.reduce((acc, col) => acc + col.getSize(), 0)
	const rightSize = rightCols.reduce((acc, col) => acc + col.getSize(), 0)

	return (
		<div
			aria-hidden
			data-slot='pin-shadow-overlay'
		>
			{leftCols.length > 0 && (
				<div
					data-pin-shadow='left'
					style={{ left: leftSize }}
				/>
			)}
			{rightCols.length > 0 && (
				<div
					data-pin-shadow='right'
					style={{ right: rightSize }}
				/>
			)}
		</div>
	)
}
