'use client'

import { useGridMessages } from '@ez-kit/data-grid-react/kit'
import { Skeleton, Table } from '@heroui/react'

import type { LoadingRowProps } from '@ez-kit/data-grid-react'

/**
 * React Aria builds the table body from a collection, so only its own `Row` / `Cell`
 * nodes are picked up — a bare `<tr>` here is dropped from the collection entirely
 * (the skeleton never rendered) and React logs an invalid-nesting hydration error.
 *
 * It is a row of the table but not a row of the data, so it carries `data-slot="tr"` like every
 * row in the body and no `data-row-id`, plus `data-loading-row` to mark what it is. The kit draws
 * this row itself, so the kit is what stamps that contract onto it.
 *
 * Each cell carries `messages.fallbacks.loading` as clipped text, and that is a real a11y fix
 * rather than decoration. `Th` marks the first visible non-system column `isRowHeader`, so
 * react-aria gives that column's **body** cell `role="rowheader"` in every row of the collection —
 * the skeleton rows included — and names the `<tr>` after it through `aria-labelledby`. A
 * `<Skeleton>` contributes no text, so those cells were rowheaders with no accessible name and the
 * rows had no name either: axe's `empty-table-header` fired once per skeleton row on every heroui
 * grid that ever showed its loading state, and `a11y/names.spec.ts` caught it on the one docs
 * example whose first fetch is slow enough for the audit to land inside it.
 *
 * Text rather than `aria-label` on the cell, for the reason the shared `VisuallyHidden` docblock
 * gives about `core.Th`: a cell's accessible name is its content, and `Table.Cell` does not
 * forward the attribute — measured, the `aria-label` reached no `<td>` and the violation stood.
 * `data-slot='sr-only'` is the clip rule in `@ez-kit/data-grid-react`'s structural stylesheet,
 * which this kit's `styles.css` imports, so it needs no Tailwind utility of its own.
 *
 * It goes in every cell rather than in the one that becomes the rowheader, because which column
 * that is is a function of visibility and pinning (`useRowHeaderId`) and is not knowable here —
 * the shared layer hands this component a `columnCount` and nothing else. A skeleton cell reading
 * "Loading" is also the better answer for the other nine: the alternative a screen reader gets
 * while the rows are placeholders is "blank".
 *
 * The shadcn kit needs none of this: its table is plain DOM, no cell carries `rowheader`, and that
 * difference is real rather than an omission — labelling its skeleton too would change the shadcn
 * registry payload every `npx shadcn add` copies, for a violation that kit does not have.
 */
export function LoadingRow({ columnCount }: LoadingRowProps) {
	const messages = useGridMessages()

	return (
		<Table.Row
			data-slot='tr'
			data-loading-row='true'
		>
			{Array.from({ length: columnCount }, (_, i) => (
				<Table.Cell
					key={i}
					data-slot='td'
					className='py-3 px-4'
				>
					<span data-slot='sr-only'>{messages.fallbacks.loading}</span>
					<Skeleton className='h-4 w-full rounded' />
				</Table.Cell>
			))}
		</Table.Row>
	)
}
