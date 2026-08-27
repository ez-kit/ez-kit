import type { GridItemRenderProps, SectionRenderProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The layout primitives of the HeroUI kit: a headed `Section` grouping a column grid of
 * `GridItem`s.
 *
 * HeroUI v3 ships no `Grid`/`Section` component, so — unlike the value-carrying fields in
 * `fields.tsx`, which wrap real `@heroui/react` primitives — this is hand-written from plain
 * elements. It still lives in `blocks/` alongside the rest of this kit's implementation
 * (this package has no `components/ui/` layer; that convention is shadcn's, where it marks
 * vendored files as immutable — see `packages/data-grid/react/heroui/CLAUDE.md` for why that
 * rule is about provenance, not path, and doesn't extend here).
 *
 * Tailwind extracts class names statically, so a `grid-cols-${columns}` / `col-span-${n}`
 * template string would drop the utility from the build — these map the supported column
 * counts to literal class names instead.
 */

/** Minimal class joiner — this package ships no `cn`/`tailwind-merge`. */
function cx(...classNames: (string | false | undefined)[]) {
	return classNames.filter(Boolean).join(' ')
}

/**
 * Supported grid widths — matches the 1..4 range `@ez-kit/form-core`'s `parseFormSchema`
 * enforces on `section.columns` / `colSpan` (spec §11). A schema that went through
 * `parseFormSchema` can never carry a value outside this range; a TS-authored schema that
 * skipped it can, so an out-of-range value here is clamped to the nearest supported one
 * rather than collapsed to a single column — a caller asking for 6 columns should get the
 * widest grid this kit supports, not the narrowest.
 */
const GRID_MIN = 1
const GRID_MAX = 4

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

/** Rounds to the nearest integer, then clamps into `[GRID_MIN, GRID_MAX]`. */
function clampToGridRange(value: number): number {
	return Math.min(GRID_MAX, Math.max(GRID_MIN, Math.round(value)))
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
				className={cx('grid gap-4', columnsClassName(columns))}
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
			className={colSpanClassName(colSpan)}
		>
			{children}
		</div>
	)
}
