import { Fragment } from 'react'

import { useGridComponents } from '../components-context'

import { CreatingRow } from './creating-row'
import { EmptyStateRow } from './empty-state-row'
import { ExpandedRow } from './expanded-row'
import { LoadMoreFooter } from './load-more-footer'
import { LoadingBody } from './loading-body'
import { NoResultsRow } from './no-results-row'
import { RefetchOverlayHost } from './refetch-overlay'
import { DataGridRow } from './row'
import { useDataGridTable, useDataGridState } from './table-context'
import { usePinnedRowOffsets } from './use-pinned-row-offsets'
import { VirtualBody } from './virtual-body'
import { useVirtualContext } from './virtual-context'

import type { ErasedRow, GridFeatures } from '../types'
import type { ExpandedRowProps } from '../use-data-grid'
import type { DataGridRowProps } from './row'
import type { Row, Table } from '@tanstack/table-core'
import type { ComponentType, ReactNode } from 'react'

/**
 * What a `<DataGrid.Body>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.Body<Order>>` — and the render arguments are typed: `row.original` is an `Order`.
 * It cannot be inferred, because a compound child reads the table from context rather than from
 * a prop; this is the explicit-argument shape `useDataGridTable<Order>()` already uses.
 */
export type DataGridBodyRenderArgs<TRow extends object = ErasedRow> = {
	table: Table<GridFeatures, TRow>
	/** The rows of the current row model, already sorted / filtered / paginated. */
	rows: Row<GridFeatures, TRow>[]
	/**
	 * Everything the built-in body would have rendered inside the kit's `Tbody`, in order:
	 * {@link creatingRow}, {@link pinnedTopRows}, {@link centerRows}, {@link pinnedBottomRows},
	 * {@link loadMoreFooter}, {@link refetchOverlay}.
	 *
	 * Render it and add beside it, or take the parts one at a time. Composing a body used to
	 * mean giving up all six at once.
	 */
	content: ReactNode
	/** The draft row the `creating` feature mounts above the data, or `null` when it has none. */
	creatingRow: ReactNode
	/**
	 * The rows pinned to the top, each with its expanded panel and its pin offset measured.
	 * `null` when row pinning is off.
	 */
	pinnedTopRows: ReactNode
	/** The unpinned rows, each with its expanded panel — the whole row model when pinning is off. */
	centerRows: ReactNode
	/** The rows pinned to the bottom, measured like {@link pinnedTopRows}. */
	pinnedBottomRows: ReactNode
	/** The infinite-scroll footer: the sentinel that fetches, or the trigger that asks to. */
	loadMoreFooter: ReactNode
	/** The overlay covering the rows while a background refetch is in flight, or `null`. */
	refetchOverlay: ReactNode
}

/**
 * The body's parts without the three the caller does not build: `table` and `rows` are handed
 * in, and `content` is the parts composed — so naming it here would be circular.
 */
type BodyParts<TRow extends object> = Omit<DataGridBodyRenderArgs<TRow>, 'table' | 'rows' | 'content'>

export type DataGridBodyProps<TRow extends object = ErasedRow> = {
	/**
	 * Custom body content, rendered inside the kit's `<Tbody>`.
	 *
	 * Omit it for the built-in body. The render-function form hands back everything that body
	 * would have rendered *inside* the `Tbody` — `content`, or its six parts one at a time
	 * ({@link DataGridBodyRenderArgs}) — so adding to the body no longer costs you the pinned
	 * rows, the creating row, the expanded panels, the infinite footer and the refetch overlay.
	 *
	 * Four branches stay out of reach, because each replaces the whole `<tbody>` rather than
	 * filling one: the **virtualized** body, and the **loading**, **empty** and **no-results**
	 * fallbacks. `children` is checked before all four, so a custom body renders instead of
	 * them — including while the grid is loading or has nothing to show. A grid that wants both
	 * gates its own `children` on `useDataGridState`, or keeps the built-in body and customises
	 * further down at `<DataGrid.Row>`.
	 *
	 * @example — replace the rows
	 * ```tsx
	 * <DataGrid.Body>
	 *   {({ rows }) => rows.map((row) => <DataGrid.Row key={row.id} row={row} />)}
	 * </DataGrid.Body>
	 * ```
	 *
	 * @example — keep the built-in body and add to it
	 * ```tsx
	 * <DataGrid.Body>
	 *   {({ content }) => <>{content}<tr data-slot='tr'><td colSpan={99}>Σ</td></tr></>}
	 * </DataGrid.Body>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridBodyRenderArgs<TRow>) => ReactNode)
}

/**
 * Renders the table `<tbody>`.
 *
 * Subscribes only to the slices that actually change row composition or
 * top-level branching (loading skeleton, creating row, pinned rows). Editing,
 * column visibility, column sizing, row selection mutations do NOT re-render
 * Body — those are handled by leaf components with their own narrow
 * subscriptions.
 *
 * Pinned rows (top / bottom) get `data-pinned="top" | "bottom"` plus a
 * `--dg-row-pin-offset` CSS variable carrying the computed offset; the
 * structural stylesheet shipped with this package applies the actual
 * `position: sticky` + offset.
 */

export function Body<TRow extends object = ErasedRow>({ children }: DataGridBodyProps<TRow> = {}) {
	const { rowVirtualizer } = useVirtualContext()
	const table = useDataGridTable<TRow>()
	const { Tbody } = useGridComponents().core

	// Narrow subscriptions: each returns a referentially stable slice. Body
	// re-renders only when one of these slices actually changes. Editing,
	// columnVisibility, columnSizing, columnPinning, rowSelection updates do
	// NOT touch any of these → no Body re-render.
	// Optional-chained, not chained for tidiness: these three read state slices that do not exist
	// unless `loadingFeature` / `creatingFeature` are registered, and they run before any branch
	// — so a read-only grid with no loading states needed both features just to mount. See
	// `feature-optionality.test.tsx`.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isPending = useDataGridState((s) => s.loading?.isPending ?? false)
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isFetching = useDataGridState((s) => s.loading?.isFetching ?? false)
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isCreatingOpen = useDataGridState((s) => s.creating?.isOpen ?? false)
	// Slices that affect getRowModel() / getTopRows() / getBottomRows() output:
	useDataGridState((s) => s.sorting)
	useDataGridState((s) => s.columnFilters)
	useDataGridState<unknown>((s) => s.globalFilter)
	useDataGridState((s) => s.pagination)
	useDataGridState((s) => s.expanded)
	useDataGridState((s) => s.rowPinning)
	// Cells come out of `row.getVisibleCells()` in column order, so a reorder repaints rows.
	useDataGridState((s) => s.columnOrder)

	// Read before the early returns below: the offset hooks must run on every render.
	const hasPinning = Boolean(table.options.enableRowPinning)
	const topRows = hasPinning ? table.getTopRows() : []
	const bottomRows = hasPinning ? table.getBottomRows() : []
	const registerTopRow = usePinnedRowOffsets(
		'top',
		topRows.map((row) => row.id),
	)
	const registerBottomRow = usePinnedRowOffsets(
		'bottom',
		bottomRows.map((row) => row.id),
	)

	// Read by the fallback branch as well as by the parts, and needing no hook, so it is computed
	// once here rather than twice further down.
	const creatingConfig = table.options.creating
	const creatingMode = creatingConfig?.mode ?? 'row'
	const showCreatingRow =
		creatingConfig !== undefined && (creatingMode === 'pin-row' || (creatingMode === 'row' && isCreatingOpen))

	/**
	 * The six pieces the built-in body puts inside its `Tbody`.
	 *
	 * A function, not values computed up front, because building them costs one React element
	 * per row of the model — the work virtualization exists to avoid, and pure waste for the
	 * documented `{({ rows }) => rows.map(…)}` body that discards all six. The built-in
	 * virtualized branch never reaches it; a *custom* body does, virtualized or not, which is
	 * why {@link buildArgs} puts it behind getters rather than calling it eagerly.
	 *
	 * Every caller sits past every hook above, so calling it conditionally is safe.
	 */
	function buildParts(): BodyParts<TRow> {
		const expandedComponent = table.grid.expanding.component as ComponentType<ExpandedRowProps<object>> | undefined
		const centerModelRows = hasPinning ? table.getCenterRows() : table.getRowModel().rows
		const showRefetchOverlay = isFetching && !isPending && table.getRowModel().rows.length > 0

		/** One row plus the expanded panel that belongs under it — the unit every group repeats. */
		const renderRow = (row: Row<GridFeatures, TRow>, extra?: Partial<DataGridRowProps<TRow>>) => (
			<Fragment key={row.id}>
				<DataGridRow
					row={row}
					{...extra}
				/>
				{expandedComponent && row.getIsExpanded() && <ExpandedRow row={row} />}
			</Fragment>
		)

		return {
			creatingRow: showCreatingRow ? <CreatingRow /> : null,
			pinnedTopRows: topRows.map((row, index) => renderRow(row, { 'data-pinned': 'top', ref: registerTopRow(index) })),
			centerRows: centerModelRows.map((row) => renderRow(row)),
			pinnedBottomRows: bottomRows.map((row, index) =>
				renderRow(row, { 'data-pinned': 'bottom', ref: registerBottomRow(index) }),
			),
			loadMoreFooter: <LoadMoreFooter />,
			refetchOverlay: showRefetchOverlay ? (
				<RefetchOverlayHost columnCount={table.getVisibleLeafColumns().length} />
			) : null,
		}
	}

	/** The parts in the order the built-in body renders them. */
	const composeParts = (parts: BodyParts<TRow>): ReactNode => (
		<>
			{parts.creatingRow}
			{parts.pinnedTopRows}
			{parts.centerRows}
			{parts.pinnedBottomRows}
			{parts.loadMoreFooter}
			{parts.refetchOverlay}
		</>
	)

	/**
	 * The render arguments, with every part behind a getter over one memoised {@link buildParts}.
	 *
	 * So a body that reads nothing but `rows` pays nothing, and one that reads any part pays for
	 * the single pass that produces all six. Note the caller must not be handed a spread of the
	 * parts — a spread evaluates every getter, which is the eagerness this exists to avoid.
	 */
	function buildArgs(): DataGridBodyRenderArgs<TRow> {
		let parts: BodyParts<TRow> | undefined
		const resolve = (): BodyParts<TRow> => (parts ??= buildParts())
		return {
			table,
			get rows() {
				return table.getRowModel().rows
			},
			get content() {
				return composeParts(resolve())
			},
			get creatingRow() {
				return resolve().creatingRow
			},
			get pinnedTopRows() {
				return resolve().pinnedTopRows
			},
			get centerRows() {
				return resolve().centerRows
			},
			get pinnedBottomRows() {
				return resolve().pinnedBottomRows
			},
			get loadMoreFooter() {
				return resolve().loadMoreFooter
			},
			get refetchOverlay() {
				return resolve().refetchOverlay
			},
		}
	}

	// Custom body: the consumer owns the whole `<tbody>`. Checked before every built-in
	// branch (virtualization, fallbacks), because those replace the body rather than fill it
	// — see the note on `children`. The parts are handed over, so owning the `<tbody>` no
	// longer means giving up what goes in it.
	if (children !== undefined) {
		if (typeof children !== 'function') return <Tbody data-slot='tbody'>{children}</Tbody>
		return <Tbody data-slot='tbody'>{children(buildArgs())}</Tbody>
	}

	if (rowVirtualizer) return <VirtualBody />

	const fallbacks = table.grid.fallbacks

	if (isPending && fallbacks.loading.enabled) {
		return <LoadingBody />
	}

	const allRows = table.getRowModel().rows
	const rawDataLength = (table.options.data as unknown[]).length

	if (!showCreatingRow && allRows.length === 0) {
		if (rawDataLength === 0 && fallbacks.empty.enabled) {
			return <EmptyStateRow />
		}
		if (rawDataLength > 0 && fallbacks.noResults.enabled) {
			return <NoResultsRow />
		}
	}

	return <Tbody data-slot='tbody'>{composeParts(buildParts())}</Tbody>
}
