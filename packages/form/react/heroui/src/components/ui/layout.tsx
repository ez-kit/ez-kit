import type { GridItemRenderProps, SectionRenderProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The layout primitives of the HeroUI kit: a headed `Section` grouping a column grid of
 * `GridItem`s.
 *
 * HeroUI v3 ships no `Grid`/`Section` component, so — like `components/ui/action-bar.tsx` in
 * the data-grid heroui package — this is hand-written rather than an adapter over a vendored
 * primitive: nothing here is vendored, so nothing inherits the shadcn immutability rule.
 *
 * Tailwind extracts class names statically, so a `grid-cols-${columns}` / `col-span-${n}`
 * template string would drop the utility from the build — these map the supported column
 * counts to literal class names instead.
 */

/** Minimal class joiner — this package ships no `cn`/`tailwind-merge`. */
function cx(...classNames: (string | false | undefined)[]) {
	return classNames.filter(Boolean).join(' ')
}

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
		<fieldset
			data-slot='form-section'
			className='flex flex-col gap-4 border-0 p-0'
		>
			{title !== undefined && (
				<legend
					data-slot='form-section-title'
					className='text-foreground text-base font-medium'
				>
					{title}
				</legend>
			)}
			{description !== undefined && (
				<p
					data-slot='form-section-description'
					className='text-muted text-sm'
				>
					{description}
				</p>
			)}
			<div
				data-slot='form-section-grid'
				className={cx(
					'grid gap-4',
					columns !== undefined ? (COLUMNS_CLASS[columns] ?? DEFAULT_COLUMNS_CLASS) : DEFAULT_COLUMNS_CLASS,
				)}
			>
				{children}
			</div>
		</fieldset>
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
