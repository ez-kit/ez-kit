import type { ColumnAlign, ColumnAlignDef, ColumnPinningDef, ColumnPinSide, ColumnWidthDef } from './types'

/**
 * The scalar-or-object collapsers for the three column options that take both forms.
 *
 * Shared rather than private to `mapColumns` because the auto-injected system columns
 * (`__selection__`, `__expand__`, `__actions__`) now take the very same options, and a second
 * copy of "what does `align: 'end'` mean" is a second thing to keep in step.
 */

/**
 * Collapses the scalar pinning form onto the object one, so every reader downstream sees a
 * single shape. `pinning: 'left'` is the long `{ side: 'left' }` — a static pin — not a seed.
 */
export function normalizeColumnPinning(
	pinning: false | ColumnPinSide | ColumnPinningDef | undefined,
): false | ColumnPinningDef | undefined {
	if (pinning === undefined || pinning === false) return pinning
	return typeof pinning === 'string' ? { side: pinning } : pinning
}

/**
 * Collapses the scalar width form onto the object one. `width: 200` is the starting width —
 * TanStack's `size` — with no bounds, which is what a bare number reads as.
 */
export function normalizeColumnWidth(width: number | ColumnWidthDef | undefined): ColumnWidthDef | undefined {
	if (width === undefined) return undefined
	return typeof width === 'number' ? { default: width } : width
}

/**
 * Collapses the scalar align form onto the object one. `align: 'end'` means all three parts,
 * which is what the bare value reads as; the object names the parts that differ.
 */
export function normalizeColumnAlign(align: ColumnAlign | ColumnAlignDef | undefined): ColumnAlignDef | undefined {
	if (align === undefined) return undefined
	return typeof align === 'string' ? { header: align, cell: align, footer: align } : align
}
