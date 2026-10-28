import { BASE_CELL_TYPE_IDS, OperatorInput, localizeDatePresets } from '@ez-kit/data-grid-core'

import {
	ItemsSourceSlot,
	labelListOf,
	optionsListOf,
	PENDING_SNAPSHOT,
	resolveItem,
	staticSnapshot,
} from '../items-source'

import { presetsForOperator } from './date-presets'
import { configWithItems } from './items-view'
import { inputOf, toOperatorOptions } from './operator-input'

import type { CellTypeRegistry } from '../cell-types-context'
import type { ItemsLists, ListSnapshot, ListItem, ListSpec } from '../items-source'
import type { FilterOperatorOption } from '../types'
import type { FilterTarget, FilterTargetMeta } from './filter-target'
import type {
	BetweenOperatorConfig,
	BetweenValue,
	DatePreset,
	FilterItem,
	FilterOperatorDef,
	FilterOperatorId,
	GridMessages,
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
	/** A {@link BetweenValue} range — an operator with `input: 'range'` (`between`). */
	Between: 'between',
	/** A set of {@link FilterModel.items} — an operator with `input: 'list'` (`in`, `notIn`). */
	MultiSelect: 'multiSelect',
	/** No value at all — an operator with `input: 'none'` (`isEmpty`, `isNotEmpty`). */
	None: 'none',
	/** The column's own `filtering.component`, or a project cell type's own filter renderer. */
	Custom: 'custom',
} as const

export type FilterEditor = (typeof FilterEditor)[keyof typeof FilterEditor]

/** What {@link resolveFilter} reads besides the target itself. */
export type FilterModelContext = {
	/** The grid's resolved dictionary — preset labels come from it; operator labels do not. */
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
	 *
	 * A `count` the list's own source states is kept over a faceted one; with any count source at
	 * all, a value nobody counted carries `0`, and with none `count` is absent.
	 */
	items: FilterItem[]
	/**
	 * `true` while {@link FilterModelBase.items} is not there yet — it comes from a `useItems` hook
	 * that has not answered. `false` for a fixed list and for faceted values.
	 */
	itemsLoading: boolean
	/** What that hook failed with; `undefined` when it did not, and for any other list. */
	itemsError: unknown
	/**
	 * The `config` the filter's renderers get: `cell.config` with `filtering.config` laid over it,
	 * `items` replaced by {@link FilterModelBase.items}' source list for a `select` / `badge`.
	 * Exactly as written otherwise — the grid reads none of it. `undefined` when the target states
	 * no config, no layer and no list.
	 */
	config: Readonly<Record<string, unknown>> | undefined
	/** The column's date presets the current operator can take, labelled from the dictionary. */
	presets: DatePreset[]
	/** The range control's bounds and slider flag, when the column states them. */
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
	/**
	 * The column's operators, each with the `label` and `icon` of its definition — see
	 * {@link FilterOperatorOption}.
	 */
	operators: FilterOperatorOption[]
	defaultOperator: FilterOperatorId | undefined
	/** The current value's operator, else {@link OperatorFilterModel.defaultOperator}. */
	operator: FilterOperatorId
	/** The current filter, or `undefined` when the column is not filtered. */
	value: StructuredFilterValue | undefined
	/**
	 * The value the grid's own control writes when the user picks `operator`, by the `input` of
	 * the two operators: no value for one that takes none, an empty range entering a range, no
	 * value between two different inputs, the current value between two of the same. Computes only
	 * — nothing is written.
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

/** The editor a built-in cell type calls for, when the operator's `input` does not decide one. */
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

/** A list read off the meta alone — a fixed list as loaded, a hook list as not answered yet. */
function snapshotOf(spec: ListSpec | undefined): ListSnapshot | undefined {
	if (spec === undefined) return undefined
	return spec.useItems === undefined ? staticSnapshot(spec.items) : PENDING_SNAPSHOT
}

/**
 * The target's two lists: the ones a subscribed component put on it, else what the meta states.
 * The fallback is what keeps the model a pure function a test can call with a hand-built target.
 */
function listsOf(target: FilterTarget): ItemsLists {
	if (target.lists) return target.lists
	return {
		options: snapshotOf(optionsListOf(target.meta, ItemsSourceSlot.Filtering)),
		labels: snapshotOf(labelListOf(target.meta, ItemsSourceSlot.Filtering)),
	}
}

/** An item as the filter offers it — `icon` and `count` ride along, a badge's `variant` does not. */
function toFilterItem({ value, label, icon, count }: ListItem): FilterItem {
	return {
		value,
		label,
		...(icon !== undefined ? { icon } : {}),
		...(count !== undefined ? { count } : {}),
	}
}

/**
 * Counts merged onto a list, in the order D6 of the async-items design settles:
 *
 * - a `count` the list's own source states is kept — a server's total beats a page's tally;
 * - faceted counts fill the items that carry none;
 * - when anything counts at all (facets, or any item with a `count`), an item nobody counted gets
 *   `0`, which a multi-select shows and keeps selectable. With nothing counting, `count` stays
 *   `undefined` — "no count", not "none".
 */
function withCounts(items: readonly ListItem[], facetMap: Map<unknown, number> | undefined): FilterItem[] {
	const counted = facetMap !== undefined || items.some((item) => item.count !== undefined)
	// Facets are keyed by the raw cell value and an item's `value` is a string, so a number or
	// boolean column matches only once both sides are strings.
	const counts = facetMap ? stringKeyed(facetMap) : undefined
	return items.map((item) => {
		const base = toFilterItem(item)
		if (base.count !== undefined || !counted) return base
		return { ...base, count: counts?.get(item.value) ?? 0 }
	})
}

/** The facet counts by `String(value)`, summing values that print the same. */
function stringKeyed(facetMap: Map<unknown, number>): Map<string, number> {
	const out = new Map<string, number>()
	facetMap.forEach((count, raw) => {
		if (raw == null) return
		const key = String(raw)
		out.set(key, (out.get(key) ?? 0) + count)
	})
	return out
}

/**
 * The column's faceted unique values as filter items, labelled from `getItem` of a row that has
 * each value when the column states one, else by the value itself.
 */
function facetedItems(facetMap: Map<unknown, number>, index: ReadonlyMap<string, ListItem> | undefined): FilterItem[] {
	const out: FilterItem[] = []
	facetMap.forEach((count, raw) => {
		if (raw == null || raw === '') return
		const value = String(raw)
		const item = index?.get(value)
		out.push(item ? { ...toFilterItem(item), value, count } : { value, label: value, count })
	})
	// Stable order: highest count first, then label asc.
	out.sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || a.label.localeCompare(b.label))
	return out
}

/**
 * Resolves the option list for select and multi-value filters.
 *
 * Priority:
 * 1. `filtering.useItems` / `filtering.items` (the filter's own list).
 * 2. `cell.config.useItems` / `cell.config.items` for `select` / `badge` cell types — the base.
 * 3. The column's faceted unique values when faceted is enabled and no list is stated — never
 *    for a field, which has no rows of its own.
 *
 * Counts are merged by {@link withCounts}.
 */
function resolveFilterItems(target: FilterTarget, options: ListSnapshot | undefined): FilterItem[] {
	const facetedEnabled = target.meta.filtering?.faceted === true
	const facetMap = facetedEnabled ? target.facetedValues?.() : undefined
	if (options !== undefined) return withCounts(options.items, facetMap)
	if (facetMap) return facetedItems(facetMap, target.facetedIndex?.())
	return []
}

/** What labels a value in this target's summary: its labelling list, then the faceted rows. */
type LabelSources = { labels: ListSnapshot | undefined; facetedIndex: ReadonlyMap<string, ListItem> | undefined }

function resolveOptionLabel(rawValue: string, sources: LabelSources): string {
	return resolveItem(rawValue, sources).item?.label ?? rawValue
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

function formatMultiValue(values: unknown[], sources: LabelSources, anyLabel: string): ValueSummary {
	if (values.length === 0) return { display: anyLabel, hasValue: false }
	const labels = values.map((v) => resolveOptionLabel(String(v), sources))
	if (labels.length <= MAX_INLINE_VALUES) return { display: labels.join(', '), hasValue: true }
	const inline = labels.slice(0, MAX_INLINE_VALUES).join(', ')
	return { display: `${inline} +${String(labels.length - MAX_INLINE_VALUES)}`, hasValue: true }
}

function formatFilterValue(
	filterValue: unknown,
	sources: LabelSources,
	anyLabel: string,
	operators: FilterOperatorDef[],
): ValueSummary {
	if (filterValue == null || filterValue === '') return { display: anyLabel, hasValue: false }

	if (typeof filterValue === 'object' && 'operator' in filterValue) {
		const sv = filterValue as StructuredFilterValue
		const op = operators.find((o) => o.id === sv.operator)
		const inner = sv.value

		// An operator that takes no value (e.g. isEmpty / isNotEmpty) — show its label.
		if (op?.input === OperatorInput.None) {
			return { display: op.label, hasValue: true }
		}

		// Between value
		if (inner !== null && typeof inner === 'object' && ('from' in inner || 'to' in inner)) {
			return formatBetweenValue(inner, anyLabel)
		}

		// Multi value (in / notIn)
		if (Array.isArray(inner)) {
			return formatMultiValue(inner, sources, anyLabel)
		}

		// Plain inner value — a select's one value is labelled like a multi-select's many.
		if (inner == null || inner === '') return { display: anyLabel, hasValue: false }
		return { display: resolveOptionLabel(String(inner), sources), hasValue: true }
	}

	// Plain (non-operator) filter value
	if (Array.isArray(filterValue)) return formatMultiValue(filterValue, sources, anyLabel)
	return { display: resolveOptionLabel(String(filterValue), sources), hasValue: true }
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

/** The editor each kind of operator value calls for, beside a single value's own editor. */
const EDITOR_BY_INPUT: Partial<Record<OperatorInput, FilterEditor>> = {
	[OperatorInput.None]: FilterEditor.None,
	[OperatorInput.Range]: FilterEditor.Between,
	[OperatorInput.List]: FilterEditor.MultiSelect,
}

/**
 * The operator-aware editor dispatch, by the operator's `input`: none, a range and a list each have
 * an editor of their own, and a single value — or an id the column does not offer — gets the
 * column's value editor.
 */
function editorForOperator(
	operator: FilterOperatorId,
	operators: FilterOperatorDef[],
	valueEditor: FilterEditor,
): FilterEditor {
	const input = inputOf(operators, operator)
	return (input !== undefined ? EDITOR_BY_INPUT[input] : undefined) ?? valueEditor
}

/** Presets offered beside a value control — the kind the current operator's `input` takes. */
function presetsFor(
	presets: DatePreset[] | undefined,
	input: OperatorInput | undefined,
	messages: GridMessages,
): DatePreset[] {
	if (!presets) return []
	return localizeDatePresets(presetsForOperator(presets, input), messages.filtering.presets)
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
	const nextInput = inputOf(operators, nextOperator)
	const currentInput = inputOf(operators, currentOperator)
	if (nextInput === OperatorInput.None) return { operator: nextOperator, value: undefined }
	// A value of the same shape carries over — between two ranges as between two single values.
	if (nextInput === currentInput) return { operator: nextOperator, value: currentValue }
	if (nextInput === OperatorInput.Range) return { operator: nextOperator, value: {} }
	// A value of another shape is one the next operator cannot take.
	return { operator: nextOperator, value: undefined }
}

/**
 * A filter's accessible name — `messages.filtering.placeholder` for this target. Also its visible
 * placeholder while the target sets no `filtering.placeholder` hint of its own.
 */
export function filterName(target: FilterTarget, messages: GridMessages): string {
	return messages.filtering.placeholder({ columnId: target.id, label: target.label })
}

/**
 * Resolves one filter target's model — a column's or a field's: its operators as their
 * definitions state them, the current operator and value, the editor they call for, the values on offer, the
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
	const operators = filteringMeta?.operators ? toOperatorOptions(filteringMeta.operators) : []
	const rawValue = target.getValue()
	const valueEditor = valueEditorOf(meta, filteringMeta?.component !== undefined, cellTypes)
	const lists = listsOf(target)
	const labelSources: LabelSources = { labels: lists.labels, facetedIndex: target.facetedIndex?.() }
	const { display, hasValue } = formatFilterValue(rawValue, labelSources, messages.filtering.any, operators)
	const items = resolveFilterItems(target, lists.options)

	const base = {
		id: target.id,
		label: target.label,
		cellType,
		items,
		itemsLoading: lists.options?.isLoading ?? false,
		itemsError: lists.options?.error,
		config: configWithItems(meta, ItemsSourceSlot.Filtering, lists.options),
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
		presets: presetsFor(filteringMeta?.presets, inputOf(operators, operator), messages),
		nextValueForOperator: (next, from) =>
			from === undefined
				? nextValueFor(next, operator, value?.value, operators)
				: nextValueFor(next, from.operator, from.value, operators),
		setValue: (next) => {
			target.setValue(next)
		},
	}
}
