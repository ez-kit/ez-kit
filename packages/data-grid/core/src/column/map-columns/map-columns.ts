import {
	DEFAULT_OPERATOR_ID_BY_TYPE,
	DEFAULT_OPERATORS_BY_TYPE,
	createOperatorFilterFn,
	resolveColumnOperators,
} from '../../features/operators'
import { setIfDefined } from '../../utils/set-if-defined'

import type { OperatorRegistry } from '../../features/operators'
import type { CellViewCtx, ColumnDef, TanStackColumnDef } from '../types'

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
	defs: ColumnDef<TRow>[],
	registry?: OperatorRegistry,
	options?: MapColumnsOptions,
): TanStackColumnDef<TRow>[] {
	return defs.map((def) => mapColumn(def, registry, options))
}

function mapColumn<TRow extends object>(
	def: ColumnDef<TRow>,
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
		enableColumnFilter,
		enableGlobalFilter,
		globalFilter,
		enableHiding,
		enableResizing,
		size,
		minSize,
		maxSize,
		validateOn,
		validateDebounceMs,
	} = def

	const meta: TanStackColumnDef<TRow>['meta'] = {}

	setIfDefined(meta, 'columnPinning', pinning)
	setIfDefined(meta, 'visibility', visibility)
	setIfDefined(meta, 'filtering', filtering)
	setIfDefined(meta, 'editing', editing)
	setIfDefined(meta, 'creating', creating)
	setIfDefined(meta, 'validateOn', validateOn)
	setIfDefined(meta, 'validateDebounceMs', validateDebounceMs)
	// Implicit cellType='text' when not provided so registry-driven form rendering
	// always has a target. Built-in view rendering (cell.tsx builtInView) treats
	// 'text' as the no-op default, so this does not change view output.
	meta.cellType = cell?.type ?? 'text'
	if (cell !== undefined && 'config' in cell) {
		meta.config = cell.config
	}
	const viewFn = cell?.component
	if (viewFn !== undefined) meta.cellView = viewFn as (ctx: CellViewCtx<unknown, unknown>) => unknown

	// Build a plain object and cast — TanStack's ColumnDef is a discriminated union
	// so it can't be directly constructed via spread without type assertions.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const result: Record<string, any> = { meta }

	setIfDefined(result, 'id', id)
	setIfDefined(result, 'header', header)
	setIfDefined(result, 'footer', footer)
	setIfDefined(result, 'enableColumnFilter', enableColumnFilter)
	setIfDefined(result, 'enableGlobalFilter', enableGlobalFilter)
	// Ez-kit friendlier alias: `globalFilter: false` excludes the column from global search.
	// Wins over the raw `enableGlobalFilter` pass-through when both are provided.
	if (globalFilter === false) result.enableGlobalFilter = false
	setIfDefined(result, 'enableHiding', enableHiding)
	setIfDefined(result, 'enableResizing', enableResizing)
	setIfDefined(result, 'size', size)
	setIfDefined(result, 'minSize', minSize)
	setIfDefined(result, 'maxSize', maxSize)

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

	// visibility: true → column is locked (always visible, cannot be hidden)
	if (visibility === true) result.enableHiding = false

	// cell.component (preferred) or cell.view → TanStack cell renderer
	if (viewFn !== undefined) {
		result.cell = (ctx: { row: { original: TRow; index: number }; getValue: () => unknown }) =>
			viewFn({
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
	if (filteringCfg?.options) {
		meta.filteringOptions = filteringCfg.options
	}
	const colFaceted = filteringCfg?.faceted
	const tableFaceted = options?.tableFaceted ?? false
	const facetedEnabled = colFaceted === true || (colFaceted !== false && tableFaceted)
	if (facetedEnabled) {
		meta.facetedEnabled = true
	}
	if (filteringCfg?.operators && registry) {
		const cellType = cell?.type
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
