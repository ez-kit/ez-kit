import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { useGridOptions } from '../use-grid-options'

import { getAlignAttrs } from './align-attrs'
import { resolveViewComponent } from './cell'
import { flexRender } from './flex-render'

import type { CellTypeRegistry, CellViewProps } from '../cell-types-context'
import type { ResolvedGridOptions } from '../resolved-options'
import type { ErasedRow, GridFeatures } from '../types'
import type { FormColumnMeta } from '@ez-kit/data-grid-core'
import type { Header } from '@tanstack/table-core'
import type { ComponentType, ReactNode } from 'react'

/**
 * What a `<DataGrid.FooterCell>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.FooterCell<Order>>` — and the render arguments are typed. See
 * {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
export type DataGridFooterCellRenderArgs<TRow extends object = ErasedRow> = {
	header: Header<GridFeatures, TRow>
	/**
	 * What this cell would have rendered on its own, already resolved: the column's `footer`, or
	 * — for a column that wrote `aggregation` and no `footer` — its grand total. `null` for a
	 * placeholder cell, and for a column with neither.
	 */
	content: ReactNode
}

export type DataGridFooterCellProps<TRow extends object = ErasedRow> = {
	/**
	 * The footer group entry this cell renders. Footer cells come from `table.getFooterGroups()`,
	 * the same `Header` objects the header rows use — hence the prop name.
	 */
	header: Header<GridFeatures, TRow>
	/**
	 * Custom content for this one footer cell, rendered inside the kit's `Td` — so the cell keeps
	 * its `colSpan`, its pinning offset, its `data-align` and its `footerClassName`.
	 *
	 * Omit it for the column's own `footer`, or its grand total when it wrote `aggregation` and no
	 * `footer`. The render-function form hands that content back
	 * ({@link DataGridFooterCellRenderArgs}) so a custom cell can wrap rather than replace it.
	 */
	children?: ReactNode | ((args: DataGridFooterCellRenderArgs<TRow>) => ReactNode)
}

/**
 * A footer cell's default content: the column's own `footer`, or its grand total.
 *
 * The two never compete — `footer` wins whenever the column def has one, so no existing grid's
 * footer changes. The fallback reaches only a column that wrote `aggregation` and no `footer`,
 * which is a column that asked to be totalled and said nothing about where.
 *
 * **A server-supplied total comes first and needs no feature.** `aggregation.totals` is looked
 * up by column id before `rowAggregationFeature` is consulted at all, so a grid whose totals all
 * come from the server registers neither that feature nor an `aggregationFn` — there is nothing
 * to ask. `aggregation.manual` turns the computed fallback off: once it is set, a column with no
 * entry under `totals` renders nothing rather than a client-computed number the server disagrees
 * with.
 *
 * Absent a supplied total (and with `manual` off), `column.getAggregationValue()` totals the
 * filtered row model, so a grid registering `rowAggregationFeature` alone — no
 * `columnGroupingFeature`, no grouped row model — gets the number. That is the split the two
 * upstream features exist for, and registering grouping merely to total a column is the mistake
 * upstream's own guidance leads with.
 *
 * Rendered through the column's existing cell-type view, so a `number` column's total is
 * formatted the way its values are, exactly as an aggregated cell on a group row is.
 */
function footerContentOf<TRow extends object>(
	header: Header<GridFeatures, TRow>,
	meta: FormColumnMeta | undefined,
	cellTypes: CellTypeRegistry,
	aggregation: ResolvedGridOptions['aggregation'],
): ReactNode {
	const { column } = header
	if (column.columnDef.footer !== undefined) return flexRender(column.columnDef.footer, header.getContext())

	// A supplied total wins over computing one, and is looked up **before** the feature is
	// consulted: a grid whose totals all come from the server registers neither
	// `rowAggregationFeature` nor `aggregationFns`, so there is nothing to ask. `Object.hasOwn`
	// rather than `!== undefined` — `0` and `null` are real totals, and `0` is the right answer
	// for an empty result set.
	const supplied = aggregation.totals
	const total: unknown =
		supplied !== undefined && Object.hasOwn(supplied, column.id)
			? supplied[column.id]
			: aggregation.manual
				? undefined
				: // Optional-called: this runs for every footer cell of every grid, and
					// `rowAggregationFeature` is not structural — see the FEATURE GUARDS note in
					// `types.ts`. A column with no `aggregation` has no aggregation function either, so it
					// answers `undefined` and the cell stays empty, which is what a footer cell has
					// always been without a `footer`.
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
					column.getAggregationValue?.()

	if (total === undefined) return null

	const aggregatedComp = (meta as { aggregation?: { component?: unknown } } | undefined)?.aggregation?.component as
		| ComponentType<CellViewProps>
		| undefined
	const viewComp = aggregatedComp ?? resolveViewComponent(column.columnDef.meta, cellTypes)
	if (!viewComp) return String(total)

	return flexRender(viewComp, {
		value: total,
		// A grand total belongs to no row, so there is none to hand the renderer. A cell-type view
		// reads `value`; one that reaches for `row` is a column renderer and belongs on `footer`.
		row: undefined,
		rowIndex: -1,
		...(meta?.cell?.config !== undefined ? { config: meta.cell.config } : {}),
	})
}

/**
 * One `<td>` of the table footer.
 *
 * Emits `data-slot="td"`, plus `data-pinned="start" | "end"` for a pinned column and
 * `data-align` from the column's `align.footer` — the same chrome the default `<tfoot>` applies,
 * which is the whole point of having this component rather than a hand-written `<td>`.
 */

export function DataGridFooterCell<TRow extends object = ErasedRow>({
	header,
	children,
}: DataGridFooterCellProps<TRow>) {
	const { Td } = useGridComponents().core
	const pinned = header.column.getIsPinned()
	// `ColumnMeta` is declared `in out` in both its `TFeatures` and its `TData` upstream, so no
	// concrete instantiation is assignable to any other and this cast is forced by the variance
	// annotation rather than chosen. `FormColumnMeta` is the one name core declares for it, and
	// this is the same cast core's own `creating.ts` makes at its boundary.
	const meta = header.column.columnDef.meta as FormColumnMeta | undefined
	const cellTypes = useCellTypes()
	const { aggregation } = useGridOptions()
	const content = header.isPlaceholder ? null : (footerContentOf(header, meta, cellTypes, aggregation) ?? null)

	return (
		<Td
			data-slot='td'
			colSpan={header.colSpan}
			{...(pinned ? { pinned, 'data-pinned': pinned } : {})}
			{...getAlignAttrs(meta, 'footer')}
			{...(meta?.footerClassName !== undefined ? { className: meta.footerClassName } : {})}
		>
			{children === undefined ? content : typeof children === 'function' ? children({ header, content }) : children}
		</Td>
	)
}
