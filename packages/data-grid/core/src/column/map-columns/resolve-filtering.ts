import {
	DATE_RANGE_PRESETS,
	DATE_VALUE_PRESETS,
	OperatorInput,
	createOperatorFilterFn,
	resolveColumnOperators,
} from '../../features/operators'
import { setIfDefined } from '../../utils/set-if-defined'
import { warnOnce } from '../../utils/warn-once'

import { warnOnBothItemSources, warnOnListInLayer } from './items-source'

import type { ColumnOperatorsConfig, DatePreset, FilterOperatorDef, OperatorsConfig } from '../../features/operators'
import type { ColumnFilteringConfig, ColumnFilteringMeta } from '../types'

const IS_DEV = process.env.NODE_ENV !== 'production'

const DATE_CELL_TYPE = 'date'

/** The cell type a column without `cell.type` has. */
const DEFAULT_CELL_TYPE = 'text'

/** What a development warning calls the filter's owner. */
export const FilterSubject = {
	Column: 'Column',
	Field: 'Filter field',
} as const

export type FilterSubject = (typeof FilterSubject)[keyof typeof FilterSubject]

/** The operator dispatcher a filter with operators filters rows by. */
export type OperatorFilterFn = ReturnType<typeof createOperatorFilterFn>

/** What {@link resolveFiltering} reads besides the filter's own config. */
export type ResolveFilteringOptions = {
	/** The grid's operator set, by cell type — `TableConfig.operators`. */
	operators?: OperatorsConfig | undefined
	/** Table-level `filtering.faceted` — the default a filter without its own `faceted` takes. */
	tableFaceted?: boolean | undefined
	/**
	 * Table-level operator switch — the default when a filter has no `operators` of its own.
	 * `undefined` keeps the per-filter opt-in; `false` wins over any filter that asks for them.
	 */
	tableOperators?: boolean | undefined
	/**
	 * Whether the target is a column group header, which holds no value of its own and so never
	 * inherits the table's `operators: true`.
	 */
	isGroup?: boolean | undefined
	/**
	 * What the target is called in development warnings — {@link FilterSubject.Column} by default,
	 * {@link FilterSubject.Field} for a table-level filter field, so a misconfigured field is not
	 * reported as a column.
	 */
	subject?: FilterSubject | undefined
}

/** The resolved filter of one column or field. */
export type ResolvedFiltering = {
	/**
	 * The meta to store under `filtering`: `false` when the filter is switched off, `undefined`
	 * when nothing was configured, the resolved {@link ColumnFilteringMeta} otherwise.
	 */
	meta: false | ColumnFilteringMeta | undefined
	/** The operator dispatcher, when operators were resolved. */
	filterFn?: OperatorFilterFn
}

/**
 * The `filtering.presets`, resolved to the list a control offers.
 *
 * Presets are dates, so they mean nothing on any other cell type. TypeScript cannot say that —
 * `presets` and `cell` are sibling fields of one object, with no inference variable to carry the
 * type across (see the `ColumnInputRenderer` note in `column/types.ts`) — so the option that
 * landed on the wrong filter is caught here, where the cell type is finally known.
 */
function resolveDatePresets(
	configured: boolean | DatePreset[] | undefined,
	cellType: string | undefined,
	who: string,
): DatePreset[] | undefined {
	if (configured === undefined || configured === false) return undefined
	if (cellType !== DATE_CELL_TYPE) {
		if (IS_DEV) {
			warnOnce(
				`[data-grid] ${who} sets \`filtering.presets\`, but its cell type is ` +
					`"${cellType ?? DEFAULT_CELL_TYPE}". Presets fill a date, so they only apply to ` +
					`\`cell: { type: 'date' }\` filters and are ignored here.`,
			)
		}
		return undefined
	}
	if (configured === true) return [...DATE_RANGE_PRESETS, ...DATE_VALUE_PRESETS]
	return configured.length > 0 ? configured : undefined
}

const OPERATOR_INPUTS: ReadonlySet<unknown> = new Set(Object.values(OperatorInput))

/** How a warning prints an `input` that may be anything a JavaScript caller wrote. */
function describeInput(input: unknown): string {
	return input === undefined ? 'missing' : JSON.stringify(input)
}

/**
 * Development checks on one cell type's operator set — the mistakes that type-check (a set built in
 * JavaScript, or by spreading a definition) and then misbehave without a word: two definitions under
 * one id, where the menu lists both and the filter runs the last; a definition with no valid
 * `input`, which every behaviour reads; and a `defaultByType` entry naming an id the set does not
 * have, which a column would otherwise silently replace with the set's first operator.
 *
 * Each says so once, through `warnOnce`: the mapper re-runs on every React render.
 */
function warnOnMalformedSet(type: string, set: FilterOperatorDef[] | undefined, setDefault: string | undefined): void {
	if (!IS_DEV || set === undefined) return
	const seen = new Set<string>()
	for (const op of set) {
		if (seen.has(op.id)) {
			warnOnce(
				`[data-grid] The operator set of cell type "${type}" lists "${op.id}" twice. The menu offers ` +
					`both, and the filter runs the last one.`,
			)
		}
		seen.add(op.id)
		if (!OPERATOR_INPUTS.has(op.input)) {
			warnOnce(
				`[data-grid] Operator "${op.id}" of cell type "${type}" has no valid \`input\` ` +
					`(${describeInput(op.input)}). Every filter behaviour reads it — write one of ` +
					`${[...OPERATOR_INPUTS].map((input) => `'${String(input)}'`).join(', ')}.`,
			)
		}
	}
	if (setDefault !== undefined && !seen.has(setDefault)) {
		warnOnce(
			`[data-grid] \`operators.defaultByType\` names "${setDefault}" for cell type "${type}", which its ` +
				`set does not have, so its columns open with the set's first operator.`,
		)
	}
}

/** Whether the filter offers operators, by the cascade table → filter. */
function operatorsEnabled(
	filtering: false | ColumnFilteringConfig | undefined,
	options: ResolveFilteringOptions,
): boolean {
	const own = filtering === false ? undefined : filtering?.operators
	const { tableOperators } = options
	// `operators: false` on the table is the stronger word — it means "no operator selectors in
	// this grid", so a filter asking for them does not get them.
	if (tableOperators === false || own === false) return false
	if (own !== undefined) return true
	// A table-wide `true` reaches every filter that can actually be used: not one that turned
	// itself off (`filtering: false`), and not a group header, which has no value to compare.
	return tableOperators === true && filtering !== false && options.isGroup !== true
}

/**
 * Resolves the operator half of a filter onto `meta`, returning the dispatcher when there is one.
 * Separate from {@link resolveFiltering} only to keep each function to one concern.
 */
function resolveOperators(
	id: string,
	filteringCfg: ColumnFilteringConfig | undefined,
	cellType: string | undefined,
	operators: OperatorsConfig | undefined,
	meta: ColumnFilteringMeta,
	who: string,
): OperatorFilterFn | undefined {
	const own = filteringCfg?.operators
	const type = cellType ?? DEFAULT_CELL_TYPE
	const cellTypeOperators = operators?.byType?.[type]
	// A filter inheriting the table's `true` offers its cell type's set — the same thing
	// `operators: true` on the filter itself means.
	const operatorsConfig: true | ColumnOperatorsConfig = typeof own === 'object' ? own : true
	const setDefault = operators?.defaultByType?.[type]
	warnOnMalformedSet(type, cellTypeOperators, setDefault)
	const resolved = resolveColumnOperators(operatorsConfig, cellTypeOperators, id, type)

	if (resolved.length === 0) {
		// The grid has no set for this cell type: a project-registered type nobody listed, or a
		// bundle composed without `operators` at all.
		//
		// Only when the filter asked: under a table-wide `operators: true` the author said
		// "wherever they apply", and a cell type with no set is a filter where they do not —
		// falling back to a plain input is the answer, not a warning per such filter. A table-wide
		// `true` over a grid with no set at all warns once, in `createTableOptions`.
		if (IS_DEV && own !== undefined) {
			warnOnce(
				`[data-grid] ${who} enables \`filtering.operators\`, but the grid has no operators for cell ` +
					`type "${type}", so it falls back to a plain filter input. Add a set for it to ` +
					`\`operators.byType\` (on \`createDataGrid\`, a provider or the grid), or list the ` +
					`definitions in its \`filtering.operators.items\`.`,
			)
		}
		return undefined
	}

	meta.operators = resolved

	if (typeof operatorsConfig === 'object' && operatorsConfig.betweenOperator) {
		const betweenConfig = operatorsConfig.betweenOperator

		// A slider over an unknown domain can express nothing, so it needs a stated one. This used
		// to be a silent `0..100`, which is an invention rather than the column's data.
		if (
			IS_DEV &&
			betweenConfig.slider === true &&
			(betweenConfig.min === undefined || betweenConfig.max === undefined)
		) {
			warnOnce(
				`[data-grid] ${who} sets \`betweenOperator.slider: true\` without both ` +
					`\`min\` and \`max\`. The filter falls back to two number fields.`,
			)
		}

		meta.betweenOperator = betweenConfig
	}

	// The set's default for the type applies only where the column offers it: a column that
	// narrowed its `items` past it opens with its own first operator instead of with an id it
	// does not have. A `defaultOperator` the author wrote is checked below.
	const offeredSetDefault = resolved.some((op) => op.id === setDefault) ? setDefault : undefined
	const defaultOpId = filteringCfg?.defaultOperator ?? offeredSetDefault ?? resolved[0]?.id
	if (defaultOpId) {
		// An id the filter does not actually offer selects nothing in the operator control and
		// dispatches to no `filterFn` — the filter matches every row. Cheaper to catch here than in
		// the browser.
		if (IS_DEV && !resolved.some((op) => op.id === defaultOpId)) {
			warnOnce(
				`[data-grid] ${who} sets \`filtering.defaultOperator: "${defaultOpId}"\`, ` +
					`which is not one of its operators (${resolved.map((op) => `"${op.id}"`).join(', ')}). ` +
					`The filter would match every row.`,
			)
		}
		meta.defaultOperator = defaultOpId
	}

	return createOperatorFilterFn(resolved, id)
}

/**
 * Resolves a `filtering` config and its `cell.type` into the filter meta a control reads and the
 * operator dispatcher rows are filtered by.
 *
 * The one place this rule lives, for columns and for table-level filter fields alike, so the two
 * cannot drift apart at the first new operator. Everything resolved lands under the name of the
 * option it came from — see {@link ColumnFilteringMeta}.
 */
export function resolveFiltering(
	id: string,
	filtering: false | ColumnFilteringConfig | undefined,
	cellType: string | undefined,
	options: ResolveFilteringOptions = {},
): ResolvedFiltering {
	const filteringCfg = filtering === false ? undefined : filtering
	const who = `${options.subject ?? FilterSubject.Column} "${id}"`
	const meta: ColumnFilteringMeta = {}
	setIfDefined(meta, 'component', filteringCfg?.component)
	setIfDefined(meta, 'debounce', filteringCfg?.debounce)
	setIfDefined(meta, 'placeholder', filteringCfg?.placeholder)
	setIfDefined(meta, 'config', filteringCfg?.config)
	warnOnListInLayer(who, 'filtering', filteringCfg?.config)
	setIfDefined(meta, 'items', filteringCfg?.items)
	setIfDefined(meta, 'useItems', filteringCfg?.useItems)
	warnOnBothItemSources(who, 'filtering', filteringCfg)
	setIfDefined(meta, 'presets', resolveDatePresets(filteringCfg?.presets, cellType, who))
	// Same cascade as the operators: the table states a default, the filter overrides it in both
	// directions.
	const ownFaceted = filteringCfg?.faceted
	if (ownFaceted === true || (ownFaceted !== false && options.tableFaceted === true)) meta.faceted = true

	const filterFn = operatorsEnabled(filtering, options)
		? resolveOperators(id, filteringCfg, cellType, options.operators, meta, who)
		: undefined

	// `false` is a distinct value, not an empty config: it is what turns the filter control off,
	// and readers test for it. An enabled filter with nothing configured contributes no meta.
	const resolvedMeta = filtering === false ? false : Object.keys(meta).length > 0 ? meta : undefined
	return { meta: resolvedMeta, ...(filterFn !== undefined ? { filterFn } : {}) }
}
