import {
	DEFAULT_OPERATOR_ID_BY_TYPE,
	DEFAULT_OPERATORS_BY_TYPE,
	createOperatorFilterFn,
	resolveColumnOperators,
} from '../../features/operators'
import { setIfDefined } from '../../utils/set-if-defined'
import { normalizeColumnAlign, normalizeColumnPinning, normalizeColumnWidth } from '../normalize'

import type { OperatorRegistry } from '../../features/operators'
import type {
	CellViewCtx,
	ColumnCellMeta,
	ColumnCreatingConfig,
	ColumnDef,
	ColumnEditingConfig,
	ColumnFilteringMeta,
	TanStackColumnDef,
} from '../types'

const IS_DEV = process.env.NODE_ENV !== 'production'

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
	setIfDefined(meta, 'editing', editing as ColumnMetaEditing)
	setIfDefined(meta, 'creating', creating as ColumnMetaCreating<TRow>)
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
	meta.cell = cellMeta

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

	// Operator-aware filtering. Everything resolved here lands on `meta.filtering` under the
	// name of the column option it came from — see `ColumnFilteringMeta`.
	const filteringCfg = filtering !== undefined && filtering !== false ? filtering : undefined
	const filteringMeta: ColumnFilteringMeta = {}
	setIfDefined(filteringMeta, 'component', filteringCfg?.component)
	setIfDefined(filteringMeta, 'debounce', filteringCfg?.debounce)
	setIfDefined(filteringMeta, 'items', filteringCfg?.items)
	const colFaceted = filteringCfg?.faceted
	const tableFaceted = options?.tableFaceted ?? false
	const facetedEnabled = colFaceted === true || (colFaceted !== false && tableFaceted)
	if (facetedEnabled) {
		filteringMeta.faceted = true
	}
	if (filteringCfg?.operators && registry) {
		const cellType = cellDef?.type
		const columnId: string = id ?? accessorKey ?? '?'
		const cellTypeOperators = DEFAULT_OPERATORS_BY_TYPE[cellType ?? 'text']
		const resolved = resolveColumnOperators(filteringCfg.operators, registry, cellTypeOperators, columnId)

		if (resolved.length === 0) {
			// `operators: true` on a cell type with no default set. Every built-in has one, so
			// this can only be a project-registered type — which has to say which operators it
			// offers, either through `defineCellType({ operators })` or per column.
			if (IS_DEV) {
				console.warn(
					`[data-grid] Column "${columnId}" enables \`filtering.operators\`, but cell type ` +
						`"${cellType ?? 'text'}" declares no operators, so the column falls back to a plain ` +
						`filter input. List them on the column (\`operators: { items: [...] }\`) or on the cell ` +
						`type (\`defineCellType({ operators })\`).`,
				)
			}
		} else {
			result.filterFn = createOperatorFilterFn(resolved)
			filteringMeta.operators = resolved

			if (typeof filteringCfg.operators === 'object' && filteringCfg.operators.betweenOperator) {
				filteringMeta.betweenOperator = filteringCfg.operators.betweenOperator
			}

			const defaultOpId =
				filteringCfg.defaultOperator ??
				(cellType ? DEFAULT_OPERATOR_ID_BY_TYPE[cellType] : undefined) ??
				resolved[0]?.id
			if (defaultOpId) {
				// An id the column does not actually offer selects nothing in the operator control
				// and dispatches to no `filterFn` — the filter matches every row. Cheaper to catch
				// here than in the browser.
				if (IS_DEV && !resolved.some((op) => op.id === defaultOpId)) {
					console.warn(
						`[data-grid] Column "${columnId}" sets \`filtering.defaultOperator: "${defaultOpId}"\`, ` +
							`which is not one of its operators (${resolved.map((op) => `"${op.id}"`).join(', ')}). ` +
							`The filter would match every row.`,
					)
				}
				filteringMeta.defaultOperator = defaultOpId
			}
		}
	}

	// `false` is a distinct value, not an empty config: it is what turns the column's filter
	// control off, and readers test for it. An enabled column with nothing configured
	// contributes no key at all, exactly as before.
	if (filtering === false) {
		meta.filtering = false
	} else if (Object.keys(filteringMeta).length > 0) {
		meta.filtering = filteringMeta
	}

	// Nested columns (column groups)
	if (columns !== undefined) {
		result.columns = mapColumns(columns, registry, options)
	}

	return result as TanStackColumnDef<TRow>
}
