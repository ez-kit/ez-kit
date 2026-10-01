import { RowMoveDirection } from '@ez-kit/data-grid-core'
import { forwardRef, useMemo } from 'react'

import { useGridComponents } from '../components-context'
import { joinClassNames } from '../utils/class-names'
import { mergeRefs } from '../utils/merge-refs'
import { getRowDropIndex } from '../utils/row-drop-order'
import { isTextEntryTarget } from '../utils/text-entry-target'

import { useAriaRowIndexAttrs } from './aria-row-index'
import { ariaExpandedAttrs } from './aria-state'
import { DataGridCell } from './cell'
import { RowProvider } from './composition-context'
import { DragAxis, DragSurface, useDndEnabled, useSortableItem } from './dnd'
import { ROW_DRAGGING_ATTR } from './dnd/dragging-attrs'
import { useRowNavigationProps } from './keyboard-navigation'
import { RowDragHandle } from './row-drag-handle'
import {
	useRegisterRowDrag,
	useRenderedRowIds,
	useReportActiveDraggingRow,
	useShouldReportUnpublishedRow,
} from './row-drag-registry'
import { useDataGridState, useDataGridTable } from './table-context'

import type { RowDragValue } from './row-drag-registry'
import type { ErasedRow, GridFeatures } from '../types'
import type { PinSide } from './use-pinned-row-offsets'
import type { RowPropsResolver } from '../use-data-grid'
import type { Row } from '@tanstack/table-core'
import type { CSSProperties, KeyboardEvent, ReactElement, ReactNode, Ref } from 'react'

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * What a `<DataGrid.Row>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.Row<Order>>` — and the render arguments are typed: `row.original` is an `Order`.
 * See {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
export type DataGridRowRenderArgs<TRow extends object = ErasedRow> = {
	row: Row<GridFeatures, TRow>
	/** The row's visible cells, in column order — already filtered by column visibility and pinning. */
	cells: ReturnType<Row<GridFeatures, TRow>['getVisibleCells']>
	/**
	 * The row's default cells — one `<DataGrid.Cell>` per entry of `cells`, keyed.
	 *
	 * So a custom row can add to the row rather than rebuild it: prepend a drag handle, append a
	 * spacer, wrap the lot. Mapping `cells` yourself stays the way to change what a *particular*
	 * cell renders; this is for the rows that only wanted something beside the defaults.
	 */
	content: ReactNode
	/**
	 * The row's drag handle, ready to place — or `null` when this row cannot be dragged (no adapter
	 * bound with `createDataGrid({ dnd })`, row ordering off, or a synthetic group row).
	 *
	 * An element rather than a ref, exactly as `sortTrigger` and `resizer` are on a header cell: a
	 * call site decides *where* it goes, never how it is wired. `<DataGrid.RowDragHandle />` is the
	 * same handle reached from inside a cell renderer instead.
	 */
	dragHandle: ReactNode
	/** True while this row is the one being dragged. `false` in a grid with no drag adapter. */
	isDragging: boolean
}

export type DataGridRowProps<TRow extends object = ErasedRow> = {
	row: Row<GridFeatures, TRow>
	style?: CSSProperties
	/** Forwarded to the kit's `Tr`; pinned rows are measured through it (see `usePinnedRowOffsets`). */
	ref?: Ref<HTMLTableRowElement>
	'data-pinned'?: PinSide
	'data-virtual'?: 'row'
	/**
	 * Custom cell content for this row, rendered inside the kit's `Tr` — so the row keeps its
	 * structural attributes, its pinning offset and its virtualization transform.
	 *
	 * Omit it for the built-in cells. Supply it to reorder, group or replace them without giving
	 * up the row itself, which a `<DataGrid.Body>` render function would have forced.
	 *
	 * @example
	 * ```tsx
	 * <DataGrid.Row row={row}>
	 *   {({ cells }) => cells.map((cell) => <DataGrid.Cell key={cell.id} cell={cell} row={row} />)}
	 * </DataGrid.Row>
	 * ```
	 *
	 * @example — keep the default cells and add to them
	 * ```tsx
	 * <DataGrid.Row row={row}>
	 *   {({ content }) => <>{content}<td data-slot='td' /></>}
	 * </DataGrid.Row>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridRowRenderArgs<TRow>) => ReactNode)
}

/**
 * The row's default cells, and the caller's `children` laid over them — the row-level twin of
 * `renderCellContent`.
 *
 * A static `children` returns before the cells are built, because it provably cannot place them.
 * A render function does not: it may, so the default is built and handed over, which costs an
 * array of React elements and no DOM if it turns out to drop them.
 */
function renderRowContent<TRow extends object>(
	children: DataGridRowProps<TRow>['children'],
	row: Row<GridFeatures, TRow>,
	cells: DataGridRowRenderArgs<TRow>['cells'],
	drag: RowDragValue | null,
): ReactNode {
	/**
	 * `content` behind a cached getter, which is what preserves the skip above now that a static
	 * child *can* reach it — through `useDataGridRow()`. The work went from "never done for a
	 * static child" to "done if that child asks", and a render function pays exactly what it did
	 * before. The cache is per call, so a body reading `content` twice builds one array.
	 */
	let built: ReactNode
	let isBuilt = false
	const args: DataGridRowRenderArgs<TRow> = {
		row,
		cells,
		// Built unconditionally — it is one element and renders `null` itself when `drag` is absent,
		// which keeps this object's shape the same for every row of every grid.
		dragHandle: drag ? <RowDragHandle rowId={row.id} /> : null,
		isDragging: drag?.isDragging ?? false,
		get content() {
			if (!isBuilt) {
				built = cells.map((cell) => (
					<DataGridCell
						key={cell.id}
						cell={cell}
						row={row}
					/>
				))
				isBuilt = true
			}
			return built
		},
	}

	const content = children === undefined ? args.content : typeof children === 'function' ? children(args) : children

	return <RowProvider value={args}>{content}</RowProvider>
}

/**
 * Renders a single table body row with all its cells.
 *
 * Emits structural data attributes:
 * - `data-slot="tr"` (identity)
 * - `data-row-id` (table row id)
 * - `data-row-selected="true"` while the row is selected
 * - `data-depth` (sub-row depth for expansion)
 * - `data-group-row="true"` on a synthetic group row
 * - `data-pinned="top" | "bottom"` for pinned rows (offset from `--dg-row-pin-offset`)
 * - `data-virtual="row"` for virtualized rows (positioned via runtime `transform`)
 * - `data-movable="true"` while row reordering is on
 * - `data-row-dragging="true"` while this row is the one being dragged
 *
 * Consumer props from `rowProps` are applied first, so those structural attributes always win;
 * `className` is the exception and is merged rather than overwritten.
 */
// `forwardRef`, not a `ref` prop: React 19 passes `ref` through props, React 18 strips it before
// the component sees it, and this package supports both. The generic is restored by the cast
// below — `forwardRef` erases type parameters, and `<DataGrid.Row<Order>>` has to keep working.

function DataGridRowImpl<TRow extends object = ErasedRow>(
	{ row, style, 'data-pinned': dataPinned, 'data-virtual': dataVirtual, children }: Omit<DataGridRowProps<TRow>, 'ref'>,
	ref: Ref<HTMLTableRowElement>,
) {
	const { Tr } = useGridComponents().core
	const table = useDataGridTable<TRow>()
	// A crossing back out of the erased world, and the mirror of the one `useDataGrid` makes
	// when it stores this resolver. `table.grid` is row-erased (see `ErasedRow`), so the stored
	// resolver is typed against `never`; the row we hold here is the very one the consumer wrote
	// it against, so re-instantiating it at `TRow` restores the type it had before erasure.
	const resolveRowProps = table.grid.rowProps as RowPropsResolver<TRow> | undefined
	// Selection state is derived, not read: a parent row counts as selected through its
	// children, which only TanStack knows. The selector therefore ignores its argument and
	// re-derives on every store change — it returns a boolean, so `useSyncExternalStore` bails
	// out unless *this* row's selectedness actually flipped, and the body (which deliberately
	// does not subscribe to `rowSelection`) keeps its narrow re-render.
	//
	// The attribute is `data-row-selected`, not the obvious `data-selected`, because React Aria
	// reserves that one: its `Row` writes `data-selected={state.isSelected || undefined}` as a
	// literal *after* spreading incoming props, so a kit built on RAC (heroui) always erases a
	// value passed from here — RAC's selection manager is idle, since the grid's selection lives
	// in TanStack. `data-row-*` is this layer's own namespace and nothing overwrites it.
	// Optional-called: this runs for every row of every grid, and the method only exists once
	// `rowSelectionFeature` is registered — so a grid with selection off could not render a row.
	// The system-column read in `cell.tsx` is genuinely conditional and needs no guard; this one
	// is not, which is why a sweep that looked at the selection path missed it.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isSelected = useDataGridState(() => row.getIsSelected?.() ?? false)

	/**
	 * `aria-selected` rides on the same state, and is written only for a row that *can* be
	 * selected: on a grid with no selection the attribute would announce every row as
	 * selectable and none as chosen. `enableRowSelection` is `hasSelection` in core, so the
	 * optional call answers both questions at once — feature registered, and selection
	 * configured.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const canSelect = row.getCanSelect?.() ?? false
	const ariaRowIndexAttrs = useAriaRowIndexAttrs(row)

	/**
	 * `aria-expanded`, for a tree row, a sub-content row, or any other row the table reports as
	 * expandable.
	 *
	 * Subscribed rather than read once: `getIsExpanded` answers from the `expanded` slice, and a
	 * row that is opened from anywhere other than its own chevron — a controlled `expanded` prop,
	 * an "expand all" control, a restored state snapshot — re-renders only because of this read.
	 * Both calls are optional: `rowExpandingFeature` is not structural, and this line runs for
	 * every row of every grid.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const canExpand = row.getCanExpand?.() ?? false
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isExpanded = useDataGridState(() => row.getIsExpanded?.() ?? false)

	/**
	 * `data-group-row` — this row is a synthetic group, not a record.
	 *
	 * Namespaced for the reason `data-row-selected` is: React Aria's `Row` writes its own
	 * `data-*` set after spreading what it was handed, so a name it already uses is erased in the
	 * heroui kit. Checked against that set — it writes `data-expanded`, `data-level`,
	 * `data-selected`, `data-placeholder` and friends, and nothing called `data-group-row`.
	 *
	 * Both kits' stylesheets target it, and so does every guard below that has to know a row is
	 * not a record — editing, deleting and the row actions have nothing to act on here.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isGroupRow = row.getIsGrouped?.() ?? false

	const canMove = table.grid.ordering.row

	/**
	 * The row's registration with the drag adapter.
	 *
	 * Called **unconditionally**, whatever the grid registered — it is a hook, and the port's no-op
	 * exists precisely so this line is the same line in a grid with no drag. What varies is
	 * `disabled`, and what it gates is whether the item can be picked up at all.
	 *
	 * `disabled` carries only what is knowable here: ordering switched off, and a synthetic group
	 * row, which is not a record and has nothing to reorder. Every other refusal — a pin band, a
	 * parent, an applied sort or grouping — is the drop helpers' business and is applied on release.
	 * That split is the PRD's boundary model: locked items are not draggable, and the rest is
	 * refused at the commit rather than signalled mid-drag.
	 *
	 * The index is this row's **position in the row model**, from `getRowDropOrder` — not `row.index`,
	 * which is a row's place among its parent's children in the *core* model and agrees with a
	 * rendered position only on page one of a flat, unfiltered grid. On page two the indices start at
	 * the page offset; under a filter the run has gaps; with tree rows a sub-row duplicates a
	 * top-level one. Each breaks the density `DragSpec.index` requires, and the failure is silent.
	 * That helper's docblock has the account, and `GridDndProvider` resolves a drop against the same
	 * list.
	 *
	 * Gated on the adapter first, which is a performance requirement rather than tidiness: the lookup
	 * scans the list once per row, so a grid with no drag — which is most grids — must not pay for it.
	 * The same *performance* gate `header-cell.tsx` puts in front of its own; what that file does with
	 * a `-1` is deliberately not the same, and the note below says why.
	 *
	 * **The `0` fallback is a known-imperfect last resort, and the honest account of it is this.** The
	 * list covers every row the built-in bodies render — the pinned bands included, which is why it is
	 * not `getRowModel().rows` — so `-1` needs a hand-written body rendering a `<DataGrid.Row>` for a
	 * row none of those lists contains. Such a row registers at `0`, and if another row already holds
	 * `0` that is a **duplicate**, which kills the axis exactly as a gap would. A negative index would
	 * be worse still. The clean answer is the header's: `header-cell.tsx` renders a *different
	 * component* for a non-participant so no sortable registers at all, and doing that here means
	 * splitting this component in two, which is a larger change than this fix. Recorded rather than
	 * papered over.
	 */
	const isDndEnabled = useDndEnabled()
	const publishedRowIds = useRenderedRowIds()
	const shouldReportUnpublishedRow = useShouldReportUnpublishedRow()
	const dropIndex = isDndEnabled ? getRowDropIndex(table, publishedRowIds, row.id) : 0
	/*
	 * A published list that does not contain this row is a **defect**, not a fallback case: a
	 * virtualized body publishes the window plus the row it is holding through a drag, so every row
	 * it renders is in it by construction. Before the row was held, this was the live path — the
	 * source unmounted mid-gesture, `indexOf` returned `-1`, `Math.max` clamped it to `0`, and the
	 * dragged row silently landed at the top of the grid instead of where it was dropped. Reported
	 * once per row so a regression is visible rather than arithmetic.
	 */
	if (IS_DEV && isDndEnabled && publishedRowIds !== null && dropIndex < 0 && shouldReportUnpublishedRow(row.id)) {
		console.error(
			`<DataGrid.Row> for row "${row.id}" is not in the list its body published, so it has no ` +
				'position in the drag index space and a drop involving it will resolve to the wrong row. ' +
				'A virtualized body must publish the window plus the row being dragged.',
		)
	}
	const isDraggable = isDndEnabled && canMove && !isGroupRow
	const sortable = useSortableItem({
		id: row.id,
		index: Math.max(dropIndex, 0),
		axis: DragAxis.Row,
		surface: DragSurface.Table,
		disabled: !isDraggable,
	})
	/*
	 * Everything downstream reads `drag`, never `sortable` directly — including the attribute. A
	 * row that cannot be picked up cannot be dragging, whatever an adapter reports for an item it
	 * was handed as `disabled`; reading the raw hook for the attribute let a grid with ordering off
	 * stamp it on every row.
	 *
	 * The attribute is `data-row-dragging`, **not** the obvious `data-dragging`, and for the reason
	 * `data-row-selected` is not `data-selected`: React Aria's `Row` writes its own `data-*` set
	 * *after* spreading the props it was handed, and `data-dragging` is one of its own — it supports
	 * dragging natively. In the heroui kit the value was therefore replaced by RAC's empty string,
	 * so the attribute was present and said nothing. `data-row-*` is this layer's namespace.
	 */
	const drag: RowDragValue | null = isDraggable
		? { handleRef: sortable.handleRef, isDragging: sortable.isDragging }
		: null
	/*
	 * Memoised over the two refs it joins: React calls a *changed* ref callback with `null` and
	 * then the node, so a fresh merge every render would detach and reattach both — re-registering
	 * the draggable in the middle of a gesture. See `mergeRefs`.
	 */
	useRegisterRowDrag(row.id, drag)
	/*
	 * Keeps a virtualized body rendering this row after the window has scrolled past it. Derived
	 * `drag`, never `sortable`, so a row the grid refused cannot pin itself active — DRAG_STATE_IS_
	 * DERIVED_NOT_RAW, the same rule the attribute above follows.
	 */
	useReportActiveDraggingRow(row.id, drag?.isDragging ?? false)
	const sortableRef = sortable.ref
	const rowRef = useMemo(() => mergeRefs<HTMLTableRowElement>(ref, sortableRef), [ref, sortableRef])

	/**
	 * `Alt+ArrowUp` / `Alt+ArrowDown` move the row one step.
	 *
	 * On the `<tr>`, reached by bubbling from whatever inside the row has focus — the selection
	 * checkbox, an inline action button, the overflow trigger. Same arrangement the header uses,
	 * where the handler sits on the `<th>` and is reached from the sort affordance's
	 * `tabIndex={0}`: no roving tabindex and no focus model of the grid's own.
	 *
	 * The menu entries are the discoverable affordance, but both kits' menus close on select, so
	 * a row travelling five places would mean five open-click cycles. This is the repeatable
	 * path, and the keyboard equivalent WCAG 2.1.1 asks of a drag handle anyway.
	 *
	 * Note it reaches the row only in a kit whose `Tr` forwards `onKeyDown`. React Aria's `Row`
	 * does not — the same upstream constraint that keeps `Alt+Arrow` column reordering out of
	 * the heroui kit (#223) — so there the menu entries are the whole affordance.
	 */
	const onRowKeyDown = canMove
		? (e: KeyboardEvent<HTMLTableRowElement>) => {
				if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
				/*
				 * This row is being dragged, **by any means**: the drag owns it until it is
				 * dropped, and reordering it from under a live gesture is not something to offer
				 * as an alternative — the position the user is dragging towards is the one that
				 * counts, and moving the row underneath invalidates it.
				 *
				 * During a *keyboard* drag that also removes a genuine double-move: dnd-kit's
				 * sensor takes the same arrows, so one press moved the row twice, once per handler.
				 * During a *pointer* drag the sensor is idle for keystrokes
				 * (`@dnd-kit/dom@0.1.21`, `index.js:1611` — it refuses while an operation is
				 * non-idle), so the chord is simply dropped, and that is the accepted trade rather
				 * than an oversight.
				 *
				 * It has to be here rather than in the grid's focus model, which also stands down
				 * on a drag: this handler is on the `<tr>`, below the element that one listens on,
				 * so it has already acted by the time the event bubbles up there.
				 *
				 * Derived `drag`, never `sortable` — DRAG_STATE_IS_DERIVED_NOT_RAW, the rule
				 * `data-row-dragging` and `useReportActiveDraggingRow` above both follow.
				 */
				if (drag?.isDragging === true) return
				// Only a control that owns `Alt+Arrow` keeps it — a text field moving by word, a
				// native select opening. A checkbox or a button does not, and a row has nothing
				// else to focus, so a predicate counting those would refuse every event here.
				if (isTextEntryTarget(e)) return
				const direction = e.key === 'ArrowUp' ? RowMoveDirection.Up : RowMoveDirection.Down
				if (!table.ordering.canMoveRow(row.id, direction)) return
				e.preventDefault()
				table.ordering.moveRow(row.id, direction)
			}
		: undefined
	const navigationProps = useRowNavigationProps()
	const { className: consumerClassName, style: consumerStyle, ...consumerProps } = resolveRowProps?.(row) ?? {}
	const cells = row.getVisibleCells()

	return (
		<Tr
			{...consumerProps}
			{...navigationProps}
			ref={rowRef}
			data-slot='tr'
			data-row-id={row.id}
			data-row-selected={isSelected ? 'true' : undefined}
			data-group-row={isGroupRow ? 'true' : undefined}
			{...(canSelect ? { 'aria-selected': isSelected } : {})}
			{...ariaRowIndexAttrs}
			{...ariaExpandedAttrs(canExpand, isExpanded)}
			data-depth={row.depth > 0 ? row.depth : undefined}
			style={consumerStyle !== undefined || style !== undefined ? { ...consumerStyle, ...style } : undefined}
			className={joinClassNames(consumerClassName)}
			data-pinned={dataPinned}
			data-virtual={dataVirtual}
			{...(onRowKeyDown ? { onKeyDown: onRowKeyDown } : {})}
			{...(canMove ? { 'data-movable': 'true' } : {})}
			{...(drag?.isDragging ? { [ROW_DRAGGING_ATTR]: 'true' } : {})}
		>
			{renderRowContent(children, row, cells, drag)}
		</Tr>
	)
}

/**
 * `forwardRef` erases the generic, so the exotic component is cast back to the generic call
 * signature it was written with. `DataGridRowProps` keeps `ref` in props — that is how a React 19
 * consumer reads it, and a React 18 one passes `ref` the same way at the call site.
 */
export const DataGridRow = forwardRef(DataGridRowImpl) as <TRow extends object = ErasedRow>(
	props: DataGridRowProps<TRow>,
) => ReactElement | null
