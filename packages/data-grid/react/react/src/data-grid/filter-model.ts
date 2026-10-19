import { BASE_CELL_TYPE_IDS, FilterOperator, localizeDatePresets, localizeOperators } from '@ez-kit/data-grid-core'

import { presetsForOperator } from './date-presets'

import type { CellTypeRegistry } from '../cell-types-context'
import type { FilterTarget, FilterTargetMeta } from './filter-target'
import type {
	BadgeItem,
	BetweenOperatorConfig,
	BetweenValue,
	DatePreset,
	FilterItem,
	FilterOperatorDef,
	FilterOperatorId,
	GridMessages,
	SelectItem,
	StructuredFilterValue,
} from '@ez-kit/data-grid-core'

/**
 * Which value editor a column's filter calls for under a given operator.
 *
 * It names the **value**, not a component: `multiSelect` is "a set of the column's values", which
 * one kit draws as checkboxes and another as tags. That is what lets a panel built on a kit's own
 * filter controls pick the control without knowing how ez-kit's kits draw theirs. Derived from the
 * operator and the cell type, never configured.
 */
export const FilterEditor = {
	/** A free-text value. Text, image and link cells, and project cell types with no renderer. */
	Text: 'text',
	/** One number. Number and progress cells. */
	Number: 'number',
	/** One date. */
	Date: 'date',
	/** A yes / no value. */
	Boolean: 'boolean',
	/** One of {@link FilterModel.items}. Select and badge cells under a one-value operator. */
	Select: 'select',
	/** A {@link BetweenValue} range — the `between` operator. */
	Between: 'between',
	/** A set of {@link FilterModel.items} — the `in` / `notIn` operators. */
	MultiSelect: 'multiSelect',
	/** No value at all — an operator with `requiresInput: false` (`isEmpty`, `isNotEmpty`). */
	None: 'none',
	/** The column's own `filtering.component`, or a project cell type's own filter renderer. */
	Custom: 'custom',
} as const

export type FilterEditor = (typeof FilterEditor)[keyof typeof FilterEditor]

/** What {@link resolveFilter} reads besides the target itself. */
export type FilterModelContext = {
	/** The grid's resolved dictionary — operator and preset labels come from it. */
	messages: GridMessages
	/** The table-level filter debounce, which a column's own `filtering.debounce` overrides. */
	tableDebounce: number
	/** The kit's cell-type registry — it decides whether a project cell type draws its own filter. */
	cellTypes: CellTypeRegistry
}

type FilterModelBase = {
	/** The filter's `columnFilters` key — the column id or the field id. */
	id: string
	/** The column's string header (falling back to its id), or the field's `header`. */
	label: string
	/** The cell type id, for project types {@link FilterEditor} cannot name. */
	cellType: string | undefined
	/** The editor the current operator calls for. */
	editor: FilterEditor
	/** The editor a given operator would call for, without switching to it. */
	editorFor: (operator: FilterOperatorId) => FilterEditor
	/**
	 * The values a select or multi-select offers: `filtering.items`, else the select / badge cell's
	 * `cell.config.items`, else the column's unique values when faceted. Counts ride along when the
	 * column is faceted. A field is never faceted.
	 */
	items: FilterItem[]
	/** The column's date presets the current operator can take, labelled from the dictionary. */
	presets: DatePreset[]
	/** The `between` operator's bounds and slider flag, when the column states them. */
	between: BetweenOperatorConfig | undefined
	/** Commit debounce in ms — the column's `filtering.debounce`, else the table's. */
	debounce: number
	/**
	 * The hint an empty control shows — the target's `filtering.placeholder`, else the filter's
	 * name from `messages.filtering.placeholder`. A hint only: name the control by that message
	 * (`Filter <label>…` by default), never by this, which an author may have set to "10 digits".
	 */
	placeholder: string
	/** Human-readable current value, or the "Any" placeholder when unset. */
	valueDisplay: string
	hasValue: boolean
}

/** A filter that is an operator plus a value — what a filter panel edits as one entry. */
export type OperatorFilterModel = FilterModelBase & {
	hasOperators: true
	/** The column's operators, labelled from the grid's dictionary. */
	operators: FilterOperatorDef[]
	defaultOperator: FilterOperatorId | undefined
	/** The current value's operator, else {@link OperatorFilterModel.defaultOperator}. */
	operator: FilterOperatorId
	/** The current filter, or `undefined` when the column is not filtered. */
	value: StructuredFilterValue | undefined
	/**
	 * The value the grid's own control writes when the user picks `operator`: no value for an
	 * operator that takes none, an empty range entering `between`, no value leaving it, the
	 * current value otherwise. Computes only — nothing is written.
	 *
	 * `from` switches a value other than the applied one — a panel's draft, which is ahead of
	 * the grid until the user applies it. Defaults to {@link OperatorFilterModel.value}.
	 */
	nextValueForOperator: (operator: FilterOperatorId, from?: StructuredFilterValue) => StructuredFilterValue
	setValue: (next: StructuredFilterValue | undefined) => void
}

/** A filter by a plain value, with no operator — its value is whatever its control writes. */
export type PlainFilterModel = FilterModelBase & {
	hasOperators: false
	operators: []
	defaultOperator: undefined
	operator: undefined
	value: unknown
	setValue: (next: unknown) => void
}

/**
 * Everything a filter control needs to know about one filter target — a column or a field —
 * resolved the way the grid's own controls resolve it. Data and callbacks only — no element — so a
 * kit's own filter component can be driven from it.
 */
export type FilterModel = OperatorFilterModel | PlainFilterModel

const MAX_INLINE_VALUES = 2

const MULTI_OPERATORS: ReadonlySet<string> = new Set([FilterOperator.In, FilterOperator.NotIn])

/** The editor a built-in cell type calls for — the same grouping core labels its operators by. */
const EDITOR_BY_CELL_TYPE: Partial<Record<string, FilterEditor>> = {
	text: FilterEditor.Text,
	image: FilterEditor.Text,
	link: FilterEditor.Text,
	number: FilterEditor.Number,
	progress: FilterEditor.Number,
	date: FilterEditor.Date,
	boolean: FilterEditor.Boolean,
	select: FilterEditor.Select,
	badge: FilterEditor.Select,
}

const BUILT_IN_CELL_TYPES: ReadonlySet<string> = new Set(BASE_CELL_TYPE_IDS)

/**
 * Resolves the option list for select and multi-value filters.
 *
 * Priority:
 * 1. `filtering.items` (explicit, wins over both other sources).
 * 2. `cell.config.items` for `select` / `badge` cell types.
 * 3. The column's faceted unique values when faceted is enabled and no explicit items — never
 *    for a field, which has no rows of its own.
 *
 * Faceted counts are always merged onto whichever option set
 * is returned when faceted is enabled.
 */
function resolveFilterItems(target: FilterTarget): FilterItem[] {
	const { meta } = target
	const filteringMeta = meta.filtering
	const facetedEnabled = filteringMeta?.faceted === true
	const facetMap = facetedEnabled ? target.facetedValues?.() : undefined

	const explicit = filteringMeta?.items
	if (explicit && explicit.length > 0) {
		return facetMap
			? explicit.map((opt): FilterItem => {
					const count = facetMap.get(opt.value)
					return count !== undefined ? { ...opt, count } : opt
				})
			: explicit
	}

	if (meta.cell?.type === 'select' || meta.cell?.type === 'badge') {
		const items = (meta.cell.config as { items?: (SelectItem | BadgeItem)[] } | undefined)?.items
		if (items && items.length > 0) {
			// `icon` rides along: one item states the glyph, and the cell and this list both draw it.
			const asFilterItem = ({ value, label, icon }: SelectItem | BadgeItem): FilterItem =>
				icon !== undefined ? { value, label, icon } : { value, label }
			return facetMap
				? items.map((item): FilterItem => {
						const count = facetMap.get(item.value)
						const base = asFilterItem(item)
						return count !== undefined ? { ...base, count } : base
					})
				: items.map(asFilterItem)
		}
	}

	if (facetMap) {
		const out: FilterItem[] = []
		facetMap.forEach((count, raw) => {
			if (raw == null || raw === '') return
			const value = String(raw)
			out.push({ value, label: value, count })
		})
		// Stable order: highest count first, then label asc.
		out.sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || a.label.localeCompare(b.label))
		return out
	}

	return []
}

function resolveOptionLabel(rawValue: string, meta: FilterTargetMeta): string {
	const explicit = meta.filtering?.items
	if (explicit) {
		const hit = explicit.find((o) => o.value === rawValue)
		if (hit) return hit.label
	}
	if (meta.cell?.type === 'select' || meta.cell?.type === 'badge') {
		const items = (meta.cell.config as { items?: (SelectItem | BadgeItem)[] } | undefined)?.items
		const hit = items?.find((o) => o.value === rawValue)
		if (hit) return hit.label
	}
	return rawValue
}

type ValueSummary = { display: string; hasValue: boolean }

function formatBetweenValue(value: BetweenValue, anyLabel: string): ValueSummary {
	const { from, to } = value
	const fromDefined = from !== undefined && from !== ''
	const toDefined = to !== undefined && to !== ''
	if (!fromDefined && !toDefined) return { display: anyLabel, hasValue: false }
	if (fromDefined && toDefined) return { display: `${String(from)} – ${String(to)}`, hasValue: true }
	if (fromDefined) return { display: `≥ ${String(from)}`, hasValue: true }
	return { display: `≤ ${String(to)}`, hasValue: true }
}

function formatMultiValue(values: unknown[], meta: FilterTargetMeta, anyLabel: string): ValueSummary {
	if (values.length === 0) return { display: anyLabel, hasValue: false }
	const labels = values.map((v) => resolveOptionLabel(String(v), meta))
	if (labels.length <= MAX_INLINE_VALUES) return { display: labels.join(', '), hasValue: true }
	const inline = labels.slice(0, MAX_INLINE_VALUES).join(', ')
	return { display: `${inline} +${String(labels.length - MAX_INLINE_VALUES)}`, hasValue: true }
}

function formatFilterValue(
	filterValue: unknown,
	meta: FilterTargetMeta,
	anyLabel: string,
	operators: FilterOperatorDef[],
): ValueSummary {
	if (filterValue == null || filterValue === '') return { display: anyLabel, hasValue: false }

	if (typeof filterValue === 'object' && 'operator' in filterValue) {
		const sv = filterValue as StructuredFilterValue
		const op = operators.find((o) => o.id === sv.operator)
		const inner = sv.value

		// `requiresInput === false` operators (e.g. isEmpty / isNotEmpty) — show operator label.
		if (op?.requiresInput === false) {
			return { display: op.label, hasValue: true }
		}

		// Between value
		if (inner !== null && typeof inner === 'object' && ('from' in inner || 'to' in inner)) {
			return formatBetweenValue(inner, anyLabel)
		}

		// Multi value (in / notIn)
		if (Array.isArray(inner)) {
			return formatMultiValue(inner, meta, anyLabel)
		}

		// Plain inner value
		if (inner == null || inner === '') return { display: anyLabel, hasValue: false }
		return { display: String(inner), hasValue: true }
	}

	// Plain (non-operator) filter value
	if (Array.isArray(filterValue)) return formatMultiValue(filterValue, meta, anyLabel)
	return { display: String(filterValue), hasValue: true }
}

/**
 * The editor a value-taking operator calls for once the operator-specific shapes are ruled out:
 * the column's own component, then a project cell type that draws its own filter, then the
 * built-in cell type's kind. Kept in this order because it is the order the grid's own control
 * picks its renderer in.
 */
function valueEditorOf(meta: FilterTargetMeta, hasComponent: boolean, cellTypes: CellTypeRegistry): FilterEditor {
	if (hasComponent) return FilterEditor.Custom
	const cellType = meta.cell?.type
	if (cellType === undefined) return FilterEditor.Text
	if (!BUILT_IN_CELL_TYPES.has(cellType)) {
		const definition = cellTypes[cellType]
		return (definition?.filtering ?? definition?.editing) ? FilterEditor.Custom : FilterEditor.Text
	}
	return EDITOR_BY_CELL_TYPE[cellType] ?? FilterEditor.Text
}

/**
 * The operator-aware editor dispatch. The order is the grid's own: no-input operators, then
 * `between`, then the multi-value pair, then whatever renders a single value.
 */
function editorForOperator(
	operator: FilterOperatorId,
	operators: FilterOperatorDef[],
	valueEditor: FilterEditor,
): FilterEditor {
	if (operators.find((op) => op.id === operator)?.requiresInput === false) return FilterEditor.None
	if (operator === FilterOperator.Between) return FilterEditor.Between
	if (MULTI_OPERATORS.has(operator)) return FilterEditor.MultiSelect
	return valueEditor
}

/** Presets offered beside a value control — none to an operator that takes a set or no value. */
function presetsFor(
	presets: DatePreset[] | undefined,
	operator: FilterOperatorId,
	editor: FilterEditor,
	messages: GridMessages,
): DatePreset[] {
	if (!presets || editor === FilterEditor.None || editor === FilterEditor.MultiSelect) return []
	return localizeDatePresets(presetsForOperator(presets, operator), messages.operators.presets)
}

/**
 * The value the grid's own control writes when the user switches a column to `nextOperator`.
 *
 * The one place these rules live: the built-in operator select calls this too, so a panel that
 * follows it switches operators exactly the way the header does.
 */
function nextValueFor(
	nextOperator: FilterOperatorId,
	currentOperator: FilterOperatorId,
	currentValue: unknown,
	operators: FilterOperatorDef[],
): StructuredFilterValue {
	const next = operators.find((op) => op.id === nextOperator)
	if (next?.requiresInput === false) return { operator: nextOperator, value: undefined }
	if (nextOperator === FilterOperator.Between) return { operator: nextOperator, value: {} }
	if (currentOperator === FilterOperator.Between) return { operator: nextOperator, value: undefined }
	return { operator: nextOperator, value: currentValue }
}

/**
 * A filter's accessible name — `messages.filtering.placeholder` for this target. Also its visible
 * placeholder while the target sets no `filtering.placeholder` hint of its own.
 */
export function filterName(target: FilterTarget, messages: GridMessages): string {
	return messages.filtering.placeholder({ columnId: target.id, label: target.label })
}

/**
 * Resolves one filter target's model — a column's or a field's: its operators in the grid's
 * wording, the current operator and value, the editor they call for, the values on offer, the
 * presets, the debounce, the summary and the setters.
 *
 * Pure apart from `setValue`, which writes through the target. The grid's own controls render from
 * this, which is what keeps a consumer-built panel and the header agreeing.
 */
export function resolveFilter(
	target: FilterTarget,
	{ messages, tableDebounce, cellTypes }: FilterModelContext,
): FilterModel {
	const { meta } = target
	const filteringMeta = meta.filtering
	const cellType = meta.cell?.type
	const operators = filteringMeta?.operators
		? localizeOperators(filteringMeta.operators, cellType, messages.operators)
		: []
	const rawValue = target.getValue()
	const valueEditor = valueEditorOf(meta, filteringMeta?.component !== undefined, cellTypes)
	const { display, hasValue } = formatFilterValue(rawValue, meta, messages.filtering.any, operators)
	const items = resolveFilterItems(target)

	const base = {
		id: target.id,
		label: target.label,
		cellType,
		items,
		between: filteringMeta?.betweenOperator,
		debounce: filteringMeta?.debounce ?? tableDebounce,
		placeholder: filteringMeta?.placeholder ?? filterName(target, messages),
		valueDisplay: display,
		hasValue,
	}

	if (operators.length === 0) {
		return {
			...base,
			hasOperators: false,
			operators: [],
			defaultOperator: undefined,
			operator: undefined,
			value: rawValue,
			editor: valueEditor,
			editorFor: () => valueEditor,
			presets: [],
			setValue: (next: unknown) => {
				target.setValue(next)
			},
		}
	}

	const value = rawValue as StructuredFilterValue | undefined
	const defaultOperator = filteringMeta?.defaultOperator
	const operator = value?.operator ?? defaultOperator ?? operators[0]?.id ?? ''
	const editorFor = (op: FilterOperatorId): FilterEditor => editorForOperator(op, operators, valueEditor)
	const editor = editorFor(operator)

	return {
		...base,
		hasOperators: true,
		operators,
		defaultOperator,
		operator,
		value,
		editor,
		editorFor,
		presets: presetsFor(filteringMeta?.presets, operator, editor, messages),
		nextValueForOperator: (next, from) =>
			from === undefined
				? nextValueFor(next, operator, value?.value, operators)
				: nextValueFor(next, from.operator, from.value, operators),
		setValue: (next) => {
			target.setValue(next)
		},
	}
}
