import {
	ACTIONS_COLUMN_ID,
	CommitStatus,
	EditingMode,
	EXPAND_COLUMN_ID,
	GROUP_COLUMN_ID,
	SELECTION_COLUMN_ID,
} from '@ez-kit/data-grid-core'
import { useEffect } from 'react'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { resolveCellClassName } from '../utils/class-names'
import { getCommonPinStyles } from '../utils/pin-styles'

import { ActionsCell } from './actions-cell'
import { getAlignAttrs } from './align-attrs'
import { CellProvider } from './composition-context'
import { flexRender } from './flex-render'
import { useCellNavigationProps } from './keyboard-navigation'
import { useDataGridTable, useDataGridState } from './table-context'
import { columnNameOf, VisuallyHiddenLabel } from './visually-hidden'

import type { CellTypeRegistry, CellViewProps } from '../cell-types-context'
import type { ErasedRow, GridFeatures } from '../types'
import type { FormColumnMeta, ColumnAlign, ColumnPinSide, FieldState } from '@ez-kit/data-grid-core'
import type { ColumnMeta, Cell, Row } from '@tanstack/table-core'
import type { ComponentType, CSSProperties, ReactNode } from 'react'

/**
 * What a `<DataGrid.Cell>` render function receives.
 *
 * `TRow` defaults to `any` so nothing has to name it. Write it once at the call site —
 * `<DataGrid.Cell<Order>>` — and the render arguments are typed: `row.original` is an `Order`.
 * See {@link DataGridBodyRenderArgs} for why it is explicit rather than inferred.
 */
export type DataGridCellRenderArgs<TRow extends object = ErasedRow> = {
	cell: Cell<GridFeatures, TRow>
	row: Row<GridFeatures, TRow>
	/** The cell's value, already resolved through the column's accessor. */
	value: unknown
	/**
	 * What this cell would have rendered on its own — so a custom cell can wrap the default
	 * instead of reimplementing it.
	 *
	 * Resolved for the cell's **current** state, not just its view renderer: the inline editor
	 * while this cell is being edited, the selection checkbox or expand chevron on a system
	 * column, the cell type's `view` otherwise, and TanStack's own `columnDef.cell` when the
	 * column registered no type at all. Every lookup `cell.component` / `cell.type` /
	 * `editing.component` feeds is already applied.
	 *
	 * This mirrors {@link DataGridHeaderCellRenderArgs}, which has handed back `label`,
	 * `sortTrigger`, `menu`, `filter` and `resizer` since the header cell gained a render
	 * function. A body cell has one part rather than five, so it is one field.
	 */
	content: ReactNode
}

export type DataGridCellProps<TRow extends object = ErasedRow> = {
	cell: Cell<GridFeatures, TRow>
	row: Row<GridFeatures, TRow>
	/**
	 * Custom content for this one cell, rendered inside the kit's `Td` — so the cell keeps its
	 * pinning offset, its `data-*` attributes and its `cellClassName`.
	 *
	 * Omit it for the built-in content: the cell-type renderer, the inline editor, the system
	 * column controls. Supply it to replace just the content of one cell — or, in the
	 * render-function form, to **wrap** it: `content` in {@link DataGridCellRenderArgs} is
	 * whatever this cell would have rendered, already resolved for its current state.
	 *
	 * A column-wide override belongs on the column instead (`cell.component`), which also feeds
	 * the create and edit forms; this is for a single cell in a hand-composed row.
	 *
	 * @example — wrap the default rather than replace it
	 * ```tsx
	 * <DataGrid.Cell cell={cell} row={row}>
	 *   {({ content, value }) => <Tooltip title={String(value)}>{content}</Tooltip>}
	 * </DataGrid.Cell>
	 * ```
	 */
	children?: ReactNode | ((args: DataGridCellRenderArgs<TRow>) => ReactNode)
}

/** The chrome a body cell wears regardless of what it renders: pin offsets, alignment, class. */
type CellChrome = {
	/**
	 * The grid role and the roving tab stop, when the kit asked for the package's focus model.
	 * Empty otherwise, so a kit that manages focus itself renders the DOM it always did.
	 *
	 * Part of the chrome for the same reason `classNameAttr` is: five branches render a `<Td>`
	 * and every one of them needs it, and the two that resolved their own class are exactly the
	 * bug that note records.
	 */
	navigation: { role?: string; tabIndex?: number }
	pinVars: CSSProperties
	pinned: false | ColumnPinSide
	pinnedAttrs: { 'data-pinned'?: ColumnPinSide }
	alignAttrs: { 'data-align'?: ColumnAlign }
	/**
	 * The column's resolved `cellClassName`, as a spreadable attribute.
	 *
	 * Part of the chrome rather than computed per branch because it is a property of the
	 * *column*, like the pin offset beside it. It used to be resolved in two of the four places
	 * a `Td` is rendered — the view cell and the since-removed custom-content cell — so a system
	 * column's `cellClassName` (a documented field of `SystemColumnDef`) reached the DOM only
	 * when the consumer happened to supply custom cell content, and an edited cell dropped the
	 * column's class for as long as it stayed open.
	 */
	classNameAttr: { className?: string }
}

const EMPTY_ERRORS: readonly string[] = Object.freeze([])

/** Marks the one cell currently open for editing, so a pointer or focus event can be placed. */
const EDITING_CELL_ATTR = 'data-editing-cell'

/**
 * Layers a kit renders in a portal on the editor's behalf — a select's listbox, a date picker's
 * dialog. They sit outside the cell in the DOM while belonging to it, so interacting with one must
 * not read as leaving the edit. Covers react-aria (heroui) and radix (shadcn) overlays alike.
 */
const OVERLAY_SELECTOR = '[role="dialog"], [role="listbox"], [role="menu"], [data-radix-popper-content-wrapper]'

/** What an opened cell hands the caret to. Ordered by document position, so the first one wins. */
const FOCUSABLE_SELECTOR = 'input, select, textarea, button, [contenteditable="true"], [tabindex]:not([tabindex="-1"])'

/**
 * Renders a single table body cell.
 *
 * Dispatches to:
 * - {@link SystemCell} — for the three system columns: selection, expand, actions
 *   (row pinning has no column of its own — its menu lives in the actions one)
 * - {@link BodyDataCell} — for regular data columns (with narrow editing subscription)
 *
 * Emits `data-slot="td"` plus `data-pinned="start" | "end"` for pinned columns;
 * pin offsets are written as CSS custom properties via {@link getCommonPinStyles}.
 * The structural stylesheet shipped with this package applies the actual
 * `position: sticky` + offsets.
 */

export function DataGridCell<TRow extends object = ErasedRow>({ cell, row, children }: DataGridCellProps<TRow>) {
	const meta = cell.column.columnDef.meta
	// `children` is forwarded rather than diverted to a branch of its own. A cell's content is
	// decided by which branch renders it — system control, inline editor, view renderer — and
	// only that branch knows both what the default content is and which attributes its `Td`
	// must wear (`data-error` and `data-editing-cell` on an open editor, `data-system-column`
	// on a system one). Intercepting here, as this used to, meant a custom cell silently lost
	// those attributes and could not reach the default content at all.
	if (meta?.isSystemColumn) {
		return (
			<SystemCell
				cell={cell}
				row={row}
			>
				{children}
			</SystemCell>
		)
	}
	return (
		<BodyDataCell
			cell={cell}
			row={row}
		>
			{children}
		</BodyDataCell>
	)
}

// ── system columns ──────────────────────────────────────────────────────────

function SystemCell<TRow extends object>({ cell, row, children }: DataGridCellProps<TRow>) {
	const columnId = cell.column.id
	const chrome = useCellChrome(cell)
	const { Td } = useGridComponents().core

	if (columnId === SELECTION_COLUMN_ID) {
		return (
			<SelectionCell
				cell={cell}
				row={row}
				chrome={chrome}
			>
				{children}
			</SelectionCell>
		)
	}
	if (columnId === EXPAND_COLUMN_ID) {
		return (
			<ExpandCell
				cell={cell}
				row={row}
				chrome={chrome}
			>
				{children}
			</ExpandCell>
		)
	}
	if (columnId === GROUP_COLUMN_ID) {
		return (
			<GroupCell
				cell={cell}
				row={row}
				chrome={chrome}
			>
				{children}
			</GroupCell>
		)
	}
	if (columnId === ACTIONS_COLUMN_ID) {
		return (
			<Td
				{...chrome.navigation}
				data-slot='td'
				style={chrome.pinVars}
				pinned={chrome.pinned}
				{...chrome.pinnedAttrs}
				{...chrome.alignAttrs}
				{...chrome.classNameAttr}
				data-system-column='actions'
			>
				{renderCellContent(
					children,
					cell,
					row,
					/*
					 * A crossing into the erased world. `ActionsCell` lives entirely below the boundary
					 * — it reads the table from context and renders the kit's `rowActions` component,
					 * both of which are row-erased (see `ErasedRow`) — so its row prop is erased too,
					 * and v9's invariance makes handing it a `Row<F, TRow>` a cast rather than an
					 * assignment. Erasing here costs one assertion; typing `ActionsCell` at `TRow`
					 * instead moved the same crossing onto its four kit-contract render sites.
					 */
					<ActionsCell row={row as unknown as Row<GridFeatures, ErasedRow>} />,
				)}
			</Td>
		)
	}
	return null
}

type SystemSubProps<TRow extends object> = DataGridCellProps<TRow> & {
	chrome: CellChrome
}

function SelectionCell<TRow extends object>({ cell, row, chrome, children }: SystemSubProps<TRow>) {
	const { Td, Checkbox } = useGridComponents().core
	const { messages } = useDataGridTable().grid
	// Subscribe broadly to rowSelection so row.getIsSelected() / getIsSomeSelected()
	// re-derive correctly. Refining this to per-row keys breaks indeterminate
	// state for parent rows (which depends on children).
	useDataGridState((s) => s.rowSelection)
	const isSelected = row.getIsSelected()
	const isIndeterminate = typeof row.getIsSomeSelected === 'function' ? row.getIsSomeSelected() : undefined
	return (
		<Td
			{...chrome.navigation}
			data-slot='td'
			style={chrome.pinVars}
			pinned={chrome.pinned}
			{...chrome.pinnedAttrs}
			{...chrome.alignAttrs}
			{...chrome.classNameAttr}
		>
			{renderCellContent(
				children,
				cell,
				row,
				<Checkbox
					value={isSelected}
					{...(isIndeterminate !== undefined ? { indeterminate: isIndeterminate } : {})}
					onChange={() => {
						row.toggleSelected()
					}}
					aria-label={messages.selection.selectRow}
				/>,
			)}
		</Td>
	)
}

function ExpandCell<TRow extends object>({ cell, row, chrome, children }: SystemSubProps<TRow>) {
	const gridComponents = useGridComponents()
	const { Td } = gridComponents.core
	const { Chevron } = gridComponents.expanding
	// Subscribe broadly to expanded so derived row.getIsExpanded() re-renders.
	useDataGridState((s) => s.expanded)
	const canExpand = row.getCanExpand()
	const isExpanded = row.getIsExpanded()
	return (
		<Td
			{...chrome.navigation}
			data-slot='td'
			style={chrome.pinVars}
			pinned={chrome.pinned}
			{...chrome.pinnedAttrs}
			{...chrome.alignAttrs}
			{...chrome.classNameAttr}
			data-system-column='expand'
			data-depth={row.depth}
		>
			{renderCellContent(
				children,
				cell,
				row,
				canExpand ? (
					<Chevron
						expanded={isExpanded}
						onClick={() => {
							row.toggleExpanded()
						}}
					/>
				) : null,
			)}
		</Td>
	)
}

/**
 * The `__group__` cell — a group row's label, how many rows it holds, and its chevron.
 *
 * **Composed, not a contract slot.** There is no `GroupCell` in `FEATURE_COMPONENTS` and none is
 * planned: this is `core.Td`, the existing `expanding.Chevron` and text, and a kit styles it
 * through `data-slot='group-cell'` + `data-system-column='group'` the way it styles every other
 * system cell. A slot added later is a minor; a slot added now and regretted is a major.
 *
 * The chevron is the **expanding** group's, which is why a grid that groups must register
 * `rowExpandingFeature`: a group row is a row with `subRows`, and `row.toggleExpanded()` is what
 * opens it. One control serves both meanings with no branching — on a group row it opens the
 * children, on a leaf row in sub-content mode it opens the detail panel.
 *
 * A leaf row renders an empty cell here rather than `null`: the column is part of the grid's
 * column track, so the `<td>` has to exist or every cell to its right shifts one place left on
 * that row.
 */
function GroupCell<TRow extends object>({ cell, row, chrome, children }: SystemSubProps<TRow>) {
	const gridComponents = useGridComponents()
	const { Td } = gridComponents.core
	const { Chevron } = gridComponents.expanding
	const { messages } = useDataGridTable().grid
	// Subscribed for the reason `ExpandCell` subscribes: `getIsExpanded` answers from the
	// `expanded` slice, and a group opened from anywhere but its own chevron re-renders only
	// because of this read.
	useDataGridState((s) => s.expanded)
	// Every read below is optional-called. This runs for **every row of every grid** that has a
	// `__group__` column, and `columnGroupingFeature` is not structural — see the FEATURE GUARDS
	// note in `types.ts`. Do not "tidy up" the disables: they read as unnecessary only because
	// the widest instantiation says the method is always there.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isGrouped = row.getIsGrouped?.() ?? false

	if (!isGrouped) {
		return (
			<Td
				{...chrome.navigation}
				data-slot='group-cell'
				style={chrome.pinVars}
				pinned={chrome.pinned}
				{...chrome.pinnedAttrs}
				{...chrome.alignAttrs}
				{...chrome.classNameAttr}
				data-system-column='group'
				data-depth={row.depth}
			/>
		)
	}

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const canExpand = row.getCanExpand?.() ?? false
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isExpanded = row.getIsExpanded?.() ?? false
	// Counted through `subRows`, never off the render model: `getRowModel().rows` is render order
	// and mixes group rows with leaf rows, which upstream flags as the commonest grouping mistake.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const count = row.getLeafRows?.().length ?? 0
	const label = groupLabelOf(row.groupingValue, messages.grouping.blank)

	return (
		<Td
			{...chrome.navigation}
			data-slot='group-cell'
			style={chrome.pinVars}
			pinned={chrome.pinned}
			{...chrome.pinnedAttrs}
			{...chrome.alignAttrs}
			{...chrome.classNameAttr}
			data-system-column='group'
			data-depth={row.depth}
		>
			{renderCellContent(
				children,
				cell,
				row,
				<>
					{canExpand ? (
						<Chevron
							expanded={isExpanded}
							onClick={() => {
								row.toggleExpanded()
							}}
						/>
					) : null}
					<span data-slot='group-label'>{label}</span>
					<span data-slot='group-count'>{messages.grouping.count({ count })}</span>
				</>,
			)}
		</Td>
	)
}

/**
 * A group's label, as text.
 *
 * `null`, `undefined` and `''` all become the dictionary's "blank" wording rather than an empty
 * cell: such rows are grouped rather than dropped, so the group needs a name, and a count beside
 * nothing reads as a rendering bug. Anything else is stringified — a grouping value is whatever
 * the column's accessor or `grouping.getValue` returned, so it has no type to render through.
 */
function groupLabelOf(value: unknown, blank: string): string {
	if (value === null || value === undefined || value === '') return blank

	return String(value)
}

// ── data columns ────────────────────────────────────────────────────────────

function BodyDataCell<TRow extends object>({ cell, row, children }: DataGridCellProps<TRow>) {
	const table = useDataGridTable()
	const { Td } = useGridComponents().core
	const cellTypes = useCellTypes()
	const columnId = cell.column.id
	const meta = cell.column.columnDef.meta
	const chrome = useCellChrome(cell)

	const editMode: EditingMode = table.options.editing?.mode ?? EditingMode.Row
	const cellId = `${row.id}_${columnId}`

	// Narrow boolean subscription. For non-target rows this remains stably `false`
	// across any `editing` mutation → no re-render. Flips exactly once on
	// start / cancel / commit of THIS row (or cell in cell-mode).
	//
	// `modal` never opens a cell. The dialog already holds the whole row's fields, and the
	// feature sets the same `editing.rowId` whichever mode raised it — so a row-mode test here
	// used to open the row *behind* the dialog as well, leaving two live editors bound to one
	// set of values. shadcn hid it (Radix `aria-hidden`s the background), heroui did not.
	// Optional-chained: this selector runs for **every body cell of every grid**, before anything
	// establishes that editing is configured, so a read-only grid needed `editingFeature`
	// registered just to render a cell. Nothing below it is reached when the slice is absent —
	// `isEditing` is `false`, so the editing branch never opens. See `feature-optionality.test.tsx`.
	const isEditing = useDataGridState((s) => {
		if (editMode === EditingMode.Modal) return false
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
		return editMode === EditingMode.Cell ? s.editing?.cellId === cellId : s.editing?.rowId === row.id
	})

	const isColumnEditable = meta?.editing !== false

	/*
	 * A **static** `children` is a full opt-out of editing, where a render function is not.
	 *
	 * The two forms differ in one way that matters here: a function receives the editor as
	 * `content` and decides where to put it, while a node cannot receive anything. Letting a
	 * static node into the edit path renders it *instead of* the editor, and the cell then wears
	 * `data-editing-cell`, installs the document-level Enter / Escape / pointer listeners that
	 * commit a cell edit, finds nothing to focus, and commits when the pointer lands elsewhere —
	 * all while looking exactly as before. `editing: false` on the column already expresses the
	 * same opt-out; this is the per-cell spelling of it.
	 *
	 * It is checked here rather than in `DataGridCell` because it is a statement about the
	 * editing path alone: a static node on a *system* column still renders, and so does one on a
	 * column with no editing configured, which is the overwhelmingly common case.
	 */
	const isStaticContent = children !== undefined && typeof children !== 'function'

	if (isEditing && isColumnEditable && !isStaticContent) {
		return (
			<EditingCell
				cell={cell}
				row={row}
				editMode={editMode}
				cellId={cellId}
				chrome={chrome}
			>
				{children}
			</EditingCell>
		)
	}

	/*
	 * ── the two group-row modes ───────────────────────────────────────────────
	 *
	 * Upstream describes four cell modes and warns against conflating them. Two of the four never
	 * reach here, both for the same reason: `groupedColumnMode: 'remove'` takes a grouped column
	 * out of the list while it is grouped, because `__group__` already carries its value — so
	 * there is no grouped cell and no placeholder cell either (see the note on that branch). What
	 * is left is the aggregated cell and the ordinary one, and a cell on a group row whose column
	 * is neither, which falls through to the view branch and finds `getValue()` `undefined`.
	 *
	 * Both reads are optional-called and both run for every body cell of every grid — see the
	 * FEATURE GUARDS note in `types.ts`. Checked **before** the view branch rather than inside
	 * it, because what a group row's cell shows is a different question from how a value is
	 * rendered, and the placeholder case has no value to render at all.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isUpstreamAggregated = cell.getIsAggregated?.() ?? false
	// Upstream's answer is gated on a **resolvable aggregation function**
	// (`column_getAggregationFns(column).some((e) => !!e.aggregationFn)`), which a server-grouped
	// column does not have and does not want: its subtotal is a field the server put on the group
	// row. Without this second arm, `aggregation.component` and `data-aggregated-cell` would both
	// go missing on exactly the grids that supply their own numbers — while the value rendered
	// anyway, through the ordinary view branch, so nothing would look broken.
	//
	// It reads `row.getIsGrouped()`, which is not a second notion of what a group row is: the
	// manual row model sets `groupingColumnId`, so that method is authoritative in both modes.
	// Under CLIENT grouping, a column on a group row with no aggregate of any kind is unaffected
	// — `getValue()` is `undefined` there, which is what the `!== undefined` clause keeps out.
	// Under SERVER grouping there is no such guarantee: the group row carries whatever fields the
	// server sent, so a non-aggregate field with a defined value — an empty string, say — reads as
	// a subtotal here. The remedy is for the response to omit the field, not for the grid to guess;
	// `''` and `0` are both valid subtotals (a real aggregate can legitimately be zero), so there is
	// no value this clause could exclude without also excluding a correct one.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isGroupRow = row.getIsGrouped?.() ?? false
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isGroupedColumn = cell.column.getIsGrouped?.() ?? false
	const isAggregated = isUpstreamAggregated || (isGroupRow && !isGroupedColumn && cell.getValue() !== undefined)
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isPlaceholder = cell.getIsPlaceholder?.() ?? false

	if (isAggregated) {
		return (
			<AggregatedCell
				cell={cell}
				row={row}
				chrome={chrome}
			>
				{children}
			</AggregatedCell>
		)
	}

	/*
	 * A placeholder renders **nothing**.
	 *
	 * Upstream's `getIsPlaceholder()` is narrower than "any cell on a group row with no value of
	 * its own": it is `!cell.getIsGrouped() && cell.column.getIsGrouped()` — a cell of a **grouped
	 * column** on a row that is not that column's own group row. Under `groupedColumnMode:
	 * 'remove'`, which core sets, a grouped column is taken out of the list entirely, so no such
	 * cell is rendered and **this branch is currently unreachable**. Measured, not assumed.
	 *
	 * It stays, for two reasons. It costs one optional call, and it is what keeps this component
	 * correct if `groupedColumnMode` ever becomes something a consumer can change — the mode is a
	 * value core writes, not a law of the grid. The case the spec worried about, a non-aggregated
	 * column showing one arbitrary row's datum beside a subtotal, is handled a level down instead:
	 * `cell.getValue()` is `undefined` on such a cell, so the view branch renders nothing. That is
	 * what `shows no leaf datum for a column that is neither grouped nor aggregated` asserts, and
	 * asserting it there rather than here is deliberate — it tests the guarantee rather than the
	 * mechanism this branch happens to provide.
	 *
	 * The `<td>` itself still renders — it is part of the column track, and dropping it would
	 * shift every cell to its right one place left on that row.
	 */
	if (isPlaceholder) {
		return (
			<Td
				{...chrome.navigation}
				data-slot='td'
				style={chrome.pinVars}
				pinned={chrome.pinned}
				{...chrome.pinnedAttrs}
				{...chrome.alignAttrs}
				{...chrome.classNameAttr}
				data-placeholder-cell='true'
			/>
		)
	}

	// ── normal view cell ───────────────────────────────────────────────────────
	// `editing: false` opts a column out at every mode, cell mode included: it used to be
	// bypassed here, so a read-only column still became an input on double-click.
	const handleDoubleClick =
		editMode === EditingMode.Cell && isColumnEditable && !isStaticContent
			? () => {
					table.editing.startCell(row.id, columnId)
				}
			: undefined

	const viewComp = resolveViewComponent(meta, cellTypes)

	return (
		<Td
			{...chrome.navigation}
			data-slot='td'
			style={chrome.pinVars}
			pinned={chrome.pinned}
			{...chrome.pinnedAttrs}
			{...chrome.alignAttrs}
			{...chrome.classNameAttr}
			onDoubleClick={handleDoubleClick}
		>
			{renderCellContent(
				children,
				cell,
				row,
				viewComp
					? flexRender(viewComp, {
							// `cell` is row-type-erased here, so `getValue()` and `row.original` are both
							// `any`. The view contract says `unknown` — narrow once, at the boundary.
							value: cell.getValue<unknown>(),
							row: cell.row.original as unknown,
							rowIndex: cell.row.index,
							...(meta?.cell?.config !== undefined ? { config: meta.cell.config } : {}),
						})
					: flexRender(cell.column.columnDef.cell, cell.getContext()),
			)}
		</Td>
	)
}

/**
 * A column's aggregate, on a group row.
 *
 * Renders through `column.aggregation.component` when the author supplied one, and otherwise
 * through the column's **existing** cell-type view — a `number` column's subtotal is formatted
 * the way its values are, which is the whole reason this is not a contract slot of its own. The
 * value is the cell's own `getValue()`: on an aggregated cell that is already the aggregate, not
 * a row datum.
 *
 * `data-aggregated-cell` rather than a `data-slot` of its own: this is still a `td`, and a kit
 * that wants to weight a subtotal targets the attribute on it.
 */
function AggregatedCell<TRow extends object>({ cell, row, chrome, children }: SystemSubProps<TRow>) {
	const { Td } = useGridComponents().core
	const cellTypes = useCellTypes()
	const meta = cell.column.columnDef.meta
	const aggregatedComp = meta?.aggregation?.component as ComponentType<CellViewProps> | undefined
	const viewComp = aggregatedComp ?? resolveViewComponent(meta, cellTypes)

	return (
		<Td
			{...chrome.navigation}
			data-slot='td'
			style={chrome.pinVars}
			pinned={chrome.pinned}
			{...chrome.pinnedAttrs}
			{...chrome.alignAttrs}
			{...chrome.classNameAttr}
			data-aggregated-cell='true'
		>
			{renderCellContent(
				children,
				cell,
				row,
				viewComp
					? flexRender(viewComp, {
							value: cell.getValue<unknown>(),
							row: cell.row.original as unknown,
							rowIndex: cell.row.index,
							...(meta?.cell?.config !== undefined ? { config: meta.cell.config } : {}),
						})
					: String(cell.getValue<unknown>() ?? ''),
			)}
		</Td>
	)
}

type EditingCellProps<TRow extends object> = DataGridCellProps<TRow> & {
	editMode: EditingMode
	cellId: string
	chrome: CellChrome
}

/**
 * Renders the inline edit input for a cell. Only mounted when the parent
 * `BodyDataCell` determines this row/cell is being edited.
 *
 * Each subscription returns a referentially stable value:
 * - `value`: from `editing.values[columnId]` — primitive or stable ref
 * - `errors`: from `editing.errors[columnId]` — `undefined` when no errors
 *   (stable falsy), array when present (stable ref while content unchanged)
 * - `isValidating`: boolean from `commitStatus === CommitStatus.Validating`
 *
 * As a result, `setValue` on a different column does not re-render this cell:
 * only the one whose `values[columnId]` key actually changed re-renders.
 */
function EditingCell<TRow extends object>({ cell, row, editMode, cellId, chrome, children }: EditingCellProps<TRow>) {
	const table = useDataGridTable()
	const { Td, Input } = useGridComponents().core
	const cellTypes = useCellTypes()
	const columnId = cell.column.id
	const meta = cell.column.columnDef.meta

	const value = useDataGridState((s) => s.editing.values[columnId])
	const rawErrors = useDataGridState((s) => s.editing.errors[columnId])
	const isValidating = useDataGridState((s) => s.editing.commitStatus === CommitStatus.Validating)

	const fieldErrors = rawErrors ?? EMPTY_ERRORS
	const fieldError = fieldErrors[0]

	const editComp = resolveEditComponent(meta, cellTypes)

	const onBlur = () => void table.editing.validateField(columnId)

	// Cell mode has no Save / Cancel pair — the actions column stays out of it — so leaving the
	// cell is the commit, and the keyboard is the deliberate way out: Enter commits, Escape
	// abandons (without which a mis-typed value could not be abandoned at all).
	//
	// All of it is listened for on the document rather than bound to the `Td` or the input: a kit's
	// `Td` need not forward handlers (heroui's wraps react-aria's `Cell`, which drops them) and a
	// custom `editing.component` inherits the behaviour without wiring anything. Only ever one cell
	// edit is open, and this effect lives exactly as long as it does.
	const isCellEdit = editMode === EditingMode.Cell
	useEffect(() => {
		if (!isCellEdit) return undefined

		// `blur` is deliberately NOT the commit trigger. React-aria's grid moves DOM focus from the
		// input to the cell itself on pointer-down, so a blur fires *inside* the cell before the
		// press completes: the switch of a boolean column committed and closed without ever
		// toggling. What ends the edit is the pointer or focus landing somewhere else entirely.
		const isInsideEdit = (target: EventTarget | null): boolean => {
			if (!(target instanceof Element)) return false
			// An overlay belonging to the editor — a select's listbox, a date picker's dialog —
			// renders in a portal outside the cell, so it has to count as inside.
			return target.closest(`[${EDITING_CELL_ATTR}], ${OVERLAY_SELECTOR}`) !== null
		}

		const commitOnLeave = (event: Event): void => {
			if (isInsideEdit(event.target)) return
			void table.editing.commitCell()
		}

		const onKeyDown = (event: globalThis.KeyboardEvent): void => {
			// Already handled by something nearer the user — a select popover closing on Escape.
			if (event.defaultPrevented) return
			if (event.key === 'Enter') {
				event.preventDefault()
				void table.editing.commitCell()
			} else if (event.key === 'Escape') {
				event.preventDefault()
				table.editing.cancel()
			}
		}

		document.addEventListener('keydown', onKeyDown)
		document.addEventListener('pointerdown', commitOnLeave, true)
		document.addEventListener('focusin', commitOnLeave, true)

		// The opened cell takes the caret, so Enter and Escape reach it without a click first. The
		// kit's own edit component is focused here rather than given an `autoFocus` prop, which the
		// cell-type contract does not carry — only the fallback `Input` below ever had one.
		const cellEl = document.querySelector(`[${EDITING_CELL_ATTR}]`)
		if (cellEl && !cellEl.contains(document.activeElement)) {
			cellEl.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
		}

		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.removeEventListener('pointerdown', commitOnLeave, true)
			document.removeEventListener('focusin', commitOnLeave, true)
		}
	}, [isCellEdit, table])

	/** The column's header text — this control's accessible name while the cell is being edited. */
	const fieldName = columnNameOf(cell.column.columnDef.header, columnId)

	const fieldState: FieldState = {
		id: cellId,
		value,
		onChange: (v: unknown) => {
			table.editing.setValue(columnId, v)
		},
		onBlur,
		...(meta?.cell?.config !== undefined ? { config: meta.cell.config } : {}),
		error: fieldError,
		errors: [...fieldErrors],
		isValidating,
	}

	return (
		<Td
			{...chrome.navigation}
			data-slot='td'
			style={chrome.pinVars}
			pinned={chrome.pinned}
			{...chrome.pinnedAttrs}
			{...chrome.alignAttrs}
			{...chrome.classNameAttr}
			{...(fieldError ? { 'data-error': true } : {})}
			{...(isCellEdit ? { [EDITING_CELL_ATTR]: '' } : {})}
		>
			{renderCellContent(
				children,
				cell,
				row,
				editComp ? (
					<>
						{/* An edited cell shows the control and no label — the column header above it is
						    the label, and a screen reader cannot follow that. Same defect, and same fix,
						    as the creating row and the column filters. */}
						<VisuallyHiddenLabel htmlFor={fieldState.id}>{fieldName}</VisuallyHiddenLabel>
						{flexRender(editComp, fieldState)}
					</>
				) : (
					<Input
						value={(value ?? '') as string | number | readonly string[]}
						aria-label={fieldName}
						onChange={(e) => {
							table.editing.setValue(columnId, e.target.value)
						}}
						onBlur={fieldState.onBlur}
					/>
				),
			)}
		</Td>
	)
}

// ── helpers ─────────────────────────────────────────────────────────────────

/**
 * {@link getCellChrome} plus the focus model's own props, which come from context and so cannot
 * be read by a pure function. The two call sites that build chrome use this; the three that
 * receive it as a prop are unchanged.
 */
function useCellChrome<TRow extends object>(cell: Cell<GridFeatures, TRow>): CellChrome {
	const navigation = useCellNavigationProps('gridcell')
	return { ...getCellChrome(cell), navigation }
}

function getCellChrome<TRow extends object>(cell: Cell<GridFeatures, TRow>): Omit<CellChrome, 'navigation'> {
	const pinVars = getCommonPinStyles(cell.column)
	const pinned = cell.column.getIsPinned()
	const pinnedAttrs: CellChrome['pinnedAttrs'] = pinned ? { 'data-pinned': pinned } : {}
	// Guarded rather than delegated to `resolveCellClassName`: this runs for every cell of every
	// grid on every render, and the argument object below reads `getValue()`, which most columns
	// — every system column among them — have no reason to call here at all.
	const cellClassNameOption = cell.column.columnDef.meta?.cellClassName
	const cellClassName =
		cellClassNameOption === undefined
			? undefined
			: resolveCellClassName(cellClassNameOption, {
					row: cell.row.original,
					value: cell.getValue<unknown>(),
					rowIndex: cell.row.index,
				})
	return {
		pinVars,
		pinned,
		pinnedAttrs,
		alignAttrs: getAlignAttrs(cell.column.columnDef.meta as FormColumnMeta | undefined, 'cell'),
		classNameAttr: cellClassName !== undefined ? { className: cellClassName } : {},
	}
}

/**
 * Lays the caller's `children` over what the branch resolved, or hands the resolved content
 * straight through when there are none.
 *
 * One helper for all four branches: which of them is rendering decides what `content` *is*, and
 * nothing about how a caller replaces or wraps it.
 */
function renderCellContent<TRow extends object>(
	children: DataGridCellProps<TRow>['children'],
	cell: Cell<GridFeatures, TRow>,
	row: Row<GridFeatures, TRow>,
	content: ReactNode,
): ReactNode {
	/**
	 * `value` behind a getter so the default path keeps not calling the accessor, and every
	 * branch that renders a `Td` publishes the node without restating it — this one function is
	 * the only place a body cell's content is resolved, so it is also the only place the context
	 * has to be provided.
	 */
	const args: DataGridCellRenderArgs<TRow> = {
		cell,
		row,
		get value() {
			return cell.getValue<unknown>()
		},
		content,
	}
	const resolved = children === undefined ? content : typeof children !== 'function' ? children : children(args)

	return <CellProvider value={args}>{resolved}</CellProvider>
}

function resolveEditComponent<TRow extends object>(
	meta: ColumnMeta<GridFeatures, TRow> | undefined,
	registry: CellTypeRegistry,
): ComponentType<FieldState> | undefined {
	// 1. column-level editing.component
	const editingConfig = meta?.editing
	if (editingConfig !== false && editingConfig !== undefined) {
		const comp = editingConfig.component
		if (comp) return comp as ComponentType<FieldState>
	}
	// 2. registry by cell type
	const cellTypeId = meta?.cell?.type
	if (cellTypeId) {
		const def = registry[cellTypeId]
		if (def?.editing) return def.editing
	}
	return undefined
}

/**
 * Resolves the view renderer for a column.
 * - `meta.cell?.view` (set from `cell.component` in mapColumns) takes precedence.
 * - Otherwise, looks up `meta.cell?.type` in the cell-type registry.
 *
 * Returns `undefined` when no renderer is found — the caller falls back to
 * TanStack's default cell rendering (raw value).
 *
 * The headless package ships **no** built-in cell types. Consumers/UI kits
 * register them via `CellTypesProvider` or `createDataGrid({ cellTypes })`.
 */
export function resolveViewComponent<TRow extends object>(
	meta: ColumnMeta<GridFeatures, TRow> | undefined,
	registry: CellTypeRegistry,
): ComponentType<CellViewProps> | undefined {
	// Returned as-is, never wrapped: `flexRender` mounts by component identity, so a wrapper
	// allocated here would be a fresh component type on every render and remount the cell each
	// time. `cell.component` takes `{ row, value, rowIndex }` and simply ignores the extra
	// `config` that `CellViewProps` carries, so the shapes are already compatible.
	if (meta?.cell?.view) return meta.cell.view as ComponentType<CellViewProps>
	const cellTypeId = meta?.cell?.type
	if (cellTypeId) {
		const def = registry[cellTypeId]
		if (def?.view) return def.view
	}
	return undefined
}
