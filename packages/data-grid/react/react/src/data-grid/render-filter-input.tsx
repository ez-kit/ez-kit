import { FilterOperator, GridMenuIcon, localizeDatePresets, localizeOperators } from '@ez-kit/data-grid-core'

import { GridMenuVariant, toMenuSections } from '../menu'

import { activePresetId, presetValue, presetsForOperator } from './date-presets'
import { FilterTextInput } from './filter-text-input'
import { flexRender } from './flex-render'

import type { CellTypeRegistry } from '../cell-types-context'
import type { GridMenuProps } from '../menu'
import type {
	BetweenInputProps,
	ClearFiltersButtonProps,
	InputProps,
	MultiSelectFilterProps,
	OperatorSelectProps,
} from '../types'
import type {
	InputComponentProps,
	BadgeItem,
	BetweenValue,
	DataTable,
	DatePreset,
	FieldState,
	FilterItem,
	SelectItem,
	StructuredFilterValue,
	GridMessages,
} from '@ez-kit/data-grid-core'
import type { Column, ColumnMeta, Header } from '@tanstack/table-core'
import type { ComponentType, ReactNode } from 'react'

export type RenderFilterInputArgs = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	header: Header<any, unknown>
	meta: ColumnMeta<unknown, unknown> | undefined
	Input: ComponentType<InputProps>
	cellTypes: CellTypeRegistry
	OperatorSelect: ComponentType<OperatorSelectProps>
	/** The kit's generic menu — the date-preset trigger beside a date filter renders through it. */
	Menu: ComponentType<GridMenuProps>
	/**
	 * The kit's clear button. It serves the toolbar's clear-all and, here, one column's filter —
	 * what it clears is `onClick`'s business, and the label tells the two apart.
	 */
	ClearFiltersButton: ComponentType<ClearFiltersButtonProps>
	BetweenInput: ComponentType<BetweenInputProps>
	MultiSelectFilter?: ComponentType<MultiSelectFilterProps>
	/**
	 * Table-level commit debounce (ms) for the fallback text inputs. `0` = commit on every
	 * keystroke. A column's own `filtering.debounce` overrides it.
	 */
	debounce: number
	/**
	 * The grid's resolved dictionary — the placeholders below come from it, never from a literal
	 * in this module. Required, unlike `table`: a filter input with no placeholder is a worse
	 * stub than one with no draft support.
	 */
	messages: GridMessages
	/**
	 * The live table instance, used only to wire "Enter applies the whole draft" on the
	 * fallback text inputs under `draft`. Optional so existing callers/tests that
	 * construct a minimal `header` stub need not also fabricate a table.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	table?: DataTable<any>
}

/**
 * Resolves the option list for multi-value (`in` / `notIn`) filters.
 *
 * Priority:
 * 1. `column.filtering.items` (explicit, wins over both other sources).
 * 2. `cell.config.items` for `select` / `badge` cell types.
 * 3. `column.getFacetedUniqueValues()` when faceted is enabled and no explicit items.
 *
 * Counts from `getFacetedUniqueValues()` are always merged onto whichever option set
 * is returned when faceted is enabled.
 */
function resolveFilterItems(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	column: Column<any>,
	meta: ColumnMeta<unknown, unknown> | undefined,
): FilterItem[] {
	const filteringMeta = meta?.filtering === false ? undefined : meta?.filtering
	const facetedEnabled = filteringMeta?.faceted === true
	const facetMap = facetedEnabled ? (column.getFacetedUniqueValues() as Map<unknown, number> | undefined) : undefined

	const explicit = filteringMeta?.items
	if (explicit && explicit.length > 0) {
		return facetMap
			? explicit.map((opt): FilterItem => {
					const count = facetMap.get(opt.value)
					return count !== undefined ? { ...opt, count } : opt
				})
			: explicit
	}

	if (meta?.cell?.type === 'select' || meta?.cell?.type === 'badge') {
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

/** A preset's label in the table's own wording — the dictionary keys the built-ins by id. */
function localizePresetLabel(preset: DatePreset, messages: GridMessages): string {
	const [localized] = localizeDatePresets([preset], messages.operators.presets)
	return localized?.label ?? preset.label
}

/**
 * Renders the input(s) for a column filter. Handles three layers, in order:
 *
 * 1. Operator-aware path — when `meta.filtering.operators` is set, dispatches based
 *    on the current operator id (between → BetweenInput, no-input operators →
 *    only the OperatorSelect, otherwise the column / cell-type / fallback input).
 * 2. Plain path — when there are no operators, uses `column.filtering.component`,
 *    then the cell-type registry, then a plain text Input.
 */
export function renderFilterInput({
	header,
	meta,
	Input,
	cellTypes,
	OperatorSelect,
	Menu,
	ClearFiltersButton,
	BetweenInput,
	MultiSelectFilter,
	debounce: tableDebounce,
	messages,
	table,
}: RenderFilterInputArgs): ReactNode {
	const filteringMeta = meta?.filtering === false ? undefined : meta?.filtering
	// Core settled *which* operators the column offers; the dictionary says what they are
	// called. Applied here, where they reach the control, so the exported operator lists stay
	// the plain data they are.
	const resolvedOperators = filteringMeta?.operators
		? localizeOperators(filteringMeta.operators, meta?.cell?.type, messages.operators)
		: undefined
	// A column's own `filtering.debounce` wins over the table's, the same way `editing.debounce`
	// and `creating.debounce` do at their two levels. One dear endpoint can wait a second while
	// the rest of the grid stays responsive.
	const columnDebounce = filteringMeta?.debounce
	const debounce = columnDebounce ?? tableDebounce
	// Enter in a fallback text input applies the whole pending draft — sorting, filters and
	// search commit together in one request. `undefined` under non-deferred tables so Enter
	// keeps whatever meaning it has today (e.g. form submission).
	const onEnterApply =
		table?.options.draft === true
			? () => {
					table.draft.apply()
				}
			: undefined

	// ── operator-aware path ────────────────────────────────────────────────
	if (filteringMeta && resolvedOperators && resolvedOperators.length > 0) {
		const sv = header.column.getFilterValue() as StructuredFilterValue | undefined
		const currentOperatorId =
			sv !== undefined ? sv.operator : (filteringMeta.defaultOperator ?? resolvedOperators.at(0)?.id ?? '')
		const currentOperator = resolvedOperators.find((op) => op.id === currentOperatorId)
		const inputValue = sv?.value

		const onOperatorChange = (newOpId: string): void => {
			const newOp = resolvedOperators.find((op) => op.id === newOpId)
			let newValue: unknown
			if (newOp?.requiresInput === false) {
				newValue = undefined
			} else if (newOpId === 'between') {
				newValue = {}
			} else if (currentOperatorId === 'between') {
				newValue = undefined
			} else {
				newValue = inputValue
			}
			header.column.setFilterValue({ operator: newOpId, value: newValue })
		}

		const onValueChange = (v: unknown): void => {
			header.column.setFilterValue({ operator: currentOperatorId, value: v })
		}

		const operatorSelect = (
			<OperatorSelect
				operators={resolvedOperators}
				currentOperatorId={currentOperatorId}
				onChange={onOperatorChange}
			/>
		)

		if (currentOperator?.requiresInput === false) {
			return operatorSelect
		}

		// The presets sit beside whichever control the current operator renders, not inside it:
		// every branch below that takes a value gets them. `in` / `notIn` is the exception — a
		// multi-select takes a set of column values, which no date preset names.
		// `between` draws a range picker and the rest draw a single date input, and both take a
		// preset. The menu offers only the kind the operator can accept.
		const offeredPresets = filteringMeta.presets ? presetsForOperator(filteringMeta.presets, currentOperatorId) : []
		const activeId = activePresetId(offeredPresets, inputValue)
		const activePreset = offeredPresets.find((preset) => preset.id === activeId)
		const presetMenu =
			offeredPresets.length > 0 ? (
				<Menu
					variant={GridMenuVariant.Filter}
					triggerIcon={GridMenuIcon.Calendar}
					{...(activePreset ? { triggerLabel: localizePresetLabel(activePreset, messages) } : {})}
					aria-label={messages.filtering.presets}
					sections={toMenuSections([
						{
							id: 'date-presets',
							items: offeredPresets.map((preset) => ({
								id: preset.id,
								label: localizePresetLabel(preset, messages),
								onAction: () => {
									header.column.setFilterValue({
										operator: currentOperatorId,
										value: presetValue(preset),
									})
								},
							})),
						},
					])}
				/>
			) : null

		// Shown only with something to clear. A text or number filter can be emptied by hand, but a
		// date picker and a multi-select cannot — the filter could be changed and never taken off,
		// which on a narrow range leaves the grid empty with no way out of it.
		const clearButton =
			inputValue === undefined || inputValue === '' ? null : (
				<ClearFiltersButton
					disabled={false}
					onClick={() => {
						header.column.setFilterValue(undefined)
					}}
					aria-label={messages.filtering.clear}
				/>
			)

		if (currentOperatorId === FilterOperator.Between) {
			const betweenCfg = filteringMeta.betweenOperator
			const betweenType = meta?.cell?.type === 'date' ? 'date' : 'number'
			return (
				<>
					<div data-slot='filter-control'>
						<BetweenInput
							value={(inputValue as BetweenValue | undefined) ?? {}}
							onChange={onValueChange}
							type={betweenType}
							{...(betweenCfg?.slider === true ? { slider: true } : {})}
							{...(betweenCfg?.min !== undefined ? { min: betweenCfg.min } : {})}
							{...(betweenCfg?.max !== undefined ? { max: betweenCfg.max } : {})}
						/>
						{presetMenu}
						{clearButton}
					</div>
					{operatorSelect}
				</>
			)
		}

		if ((currentOperatorId === 'in' || currentOperatorId === 'notIn') && MultiSelectFilter) {
			const items = resolveFilterItems(header.column, meta)
			const selectedValues = Array.isArray(inputValue) ? (inputValue as string[]) : []
			return (
				<>
					<MultiSelectFilter
						items={items}
						selectedValues={selectedValues}
						onChange={onValueChange}
						placeholder={messages.filtering.placeholder({ columnId: header.column.id })}
					/>
					{operatorSelect}
				</>
			)
		}

		// column-level filtering.component
		const columnFilterInput = filteringMeta.component as ((props: InputComponentProps) => ReactNode) | undefined
		if (columnFilterInput) {
			return (
				<>
					<div data-slot='filter-control'>
						{flexRender(columnFilterInput, {
							value: inputValue,
							onChange: onValueChange,
							...(meta?.cell?.config !== undefined ? { config: meta.cell.config } : {}),
						})}
						{presetMenu}
						{clearButton}
					</div>
					{operatorSelect}
				</>
			)
		}

		// registry by cell type
		const cellTypeId = meta?.cell?.type
		if (cellTypeId) {
			const def = cellTypes[cellTypeId]
			const comp = def?.filtering ?? def?.editing
			if (comp) {
				const field: FieldState = {
					id: `filter-${header.column.id}`,
					value: inputValue,
					onChange: onValueChange,
					onBlur: () => {},
					...(meta.cell?.config !== undefined ? { config: meta.cell.config } : {}),
					error: undefined,
					errors: [],
					isValidating: false,
				}
				return (
					<>
						<div data-slot='filter-control'>
							{/* Mounted, not called: invoking a renderer as `Comp(props)` smuggles its hooks into
							    this header cell's fiber, and swapping one renderer for another — which is what
							    changing the operator does — reorders them. */}
							{flexRender(comp, field)}
							{presetMenu}
							{clearButton}
						</div>
						{operatorSelect}
					</>
				)
			}
		}

		return (
			<>
				<div data-slot='filter-control'>
					<FilterTextInput
						Input={Input}
						placeholder={messages.filtering.placeholder({ columnId: header.column.id })}
						value={(inputValue ?? '') as string}
						onCommit={onValueChange}
						debounce={debounce}
						{...(onEnterApply ? { onEnterApply } : {})}
					/>
					{presetMenu}
					{clearButton}
				</div>
				{operatorSelect}
			</>
		)
	}

	// ── plain filter path (no operators) ──────────────────────────────────
	const filterValue = header.column.getFilterValue()
	const onChange = (v: unknown) => {
		header.column.setFilterValue(v)
	}

	if (filteringMeta !== undefined) {
		const comp = filteringMeta.component as ((props: InputComponentProps) => ReactNode) | undefined
		if (comp)
			return flexRender(comp, {
				value: filterValue,
				onChange,
				...(meta?.cell?.config !== undefined ? { config: meta.cell.config } : {}),
			})
	}

	const plainCellTypeId = meta?.cell?.type
	if (plainCellTypeId) {
		const def = cellTypes[plainCellTypeId]
		const comp = def?.filtering ?? def?.editing
		if (comp) {
			const field: FieldState = {
				id: `filter-${header.column.id}`,
				value: filterValue,
				onChange,
				onBlur: () => {},
				...(meta.cell?.config !== undefined ? { config: meta.cell.config } : {}),
				error: undefined,
				errors: [],
				isValidating: false,
			}
			return (comp as (p: FieldState) => ReactNode)(field)
		}
	}

	return (
		<FilterTextInput
			Input={Input}
			placeholder={messages.filtering.placeholder({ columnId: header.column.id })}
			value={(filterValue ?? '') as string}
			onCommit={onChange}
			debounce={debounce}
			{...(onEnterApply ? { onEnterApply } : {})}
		/>
	)
}
