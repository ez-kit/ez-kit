import { GridMenuIcon } from '@ez-kit/data-grid-core'

import { GridMenuVariant, toMenuSections } from '../menu'

import { FilterEditor, resolveColumnFilter } from './column-filter-model'
import { activePresetId, presetValue } from './date-presets'
import { FilterTextInput } from './filter-text-input'
import { flexRender } from './flex-render'
import { VisuallyHiddenLabel } from './visually-hidden'

import type { CellTypeRegistry } from '../cell-types-context'
import type { GridMenuProps } from '../menu'
import type {
	DataTable,
	ErasedRow,
	GridFeatures,
	BetweenInputProps,
	ClearFilterButtonProps,
	InputProps,
	MultiSelectFilterProps,
	OperatorSelectProps,
} from '../types'
import type { ColumnFilterModel, OperatorColumnFilterModel } from './column-filter-model'
import type {
	FormColumnMeta,
	InputComponentProps,
	BetweenValue,
	FieldState,
	GridMessages,
} from '@ez-kit/data-grid-core'
import type { Header } from '@tanstack/table-core'
import type { ComponentType, ReactNode } from 'react'

export type RenderFilterInputArgs<TRow extends object = ErasedRow> = {
	header: Header<GridFeatures, TRow>
	meta: FormColumnMeta | undefined
	Input: ComponentType<InputProps>
	cellTypes: CellTypeRegistry
	OperatorSelect: ComponentType<OperatorSelectProps>
	/** The kit's generic menu — the date-preset trigger beside a date filter renders through it. */
	Menu: ComponentType<GridMenuProps>
	/**
	 * The kit's clear button. It serves the toolbar's clear-all and, here, one column's filter —
	 * what it clears is `onClick`'s business, and the label tells the two apart.
	 */
	ClearFilterButton: ComponentType<ClearFilterButtonProps>
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
	table?: DataTable<GridFeatures, TRow>
	/**
	 * The column's filter model, when the caller already resolved it — the filter panel does, to
	 * hand the same model to a consumer. Resolved here otherwise.
	 */
	model?: ColumnFilterModel
}

/**
 * Renders the input(s) for a column filter, from the column's resolved filter model. Two paths:
 *
 * 1. Operator-aware path — when the column has operators, dispatches on the model's `editor`
 *    (`none` → only the OperatorSelect, `between` → BetweenInput, `multiSelect` → the kit's
 *    multi-select, otherwise the column / cell-type / fallback input).
 * 2. Plain path — when there are no operators, uses `column.filtering.component`,
 *    then the cell-type registry, then a plain text Input.
 *
 * The model is the same one `<DataGrid.FilterPanel>` hands a consumer, which is what keeps a
 * panel built on a kit's own filter controls in step with the header.
 */
export function renderFilterInput<TRow extends object>({
	header,
	meta,
	Input,
	cellTypes,
	OperatorSelect,
	Menu,
	ClearFilterButton,
	BetweenInput,
	MultiSelectFilter,
	debounce: tableDebounce,
	messages,
	table,
	model: resolvedModel,
}: RenderFilterInputArgs<TRow>): ReactNode {
	const filteringMeta = meta?.filtering === false ? undefined : meta?.filtering
	const model = resolvedModel ?? resolveColumnFilter(header.column, { messages, tableDebounce, cellTypes })
	// A column's own `filtering.debounce` wins over the table's, the same way `editing.debounce`
	// and `creating.debounce` do at their two levels. One dear endpoint can wait a second while
	// the rest of the grid stays responsive.
	const { debounce } = model
	// Enter in a fallback text input applies the whole pending draft — sorting, filters and
	// search commit together in one request. `undefined` under non-deferred tables so Enter
	// keeps whatever meaning it has today (e.g. form submission).
	const onEnterApply =
		table?.options.draft === true
			? () => {
					table.draft.apply()
				}
			: undefined

	/**
	 * The control's accessible name, and the id a `<label htmlFor>` binds it by.
	 *
	 * One name for every branch below, taken from the same dictionary entry the placeholder uses:
	 * "Filter <column>" is what the control is, whichever operator is current. Without it the
	 * filter inputs are anonymous — axe reports `label` (critical) on every filtered column, in
	 * both kits.
	 *
	 * Two routes, because the branches render two different kinds of control. A cell type's own
	 * component is the kit's, and only some of them forward `aria-label` — but every one honours
	 * `FieldState.id`, so those get the visually-hidden `<label htmlFor>`. The fallback text input
	 * goes through the kit's `core.Input`, which is `InputHTMLAttributes<HTMLInputElement>`, so
	 * that one takes the attribute directly and needs no label element.
	 */
	const fieldId = `filter-${header.column.id}`
	const fieldName = messages.filtering.placeholder({ columnId: header.column.id })
	const fieldLabel = <VisuallyHiddenLabel htmlFor={fieldId}>{fieldName}</VisuallyHiddenLabel>

	// ── operator-aware path ────────────────────────────────────────────────
	if (filteringMeta && model.hasOperators) {
		return renderOperatorFilter({
			model,
			meta,
			filteringMeta,
			Input,
			cellTypes,
			OperatorSelect,
			Menu,
			ClearFilterButton,
			BetweenInput,
			MultiSelectFilter,
			messages,
			fieldId,
			fieldName,
			fieldLabel,
			onEnterApply,
		})
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
				id: fieldId,
				value: filterValue,
				onChange,
				onBlur: () => {},
				...(meta.cell?.config !== undefined ? { config: meta.cell.config } : {}),
				error: undefined,
				errors: [],
				isValidating: false,
			}
			return (
				<>
					{fieldLabel}
					{flexRender(comp, field)}
				</>
			)
		}
	}

	return (
		<FilterTextInput
			Input={Input}
			placeholder={fieldName}
			aria-label={fieldName}
			value={(filterValue ?? '') as string}
			onCommit={onChange}
			debounce={debounce}
			{...(onEnterApply ? { onEnterApply } : {})}
		/>
	)
}

type OperatorFilterArgs = Pick<
	RenderFilterInputArgs,
	'meta' | 'Input' | 'cellTypes' | 'OperatorSelect' | 'Menu' | 'ClearFilterButton' | 'BetweenInput' | 'messages'
> & {
	MultiSelectFilter: ComponentType<MultiSelectFilterProps> | undefined
	model: OperatorColumnFilterModel
	filteringMeta: Exclude<FormColumnMeta['filtering'], false | undefined>
	fieldId: string
	fieldName: string
	fieldLabel: ReactNode
	onEnterApply: (() => void) | undefined
}

/** The operator-aware branch of {@link renderFilterInput}, dispatched on the model's `editor`. */
function renderOperatorFilter({
	model,
	meta,
	filteringMeta,
	Input,
	cellTypes,
	OperatorSelect,
	Menu,
	ClearFilterButton,
	BetweenInput,
	MultiSelectFilter,
	messages,
	fieldId,
	fieldName,
	fieldLabel,
	onEnterApply,
}: OperatorFilterArgs): ReactNode {
	const inputValue = model.value?.value
	const currentOperatorId = model.operator

	const onValueChange = (v: unknown): void => {
		model.setValue({ operator: currentOperatorId, value: v })
	}

	const operatorSelect = (
		<OperatorSelect
			operators={model.operators}
			currentOperatorId={currentOperatorId}
			onChange={(nextOperatorId) => {
				model.setValue(model.nextValueForOperator(nextOperatorId))
			}}
		/>
	)

	if (model.editor === FilterEditor.None) {
		return operatorSelect
	}

	// The presets sit beside whichever control the current operator renders, not inside it:
	// every branch below that takes a value gets them. The model already left out the ones the
	// operator cannot take — a range for a one-date operator, anything for a multi-select.
	const activeId = activePresetId(model.presets, inputValue)
	const activePreset = model.presets.find((preset) => preset.id === activeId)
	const presetMenu =
		model.presets.length > 0 ? (
			<Menu
				variant={GridMenuVariant.Filter}
				triggerIcon={GridMenuIcon.Calendar}
				{...(activePreset ? { triggerLabel: activePreset.label } : {})}
				aria-label={messages.filtering.presets}
				sections={toMenuSections([
					{
						id: 'date-presets',
						items: model.presets.map((preset) => ({
							id: preset.id,
							label: preset.label,
							onAction: () => {
								model.setValue({ operator: currentOperatorId, value: presetValue(preset) })
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
			<ClearFilterButton
				disabled={false}
				onClick={() => {
					model.setValue(undefined)
				}}
				aria-label={messages.filtering.clear}
			/>
		)

	if (model.editor === FilterEditor.Between) {
		const betweenCfg = model.between
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

	if (model.editor === FilterEditor.MultiSelect && MultiSelectFilter) {
		const selectedValues = Array.isArray(inputValue) ? (inputValue as string[]) : []
		return (
			<>
				<MultiSelectFilter
					items={model.items}
					selectedValues={selectedValues}
					onChange={onValueChange}
					placeholder={fieldName}
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
				id: fieldId,
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
						{fieldLabel}
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
					placeholder={fieldName}
					aria-label={fieldName}
					value={(inputValue ?? '') as string}
					onCommit={onValueChange}
					debounce={model.debounce}
					{...(onEnterApply ? { onEnterApply } : {})}
				/>
				{presetMenu}
				{clearButton}
			</div>
			{operatorSelect}
		</>
	)
}
