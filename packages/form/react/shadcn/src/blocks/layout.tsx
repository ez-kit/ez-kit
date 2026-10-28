import { clampToGridRange, GRID_MIN } from '@ez-kit/form-react'

import { FieldDescription, FieldLegend, FieldSet } from '@form-shadcn/components/ui/field'
import { cn } from '@form-shadcn/lib/utils'

import type { GridItemProps, GridProps, SectionProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The layout primitives of the shadcn kit: a headed `Section`, and a column `Grid` with its
 * `Grid.Item` cell. A section knows nothing of columns — a section on a grid wraps a `Grid`, and
 * a document's renderer inserts that grid itself when a block sets `columns`. `Section` is a
 * `blocks/` adapter over the vendored `field` primitive, same as the value-carrying fields.
 *
 * Tailwind extracts class names statically, so a `grid-cols-${columns}` / `col-span-${n}`
 * template string would drop the utility from the build — these map the supported column
 * counts to literal class names instead.
 *
 * `GRID_MIN`/`clampToGridRange` originate in `@ez-kit/form-core` and reach this kit through
 * `@ez-kit/form-react` rather than being redefined here: the 1..4 range is part of the v1
 * format — `parseFormSchema` rejects a document outside it — so the format's own package owns
 * the numbers. Only the Tailwind class strings below are kit-owned, since they're visual.
 */
const COLUMNS_CLASS: Record<number, string> = {
	1: 'grid-cols-1',
	2: 'grid-cols-2',
	3: 'grid-cols-3',
	4: 'grid-cols-4',
}

const COL_SPAN_CLASS: Record<number, string> = {
	1: 'col-span-1',
	2: 'col-span-2',
	3: 'col-span-3',
	4: 'col-span-4',
}

function columnsClassName(columns: number | undefined): string {
	const resolved = columns === undefined ? GRID_MIN : clampToGridRange(columns)
	// `resolved` is clamped into `[GRID_MIN, GRID_MAX]`, which are exactly the map's keys — the
	// fallback only satisfies `noUncheckedIndexedAccess`, it can never actually be reached.
	return COLUMNS_CLASS[resolved] ?? 'grid-cols-1'
}

function colSpanClassName(colSpan: number | undefined): string {
	const resolved = colSpan === undefined ? GRID_MIN : clampToGridRange(colSpan)
	// Same guarantee as `columnsClassName` above.
	return COL_SPAN_CLASS[resolved] ?? 'col-span-1'
}

export function Section({ title, description, children }: SectionProps): ReactNode {
	return (
		<FieldSet data-slot='form-section'>
			{title !== undefined && <FieldLegend>{title}</FieldLegend>}
			{description !== undefined && <FieldDescription>{description}</FieldDescription>}
			{children}
		</FieldSet>
	)
}

function GridView({ columns, children }: GridProps): ReactNode {
	return (
		<div
			data-slot='form-grid'
			className={cn('grid gap-4', columnsClassName(columns))}
		>
			{children}
		</div>
	)
}

function GridItem({ colSpan, children }: GridItemProps): ReactNode {
	return (
		<div
			data-slot='form-grid-item'
			className={colSpanClassName(colSpan)}
		>
			{children}
		</div>
	)
}

/** The grid and its cell as one slot — `form.Grid` / `form.Grid.Item`. */
export const Grid = Object.assign(GridView, { Item: GridItem })
