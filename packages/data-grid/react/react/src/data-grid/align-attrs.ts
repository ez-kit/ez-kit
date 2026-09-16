import type { FormColumnMeta, ColumnAlign, ColumnAlignDef } from '@ez-kit/data-grid-core'

/** Which part of a column an alignment applies to. Mirrors the keys of `ColumnAlignDef`. */
type AlignPart = keyof ColumnAlignDef

/**
 * `data-align` for one part of a column, or nothing when the column did not ask for alignment.
 *
 * The React package emits the attribute and stops there — the shared structural stylesheet turns
 * it into `text-align` / `justify-content`, so a kit inherits alignment without writing any CSS,
 * and this package stays free of visual styling.
 */
export function getAlignAttrs(meta: FormColumnMeta | undefined, part: AlignPart): { 'data-align'?: ColumnAlign } {
	const align = meta?.align?.[part]
	return align === undefined ? {} : { 'data-align': align }
}
