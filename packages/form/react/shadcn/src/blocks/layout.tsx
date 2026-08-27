import { FieldDescription, FieldLegend, FieldSet } from '@form-shadcn/components/ui/field'
import { cn } from '@form-shadcn/lib/utils'

import type { GridItemRenderProps, SectionRenderProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The layout primitives of the shadcn kit: a headed `Section` grouping a column grid of
 * `GridItem`s. Both are `blocks/` adapters over the vendored `field` primitive, same as the
 * value-carrying fields.
 *
 * Tailwind extracts class names statically, so a `grid-cols-${columns}` / `col-span-${n}`
 * template string would drop the utility from the build — these map the supported column
 * counts to literal class names instead.
 */

/** Supported grid widths. A config-driven form is expected to stay within this range. */
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

const DEFAULT_COLUMNS_CLASS = COLUMNS_CLASS[1]
const DEFAULT_COL_SPAN_CLASS = COL_SPAN_CLASS[1]

export function Section({ title, description, columns, children }: SectionRenderProps): ReactNode {
	return (
		<FieldSet data-slot='form-section'>
			{title !== undefined && <FieldLegend>{title}</FieldLegend>}
			{description !== undefined && <FieldDescription>{description}</FieldDescription>}
			<div
				data-slot='form-section-grid'
				className={cn(
					'grid gap-4',
					columns !== undefined ? (COLUMNS_CLASS[columns] ?? DEFAULT_COLUMNS_CLASS) : DEFAULT_COLUMNS_CLASS,
				)}
			>
				{children}
			</div>
		</FieldSet>
	)
}

export function GridItem({ colSpan, children }: GridItemRenderProps): ReactNode {
	return (
		<div
			data-slot='form-grid-item'
			className={colSpan !== undefined ? (COL_SPAN_CLASS[colSpan] ?? DEFAULT_COL_SPAN_CLASS) : DEFAULT_COL_SPAN_CLASS}
		>
			{children}
		</div>
	)
}
