import { setIfDefined } from '../../utils/set-if-defined'
import { normalizeColumnAlign, normalizeColumnPinning, normalizeColumnWidth } from '../normalize'

import { liftItemsSource, warnOnBothItemSources, warnOnListInLayer } from './items-source'
import { resolveFiltering } from './resolve-filtering'

import type { OperatorsConfig } from '../../features/operators'
import type {
	CellViewCtx,
	ColumnCellMeta,
	ColumnCreatingConfig,
	ColumnDef,
	ColumnEditingConfig,
	ColumnWidthDef,
	MappedColumnDef,
} from '../types'

const IS_DEV = process.env.NODE_ENV !== 'production'

/** TanStack's default `minSize` for every column — `getDefaultColumnSizingColumnDef()`, not exported. */
const TANSTACK_DEFAULT_MIN_WIDTH = 20

/**
 * The `minSize` a column gets: the authored `min`, or — when only a starting width below TanStack's
 * 20px default floor was written — that starting width, so `width: 10` means 10 rather than 20.
 */
function resolveMinWidth(widthDef: ColumnWidthDef | undefined): number | undefined {
	if (widthDef?.min !== undefined) return widthDef.min
	const start = widthDef?.default
	return start !== undefined && start < TANSTACK_DEFAULT_MIN_WIDTH ? start : undefined
}

/** Cell types unchecked: `mapColumns` runs over already-authored columns of any grid. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCellTypes = any

/**
 * `cellClassName` is declared per row type on the column and row-erased on the meta, exactly
 * like the resolved `cell.view` beside it — the meta is read by renderers that have no `TRow`.
 */
type ColumnMetaClassName = string | ((ctx: CellViewCtx<unknown, unknown>) => string | undefined)

/**
 * `editing` / `creating` are declared with the **column's** value type so an `accessorKey`
 * column's edit field sees it, and value-erased on the meta, exactly like `cellClassName` and
 * the resolved `cell.view` beside them — the meta is read by renderers that have no `TValue`. `FieldState`'s
 * `value` and `onChange` point opposite ways, so no variance rule relates the two; the cast is
 * the erasure, and it happens here once rather than at every reader.
 */
type ColumnMetaEditing = false | ColumnEditingConfig
type ColumnMetaCreating<TRow> = false | ColumnCreatingConfig<TRow>

/**
 * Converts our ColumnDef[] to TanStack ColumnDef[].
 *
 * - pinning, filtering, editing, creating → column meta
 * - cell.type → meta.cell.type
 * - cell.component → TanStack cell renderer + meta.cell.view
 * - sorting: false → enableSorting: false
 * - sorting: object → sortDescFirst / sortFn / sortUndefined / invertSorting / enableMultiSort
 * - header string preserved as-is (TanStack accepts string | function)
 * - filtering.operators → resolves operator list, attaches filterFn dispatcher
 */
export type MapColumnsOptions = {
	/** Table-level faceted flag — used as default when column has no `filtering.faceted` override. */
	tableFaceted?: boolean
	/**
	 * Table-level operator switch — the default when a column has no `filtering.operators` of
	 * its own. `undefined` (the table never mentioned operators) keeps the per-column opt-in;
	 * `false` wins over any column that asks for them.
	 */
	tableOperators?: boolean
	/** The grid's operator set, by cell type — `TableConfig.operators`. */
	operators?: OperatorsConfig | undefined
	/**
	 * Whether the table filters by column at all. `false` gives every leaf column
	 * {@link KEEP_EVERY_ROW} as its filter function, replacing any operator dispatcher, so a
	 * seeded `columnFilters` slice waits in state instead of filtering a grid that has no column
	 * filter UI. Upstream applies the registered filtered row model to whatever state it holds,
	 * and `enableColumnFilters: false` hides the affordances only. Its one switch,
	 * `manualFiltering`, would take global search down too — and global search resolves its
	 * function from the table, so it is untouched by this one.
	 */
	columnFiltering?: boolean
}

/** The filter function of a column whose table filters by no column: it keeps every row. */
const KEEP_EVERY_ROW = (): boolean => true

export function mapColumns<TRow extends object>(
	defs: ColumnDef<TRow, AnyCellTypes>[],
	options?: MapColumnsOptions,
): MappedColumnDef<TRow>[] {
	return defs.map((def) => mapColumn(def, options))
}

function mapColumn<TRow extends object>(
	def: ColumnDef<TRow, AnyCellTypes>,
	options?: MapColumnsOptions,
): MappedColumnDef<TRow> {
	const {
		pinning,
		visibility,
		ordering,
		sorting,
		grouping,
		aggregation,
		cell,
		filtering,
		editing,
		creating,
		header,
		columns,
		accessorKey,
		accessorFn,
		id,
		footer,
		globalFiltering,
		resizing,
		width,
		align,
		headerClassName,
		cellClassName,
		footerClassName,
	} = def

	// The scalar `cell: 'number'` is the same thing as `cell: { type: 'number' }`; normalize once
	// here so nothing downstream has to know there are two spellings.
	const cellDef = typeof cell === 'string' ? { type: cell } : cell

	const meta: MappedColumnDef<TRow>['meta'] = {}
	const who = `Column "${id ?? accessorKey ?? '?'}"`

	setIfDefined(meta, 'pinning', normalizeColumnPinning(pinning))
	setIfDefined(meta, 'align', normalizeColumnAlign(align))
	setIfDefined(meta, 'width', normalizeColumnWidth(width))
	setIfDefined(meta, 'visibility', visibility)
	setIfDefined(meta, 'ordering', ordering)
	// Only the `false` switch reaches meta. `grouping.getValue` is TanStack's own
	// `getGroupingValue` column-def field and goes onto the def below, the way `sorting.fn` does.
	if (grouping === false) meta.grouping = false
	setIfDefined(meta, 'editing', editing as ColumnMetaEditing)
	setIfDefined(meta, 'creating', creating as ColumnMetaCreating<TRow>)
	// `editing` / `creating` reach the meta as written, so their lists — and `useItems` beside
	// `items` — travel with them; only the double statement needs a word.
	if (editing) {
		warnOnBothItemSources(who, 'editing', editing)
		warnOnListInLayer(who, 'editing', editing.config)
	}
	if (creating) {
		warnOnBothItemSources(who, 'creating', creating)
		warnOnListInLayer(who, 'creating', creating.config)
	}
	setIfDefined(meta, 'headerClassName', headerClassName)
	setIfDefined(meta, 'cellClassName', cellClassName as ColumnMetaClassName)
	setIfDefined(meta, 'footerClassName', footerClassName)
	// Implicit type='text' when not provided so registry-driven form rendering
	// always has a target. Built-in view rendering (cell.tsx builtInView) treats
	// 'text' as the no-op default, so this does not change view output.
	const cellMeta: ColumnCellMeta = { type: cellDef?.type ?? 'text' }
	if (cellDef !== undefined && 'config' in cellDef && cellDef.config !== undefined) {
		// The declared config type is the cell type's business, not this mapper's — it only
		// forwards whatever the column author wrote into `meta` for the renderer to read.
		cellMeta.config = cellDef.config as Record<string, unknown>
	}
	const viewFn = cellDef?.component
	if (viewFn !== undefined) cellMeta.view = viewFn as (ctx: CellViewCtx<unknown, unknown>) => unknown
	meta.cell = liftItemsSource(cellMeta, who)

	// Build a plain object and cast — TanStack's ColumnDef is a discriminated union
	// so it can't be directly constructed via spread without type assertions.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const result: Record<string, any> = { meta }

	setIfDefined(result, 'id', id)
	setIfDefined(result, 'header', header)
	setIfDefined(result, 'footer', footer)
	// Every gate below is expressed once, through the ez-kit alias — there are no raw
	// `enable*` pass-throughs on a public column def, so a column can never say the same
	// thing twice and disagree with itself. `column.getCanFilter()` / `getCanHide()` /
	// `getCanResize()` therefore always agree with the config the consumer wrote.
	if (filtering === false) result.enableColumnFilter = false
	if (globalFiltering === false) result.enableGlobalFilter = false
	if (resizing === false) result.enableResizing = false
	const widthDef = normalizeColumnWidth(width)
	setIfDefined(result, 'size', widthDef?.default)
	setIfDefined(result, 'minSize', resolveMinWidth(widthDef))
	setIfDefined(result, 'maxSize', widthDef?.max)

	// sorting: false → disable sorting for this column
	if (sorting === false) {
		result.enableSorting = false
	} else if (sorting !== undefined) {
		setIfDefined(result, 'sortDescFirst', sorting.descFirst)
		setIfDefined(result, 'sortFn', sorting.fn)
		setIfDefined(result, 'sortUndefined', sorting.undefined)
		setIfDefined(result, 'invertSorting', sorting.invert)
		if (sorting.multi === false) result.enableMultiSort = false
	}

	// grouping: false → this column can never be a grouping level
	if (grouping === false) {
		result.enableGrouping = false
	} else if (grouping !== undefined) {
		// TanStack passes `(originalRow, index, row)`; the config's callback names the first two,
		// which is the whole of what deriving a grouping key needs.
		setIfDefined(result, 'getGroupingValue', grouping.getValue)
	}

	// `aggregation` is the scalar-or-object pair the other column options use. The function is
	// TanStack's native `aggregationFn` and is passed straight through — only the renderer is
	// ours, and only it goes through meta.
	if (typeof aggregation === 'string') {
		result.aggregationFn = aggregation
	} else if (aggregation !== undefined) {
		// Only when the author named one. An absent `fn` is what a server-totalled column looks
		// like, and writing the key as `undefined` would both break `exactOptionalPropertyTypes`
		// and make the column read as aggregated to `create-table-options.ts`'s `aggregatedColumns`
		// walk — which would then ask for `rowAggregationFeature` on a grid that needs none.
		if (IS_DEV && aggregation.fn === undefined && aggregation.component === undefined) {
			console.warn(
				`[data-grid] Column "${id ?? accessorKey ?? '?'}" writes \`aggregation\` with neither \`fn\` nor ` +
					'`component`, so it says nothing: a total comes from `aggregation.fn` or from the table-level ' +
					'`aggregation.totals`, and `component` is what renders it.',
			)
		}
		if (aggregation.fn !== undefined) result.aggregationFn = aggregation.fn
		if (aggregation.component !== undefined) meta.aggregation = { component: aggregation.component }
	}

	// visibility: false → hiding disabled for this column (always visible)
	if (visibility === false) result.enableHiding = false

	// cell.component (preferred) or cell.view → TanStack cell renderer.
	//
	// Only the callable form gets this shim, which exists to translate TanStack's `CellContext`
	// into the `{ row, value, rowIndex }` a column renderer expects. An exotic renderer
	// (`memo` / `forwardRef`) cannot be called at all, and does not need to be: it travels on
	// `meta.cell.view`, which is what the React adapter actually mounts. The shim is the fallback
	// for anything reading `columnDef.cell` directly.
	if (typeof viewFn === 'function') {
		// Value-erased, like `meta.cell.view` just above and for the same reason: the renderer was
		// typed against its own column's value, but all this shim can supply is `getValue()`,
		// which is `unknown`. `mapColumns` runs over already-authored columns of any grid, so
		// there is no value type left to recover here — only the author's site had one.
		const callableView = viewFn as (ctx: CellViewCtx<TRow, unknown>) => unknown
		result.cell = (ctx: { row: { original: TRow; index: number }; getValue: () => unknown }) =>
			callableView({
				row: ctx.row.original,
				value: ctx.getValue(),
				rowIndex: ctx.row.index,
			})
	}

	// accessorKey or accessorFn
	if (accessorKey !== undefined) {
		result.accessorKey = accessorKey
	} else if (accessorFn !== undefined) {
		result.accessorFn = accessorFn
	}

	// Operator-aware filtering, resolved by the rule table-level filter fields share. Everything
	// resolved lands on `meta.filtering` under the name of the column option it came from — see
	// `ColumnFilteringMeta`.
	const resolvedFiltering = resolveFiltering(id ?? accessorKey ?? '?', filtering, cellDef?.type, {
		operators: options?.operators,
		tableFaceted: options?.tableFaceted,
		tableOperators: options?.tableOperators,
		isGroup: columns !== undefined,
	})
	setIfDefined(meta, 'filtering', resolvedFiltering.meta)
	setIfDefined(result, 'filterFn', resolvedFiltering.filterFn)

	// Last, so it replaces the operator dispatcher above. Group columns hold no value of their
	// own and are never filtered; their leaves get it through the recursion below.
	if (options?.columnFiltering === false && columns === undefined) {
		result.filterFn = KEEP_EVERY_ROW
	}

	// Nested columns (column groups)
	if (columns !== undefined) {
		result.columns = mapColumns(columns, options)
	}

	return result as MappedColumnDef<TRow>
}
