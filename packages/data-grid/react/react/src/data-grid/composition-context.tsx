import { createContext, useContext } from 'react'

import type { DataGridCellRenderArgs } from './cell'
import type { DataGridHeaderCellRenderArgs } from './header-cell'
import type { DataGridRowRenderArgs } from './row'
import type { ErasedRow } from '../types'
import type { ReactNode } from 'react'

/**
 * **The three composition nodes, as contexts.**
 *
 * Each one carries exactly the object its component already hands to a render function — the
 * same `DataGridHeaderCellRenderArgs` / `DataGridRowRenderArgs` / `DataGridCellRenderArgs`, not a
 * parallel shape. A render function is now "the hook, called for you": the component builds the
 * object once and both publishes it here and passes it as the argument.
 *
 * **Why a context and not a store.** These hold *identity* — which header, which row, which cell
 * — and identity is positional: it exists only inside the map that produced it, and it changes
 * exactly when that map re-runs. A store earns its keep when a value changes more often than the
 * tree is rebuilt (that is what `table.store` is for, and why grid *state* is read through
 * {@link useDataGridState} rather than from here). Here the two move in the same tick, so a store
 * would cost a subscription per node and save no render: the children of a re-rendering component
 * re-render through the element tree regardless of how they learn which node they are in. The
 * package memoizes none of them — `<DataGrid.Header>` owns the subscriptions and re-renders its
 * cells together, deliberately.
 *
 * So the division is: state → atoms (`useDataGridState`), identity → these contexts, and the
 * ready-made pieces (`sortTrigger`, `content`, …) → built during render, never stored, because
 * they are elements resolved from `useGridComponents()` and a kit may be swapped per grid.
 */

/** Thrown shape shared by the three hooks, so the message names the component to render inside. */
function useNode<T>(context: React.Context<T | null>, hook: string, component: string): T {
	const value = useContext(context)
	if (value === null) {
		throw new Error(`${hook}() must be called inside <${component}>.`)
	}
	return value
}

type ErasedHeaderCell = DataGridHeaderCellRenderArgs
type ErasedRowNode = DataGridRowRenderArgs
type ErasedCell = DataGridCellRenderArgs

const HeaderCellContext = createContext<ErasedHeaderCell | null>(null)
const RowContext = createContext<ErasedRowNode | null>(null)
const CellContext = createContext<ErasedCell | null>(null)

/**
 * The row type stops at each provider, exactly as it stops at `TableProvider` — a context takes
 * no type parameter, and v9's row types are invariant in `TRow`, so both sides are casts rather
 * than assignments. See {@link ErasedRow}. The hooks are the mirror: each casts back out to the
 * row type its caller names.
 */
export function HeaderCellProvider<TRow extends object>({
	value,
	children,
}: {
	value: DataGridHeaderCellRenderArgs<TRow>
	children: ReactNode
}) {
	return (
		<HeaderCellContext.Provider value={value as unknown as ErasedHeaderCell}>{children}</HeaderCellContext.Provider>
	)
}

export function RowProvider<TRow extends object>({
	value,
	children,
}: {
	value: DataGridRowRenderArgs<TRow>
	children: ReactNode
}) {
	return <RowContext.Provider value={value as unknown as ErasedRowNode}>{children}</RowContext.Provider>
}

export function CellProvider<TRow extends object>({
	value,
	children,
}: {
	value: DataGridCellRenderArgs<TRow>
	children: ReactNode
}) {
	return <CellContext.Provider value={value as unknown as ErasedCell}>{children}</CellContext.Provider>
}

/**
 * The header cell this component is rendering in — the same object a `<DataGrid.HeaderCell>`
 * render function receives.
 *
 * It is what makes a header cell's body a **component rather than a callback**: a render function
 * can only be written at the `<DataGrid.HeaderCell>` call site, because its parts arrive as
 * arguments, so a layout that customises the header had to inline its whole header cell. Reading
 * the same parts from here, the body moves into a file of its own and takes no props.
 *
 * Does **not** subscribe to grid state. `<DataGrid.Header>` owns those subscriptions and
 * re-renders its cells; pair this with {@link useDataGridState} for anything it does not carry.
 *
 * The row type cannot be recovered from context, so it is a caller-supplied parameter:
 * `useDataGridHeaderCell<Order>()` types `header` and `column`.
 *
 * **Unavailable in the selection column's header**, which renders a select-all checkbox rather
 * than a composed cell and so has no sort affordance, menu or filter to hand back. A component
 * placed there through `selection.column.header` must not call this.
 *
 * @example A header cell body, as a component
 * ```tsx
 * function OrdersHeaderCell() {
 *   const { sortTrigger, filterPopover, menu } = useDataGridHeaderCell()
 *   return <DataGrid.HeaderMain>{sortTrigger}{filterPopover}{menu}</DataGrid.HeaderMain>
 * }
 * ```
 */
export function useDataGridHeaderCell<TRow extends object = ErasedRow>(): DataGridHeaderCellRenderArgs<TRow> {
	return useNode(
		HeaderCellContext,
		'useDataGridHeaderCell',
		'DataGrid.HeaderCell',
	) as unknown as DataGridHeaderCellRenderArgs<TRow>
}

/**
 * The row this component is rendering in — the same object a `<DataGrid.Row>` render function
 * receives, `content` included, so a custom row body can wrap the default cells instead of
 * rebuilding them.
 *
 * `content` is built **on first read**, which is what lets a static child reach it at all: the
 * row deliberately skips building its cells when `children` is not a function, and that used to
 * be provably safe because a static child had no way to place them. This hook is that way, so the
 * work moved from "skipped" to "deferred" rather than becoming unconditional.
 *
 * @example
 * ```tsx
 * function OrdersRow() {
 *   const { row, content } = useDataGridRow<Order>()
 *   return <>{content}<td data-slot='td'>{row.original.note}</td></>
 * }
 * ```
 */
export function useDataGridRow<TRow extends object = ErasedRow>(): DataGridRowRenderArgs<TRow> {
	return useNode(RowContext, 'useDataGridRow', 'DataGrid.Row') as unknown as DataGridRowRenderArgs<TRow>
}

/**
 * The body cell this component is rendering in — the same object a `<DataGrid.Cell>` render
 * function receives.
 *
 * `content` is whatever this cell would have rendered on its own, already resolved for its
 * **current** state: the inline editor while it is being edited, the selection checkbox or expand
 * chevron on a system column, the cell type's `view` otherwise. So a wrapper component keeps all
 * of that instead of reimplementing it.
 *
 * @example
 * ```tsx
 * function HighlightedCell() {
 *   const { value, content } = useDataGridCell()
 *   return <span data-flagged={value === null || undefined}>{content}</span>
 * }
 * ```
 */
export function useDataGridCell<TRow extends object = ErasedRow>(): DataGridCellRenderArgs<TRow> {
	return useNode(CellContext, 'useDataGridCell', 'DataGrid.Cell') as unknown as DataGridCellRenderArgs<TRow>
}
