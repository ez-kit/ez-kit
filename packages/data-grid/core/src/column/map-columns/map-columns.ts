import {
	DEFAULT_OPERATOR_ID_BY_TYPE,
	DEFAULT_OPERATORS_BY_TYPE,
	createOperatorFilterFn,
	resolveColumnOperators,
} from '../../features/operators'
import { setIfDefined } from '../../utils/set-if-defined'

import type { OperatorRegistry } from '../../features/operators'
import type {
	CellViewCtx,
	ColumnAlign,
	ColumnAlignDef,
	ColumnCreatingConfig,
	ColumnDef,
	ColumnEditingConfig,
	ColumnPinningDef,
	ColumnWidthDef,
	TanStackColumnDef,
} from '../types'

/** Cell types unchecked: `mapColumns` runs over already-authored columns of any grid. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCellTypes = any

/**
 * `cellClassName` is declared per row type on the column and row-erased on the meta, exactly
 * like `cellView` beside it — the meta is read by renderers that have no `TRow`.
 */
type ColumnMetaClassName = string | ((ctx: CellViewCtx<unknown, unknown>) => string | undefined)

/**
 * `editing` / `creating` are declared with the **column's** value type so an `accessorKey`
 * column's edit field sees it, and value-erased on the meta, exactly like `cellClassName` and
 * `cellView` beside them — the meta is read by renderers that have no `TValue`. `FieldState`'s
 * `value` and `onChange` point opposite ways, so no variance rule relates the two; the cast is
 * the erasure, and it happens here once rather than at every reader.
 */
type ColumnMetaEditing = false | ColumnEditingConfig
type ColumnMetaCreating<TRow> = false | ColumnCreatingConfig<TRow>

/**
 * Converts our ColumnDef[] to TanStack ColumnDef[].
 *
 * - pinning, filtering, editing, creating → column meta
 * - cell.type → meta.cellType
 * - cell.component → TanStack cell renderer + meta.cellView
 * - sorting: false → enableSorting: false
 * - sorting: object → sortDescFirst / sortingFn / sortUndefined / invertSorting / enableMultiSort
 * - header string preserved as-is (TanStack accepts string | function)
 * - filtering.operators → resolves operator list, attaches filterFn dispatcher
 */
export type MapColumnsOptions = {
	/** Table-level faceted flag — used as default when column has no `filtering.faceted` override. */
	tableFaceted?: boolean
}

export function mapColumns<TRow extends object>(
	defs: ColumnDef<TRow, AnyCellTypes>[],
	registry?: OperatorRegistry,
	options?: MapColumnsOptions,
): TanStackColumnDef<TRow>[] {
	return defs.map((def) => mapColumn(def, registry, options))
}

/**
 * Collapses the scalar pinning form onto the object one, so every reader downstream sees a
 * single shape. `pinning: 'left'` is the long `{ side: 'left' }` — a static pin — not a seed.
 */
function normalizeColumnPinning(
	pinning: ColumnDef<never, AnyCellTypes>['pinning'],
): false | ColumnPinningDef | undefined {
	if (pinning === undefined || pinning === false) return pinning
	return typeof pinning === 'string' ? { side: pinning } : pinning
}

/**
 * Collapses the scalar width form onto the object one. `width: 200` is the starting width —
 * TanStack's `size` — with no bounds, which is what a bare number reads as.
 */
function normalizeColumnWidth(width: number | ColumnWidthDef | undefined): ColumnWidthDef | undefined {
	if (width === undefined) return undefined
	return typeof width === 'number' ? { default: width } : width
}

/**
 * Collapses the scalar align form onto the object one. `align: 'end'` means all three parts,
 * which is what the bare value reads as; the object names the parts that differ.
 */
function normalizeColumnAlign(align: ColumnAlign | ColumnAlignDef | undefined): ColumnAlignDef | undefined {
	if (align === undefined) return undefined
	return typeof align === 'string' ? { header: align, cell: align, footer: align } : align
}

function mapColumn<TRow extends object>(
	def: ColumnDef<TRow, AnyCellTypes>,
	registry?: OperatorRegistry,
	options?: MapColumnsOptions,
): TanStackColumnDef<TRow> {
	const {
		pinning,
		visibility,
		sorting,
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

	const meta: TanStackColumnDef<TRow>['meta'] = {}

	setIfDefined(meta, 'pinning', normalizeColumnPinning(pinning))
	setIfDefined(meta, 'align', normalizeColumnAlign(align))
	setIfDefined(meta, 'visibility', visibility)
	setIfDefined(meta, 'filtering', filtering)
	setIfDefined(meta, 'editing', editing as ColumnMetaEditing)
	setIfDefined(meta, 'creating', creating as ColumnMetaCreating<TRow>)
	setIfDefined(meta, 'headerClassName', headerClassName)
	setIfDefined(meta, 'cellClassName', cellClassName as ColumnMetaClassName)
	setIfDefined(meta, 'footerClassName', footerClassName)
	// Implicit cellType='text' when not provided so registry-driven form rendering
	// always has a target. Built-in view rendering (cell.tsx builtInView) treats
	// 'text' as the no-op default, so this does not change view output.
	meta.cellType = cellDef?.type ?? 'text'
	if (cellDef !== undefined && 'config' in cellDef && cellDef.config !== undefined) {
		// The declared config type is the cell type's business, not this mapper's — it only
		// forwards whatever the column author wrote into `meta` for the renderer to read.
		meta.config = cellDef.config as Record<string, unknown>
	}
	const viewFn = cellDef?.component
	if (viewFn !== undefined) meta.cellView = viewFn as (ctx: CellViewCtx<unknown, unknown>) => unknown

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
	setIfDefined(result, 'minSize', widthDef?.min)
	setIfDefined(result, 'maxSize', widthDef?.max)

	// sorting: false → disable sorting for this column
	if (sorting === false) {
		result.enableSorting = false
	} else if (sorting !== undefined) {
		setIfDefined(result, 'sortDescFirst', sorting.descFirst)
		setIfDefined(result, 'sortingFn', sorting.fn)
		setIfDefined(result, 'sortUndefined', sorting.undefined)
		setIfDefined(result, 'invertSorting', sorting.invert)
		if (sorting.multi === false) result.enableMultiSort = false
	}

	// visibility: false → hiding disabled for this column (always visible)
	if (visibility === false) result.enableHiding = false

	// cell.component (preferred) or cell.view → TanStack cell renderer.
	//
	// Only the callable form gets this shim, which exists to translate TanStack's `CellContext`
	// into the `{ row, value, rowIndex }` a column renderer expects. An exotic renderer
	// (`memo` / `forwardRef`) cannot be called at all, and does not need to be: it travels on
	// `meta.cellView`, which is what the React adapter actually mounts. The shim is the fallback
	// for anything reading `columnDef.cell` directly.
	if (typeof viewFn === 'function') {
		// Value-erased, like `meta.cellView` just above and for the same reason: the renderer was
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

	// Operator-aware filtering
	const filteringCfg = filtering !== undefined && filtering !== false ? filtering : undefined
	if (filteringCfg?.items) {
		meta.filteringItems = filteringCfg.items
	}
	const colFaceted = filteringCfg?.faceted
	const tableFaceted = options?.tableFaceted ?? false
	const facetedEnabled = colFaceted === true || (colFaceted !== false && tableFaceted)
	if (facetedEnabled) {
		meta.facetedEnabled = true
	}
	if (filteringCfg?.operators && registry) {
		const cellType = cellDef?.type
		const cellTypeOperators = DEFAULT_OPERATORS_BY_TYPE[cellType ?? 'text']
		const resolved = resolveColumnOperators(filteringCfg.operators, registry, cellTypeOperators)

		if (resolved.length > 0) {
			result.filterFn = createOperatorFilterFn(resolved)
			meta.resolvedOperators = resolved

			if (typeof filteringCfg.operators === 'object' && filteringCfg.operators.betweenOperator) {
				meta.betweenOperatorConfig = filteringCfg.operators.betweenOperator
			}

			const defaultOpId =
				filteringCfg.defaultOperator ??
				(cellType ? DEFAULT_OPERATOR_ID_BY_TYPE[cellType] : undefined) ??
				resolved[0]?.id
			if (defaultOpId) meta.defaultOperatorId = defaultOpId
		}
	}

	// Nested columns (column groups)
	if (columns !== undefined) {
		result.columns = mapColumns(columns, registry, options)
	}

	return result as TanStackColumnDef<TRow>
}
