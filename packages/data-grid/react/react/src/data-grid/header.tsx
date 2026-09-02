import { useEffect, useState } from 'react'

import { useGridComponents } from '../components-context'

import { DataGridHeaderRow } from './header-row'
import { useDataGridTable, useDataGridState } from './table-context'

import type { DataTable } from '@ez-kit/data-grid-core'
import type { HeaderGroup } from '@tanstack/table-core'
import type { ReactNode } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridHeaderProps<TRow extends object = any> = {
	/**
	 * Adds `data-sticky="true"` to the thead for structural CSS targeting.
	 *
	 * Omit it — the default — and the flag is read from the grid's own `layout.stickyHeader`
	 * option. The prop exists only to force the value; without that fallback a
	 * `<DataGrid.Header />` placed inside a custom `<DataGrid.Table>` body would
	 * silently lose sticky positioning.
	 *
	 * Named `sticky`, not `stickyHeader`: the component already says "header", the way the
	 * neighbouring local overrides drop the prefix too (`<DataGrid.ActiveFiltersBar position>`,
	 * `<DataGrid.GlobalFilterInput placeholder>`).
	 */
	sticky?: boolean
	/**
	 * Custom header content, rendered inside the kit's `<Thead>` — so sticky positioning and
	 * the measured header-height CSS variable still apply.
	 *
	 * Omit it for the built-in header rows: sort affordances, the column menu, resize
	 * handles and the inline / popover filter controls. Supplying `children` opts out of all
	 * of that in exchange for full control over the markup.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.Header>
	 *   {({ headerGroups }) =>
	 *     headerGroups.map((group) => (
	 *       <tr key={group.id}>
	 *         {group.headers.map((header) => <th key={header.id}>{header.column.id}</th>)}
	 *       </tr>
	 *     ))
	 *   }
	 * </DataGrid.Header>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridHeaderRenderArgs<TRow>) => ReactNode)
}

/**
 * What a `<DataGrid.Header>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.Header<Order>>` — and the render arguments are typed. See
 * {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridHeaderRenderArgs<TRow extends object = any> = {
	table: DataTable<TRow>
	headerGroups: HeaderGroup<TRow>[]
}

/**
 * Publishes the rendered thead height as `--dg-header-height` on the table wrapper so pinned-top
 * rows can be offset below the sticky header (consumed by the structural stylesheet).
 *
 * Measures through a ref rather than by querying the DOM for the thead: a kit may commit its
 * header in a later pass than the one that mounts this component — HeroUI builds it through a
 * react-aria collection — and a query that runs too early finds nothing and never retries (#140).
 * The ref lands in state so the effect re-runs whenever the element actually attaches.
 *
 * Returns the ref callback to hand to the thead. No-op when sticky header is disabled.
 */
function useHeaderHeightVar(enabled: boolean): (node: HTMLTableSectionElement | null) => void {
	const [thead, setThead] = useState<HTMLTableSectionElement | null>(null)

	useEffect(() => {
		if (!enabled || !thead) return
		const wrapper = thead.closest("[data-slot='table-wrapper']")
		if (!(wrapper instanceof HTMLElement)) return

		const update = () => {
			wrapper.style.setProperty('--dg-header-height', `${String(thead.offsetHeight)}px`)
		}
		update()
		const ro = new ResizeObserver(update)
		ro.observe(thead)
		return () => {
			ro.disconnect()
			wrapper.style.removeProperty('--dg-header-height')
		}
	}, [enabled, thead])

	return setThead
}

/**
 * Renders the table `<thead>` with all header groups.
 *
 * Emits data attributes consumed by the structural stylesheet
 * (`@ez-kit/data-grid-react/styles.css`):
 * - `data-slot="thead" | "tr" | "th" | "header-main" | "sort-trigger" | "header-extras"`
 * - `data-sticky="true"` on the thead when sticky header is on
 * - `data-sortable="true"` and `data-sort-direction="asc | desc | none"` on sortable headers
 * - `data-draft-sorting="<index>"` on a `<th>` whose sort is pending under `draft`
 *   (the column's position in the not-yet-applied sort array)
 *
 * Pin offsets are written as CSS variables via {@link getCommonPinStyles}; the
 * structural CSS reads them on `[data-pinned]` elements.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Header<TRow extends object = any>({ sticky, children }: DataGridHeaderProps<TRow> = {}) {
	const table = useDataGridTable<TRow>()
	const isSticky = sticky ?? table.grid.layout.stickyHeader
	const theadRef = useHeaderHeightVar(isSticky)

	// Narrow subscriptions: re-render only when slices the header actually reflects change.
	// Editing, expanded, pagination and rowPinning touch none of these, so clicking Edit on a
	// row leaves the header untouched. They live here rather than in `DataGridHeaderCell`
	// because one subscription per header beats one per column, and every cell re-renders with
	// this component anyway.
	useDataGridState((s) => s.sorting)
	useDataGridState((s) => s.columnFilters)
	useDataGridState((s) => s.columnVisibility)
	useDataGridState((s) => s.columnPinning)
	useDataGridState((s) => s.columnSizing)
	useDataGridState((s) => s.columnSizingInfo)
	useDataGridState((s) => s.rowSelection)

	const { Thead } = useGridComponents().core
	const headerGroups = table.getHeaderGroups()

	return (
		<Thead
			ref={theadRef}
			data-slot='thead'
			{...(isSticky ? { 'data-sticky': 'true' } : {})}
		>
			{children === undefined
				? headerGroups.map((headerGroup) => (
						<DataGridHeaderRow
							key={headerGroup.id}
							headerGroup={headerGroup}
						/>
					))
				: typeof children === 'function'
					? children({ table, headerGroups })
					: children}
		</Thead>
	)
}
