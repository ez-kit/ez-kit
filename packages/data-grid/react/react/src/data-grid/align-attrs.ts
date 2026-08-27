import type { ColumnAlign, ColumnAlignDef } from '@ez-kit/data-grid-core'
import type { ColumnMeta } from '@tanstack/table-core'

/** Which part of a column an alignment applies to. Mirrors the keys of `ColumnAlignDef`. */
type AlignPart = keyof ColumnAlignDef

/**
 * `data-align` for one part of a column, or nothing when the column did not ask for alignment.
 *
 * The React package emits the attribute and stops there — the shared structural stylesheet turns
 * it into `text-align` / `justify-content`, so a kit inherits alignment without writing any CSS,
 * and this package stays free of visual styling.
 */
export function getAlignAttrs(
	meta: ColumnMeta<unknown, unknown> | undefined,
	part: AlignPart,
): { 'data-align'?: ColumnAlign } {
	const align = meta?.columnAlign?.[part]
	return align === undefined ? {} : { 'data-align': align }
}
