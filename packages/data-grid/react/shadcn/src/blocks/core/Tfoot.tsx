import { TableFooter } from '../../components/ui/table'

import type { TfootProps } from '@ez-kit/data-grid-react'

/**
 * The `<tfoot>`, laid out as a block box.
 *
 * The vendored `<Table>`, `<TableHeader>` and `<TableBody>` each set `display: block` inline,
 * because the rows below them are CSS grids over `--grid-template-columns` and a native table box
 * would fight that grid. `<TableFooter>` was never given the same treatment — nothing rendered it
 * — so it stayed a `table-footer-group`, got wrapped in an anonymous table box and shrink-wrapped:
 * the totals row came out a third of the table's width, with its cells in the wrong columns.
 *
 * The rule belongs here rather than in `components/ui/table.tsx`, which is vendored from shadcn
 * and must stay untouched.
 */
export function Tfoot({ style, ...props }: TfootProps) {
	return (
		<TableFooter
			{...props}
			style={{ display: 'block', ...style }}
		/>
	)
}
