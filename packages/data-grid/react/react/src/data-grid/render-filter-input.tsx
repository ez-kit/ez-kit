import { BetweenInputVariant, DATE_RANGE_PRESETS } from '@ez-kit/data-grid-core'

import { FilterTextInput } from './filter-text-input'
import { flexRender } from './flex-render'

import type { CellInputProps, CellTypeRegistry } from '../cell-types-context'
import type { BetweenInputProps, InputProps, MultiSelectFilterProps, OperatorSelectProps } from '../types'
import type {
	BadgeItem,
	BetweenValue,
	DataTable,
	DateRangePreset,
	FieldState,
	FilterItem,
	SelectItem,
	StructuredFilterValue,
	BetweenInputType,
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
	BetweenInput: ComponentType<BetweenInputProps>
	MultiSelectFilter?: ComponentType<MultiSelectFilterProps>
	/** Commit debounce (ms) for the fallback text inputs. `0` = commit on every keystroke. */
	debounce: number
	/**
	 * The live table instance, used only to wire "Enter applies the whole draft" on the
	 * fallback text inputs under `deferredApply`. Optional so existing callers/tests that
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
	meta: ColumnMeta<unknown, unknown>,
): FilterItem[] {
	const facetedEnabled = meta.facetedEnabled === true
	const facetMap = facetedEnabled ? (column.getFacetedUniqueValues() as Map<unknown, number> | undefined) : undefined

	const explicit = meta.filteringItems
	if (explicit && explicit.length > 0) {
		return facetMap
			? explicit.map((opt): FilterItem => {
					const count = facetMap.get(opt.value)
					return count !== undefined ? { ...opt, count } : opt
				})
			: explicit
	}

	if (meta.cellType === 'select' || meta.cellType === 'badge') {
		const items = (meta.config as { items?: (SelectItem | BadgeItem)[] } | undefined)?.items
		if (items && items.length > 0) {
			return facetMap
				? items.map((item): FilterItem => {
						const count = facetMap.get(item.value)
						return count !== undefined
							? { value: item.value, label: item.label, count }
							: { value: item.value, label: item.label }
					})
				: items.map((item): FilterItem => ({ value: item.value, label: item.label }))
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

/**
 * Resolves the preset list for a `between` operator config.
 * - Only applies to date-typed columns; number columns ignore presets.
 * - `true` → built-in {@link DATE_RANGE_PRESETS}
 * - array → custom list as-is
 * - `false` / undefined → `undefined` (no preset row)
 */
function resolveBetweenPresets(
	configPresets: boolean | DateRangePreset[] | undefined,
	betweenType: BetweenInputType,
): DateRangePreset[] | undefined {
	if (betweenType !== 'date') return undefined
	if (configPresets === true) return DATE_RANGE_PRESETS
	if (Array.isArray(configPresets) && configPresets.length > 0) return configPresets
	return undefined
}

/**
 * Renders the input(s) for a column filter. Handles three layers, in order:
 *
 * 1. Operator-aware path — when `meta.resolvedOperators` is set, dispatches based
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
	BetweenInput,
	MultiSelectFilter,
	debounce,
	table,
}: RenderFilterInputArgs): ReactNode {
	const resolvedOperators = meta?.resolvedOperators
	// Enter in a fallback text input applies the whole pending draft — sorting, filters and
	// search commit together in one request. `undefined` under non-deferred tables so Enter
	// keeps whatever meaning it has today (e.g. form submission).
	const onEnterApply =
		table?.options.deferredApply === true
			? () => {
					table.draft.apply()
				}
			: undefined

	// ── operator-aware path ────────────────────────────────────────────────
	if (resolvedOperators && resolvedOperators.length > 0) {
		const sv = header.column.getFilterValue() as StructuredFilterValue | undefined
		const currentOperatorId =
			sv !== undefined ? sv.operator : (meta.defaultOperatorId ?? resolvedOperators.at(0)?.id ?? '')
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

		if (currentOperatorId === 'between') {
			const betweenCfg = meta.betweenOperatorConfig
			const betweenType = meta.cellType === 'date' ? 'date' : 'number'
			const resolvedPresets = resolveBetweenPresets(betweenCfg?.presets, betweenType)
			const onPresetSelect = resolvedPresets
				? (preset: DateRangePreset) => {
						header.column.setFilterValue({ operator: 'between', value: preset.getRange() })
					}
				: undefined
			return (
				<>
					<BetweenInput
						value={(inputValue as BetweenValue | undefined) ?? {}}
						onChange={onValueChange}
						variant={betweenCfg?.variant ?? BetweenInputVariant.Inputs}
						type={betweenType}
						{...(betweenCfg?.min !== undefined ? { min: betweenCfg.min } : {})}
						{...(betweenCfg?.max !== undefined ? { max: betweenCfg.max } : {})}
						{...(resolvedPresets ? { presets: resolvedPresets } : {})}
						{...(onPresetSelect ? { onPresetSelect } : {})}
					/>
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
						placeholder={`Filter ${header.column.id}…`}
					/>
					{operatorSelect}
				</>
			)
		}

		// column-level filtering.component
		const filteringCfg = meta.filtering
		if (filteringCfg !== false && filteringCfg !== undefined) {
			const comp = (filteringCfg as { component?: (props: CellInputProps) => ReactNode }).component
			if (comp) {
				return (
					<>
						{flexRender(comp, {
							value: inputValue,
							onChange: onValueChange,
							...(meta.config !== undefined ? { config: meta.config } : {}),
						})}
						{operatorSelect}
					</>
				)
			}
		}

		// registry by cellType
		if (meta.cellType) {
			const def = cellTypes[meta.cellType]
			const comp = def?.filter ?? def?.edit
			if (comp) {
				const field: FieldState = {
					id: `filter-${header.column.id}`,
					value: inputValue,
					onChange: onValueChange,
					onBlur: () => {},
					...(meta.config !== undefined ? { config: meta.config } : {}),
					error: undefined,
					errors: [],
					isValidating: false,
				}
				return (
					<>
						{(comp as (p: FieldState) => ReactNode)(field)}
						{operatorSelect}
					</>
				)
			}
		}

		return (
			<>
				<FilterTextInput
					Input={Input}
					placeholder={`Filter ${header.column.id}…`}
					value={(inputValue ?? '') as string}
					onCommit={onValueChange}
					debounce={debounce}
					{...(onEnterApply ? { onEnterApply } : {})}
				/>
				{operatorSelect}
			</>
		)
	}

	// ── plain filter path (no operators) ──────────────────────────────────
	const filterValue = header.column.getFilterValue()
	const onChange = (v: unknown) => {
		header.column.setFilterValue(v)
	}

	const filteringConfig = meta?.filtering
	if (filteringConfig !== false && filteringConfig !== undefined) {
		const comp = (filteringConfig as { component?: (props: CellInputProps) => ReactNode }).component
		if (comp)
			return flexRender(comp, {
				value: filterValue,
				onChange,
				...(meta.config !== undefined ? { config: meta.config } : {}),
			})
	}

	if (meta?.cellType) {
		const def = cellTypes[meta.cellType]
		const comp = def?.filter ?? def?.edit
		if (comp) {
			const field: FieldState = {
				id: `filter-${header.column.id}`,
				value: filterValue,
				onChange,
				onBlur: () => {},
				...(meta.config !== undefined ? { config: meta.config } : {}),
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
			placeholder={`Filter ${header.column.id}…`}
			value={(filterValue ?? '') as string}
			onCommit={onChange}
			debounce={debounce}
			{...(onEnterApply ? { onEnterApply } : {})}
		/>
	)
}
