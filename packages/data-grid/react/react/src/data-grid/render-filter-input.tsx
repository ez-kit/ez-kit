import { GridMenuIcon } from '@ez-kit/data-grid-core'

import { ItemsSourceSlot, useItemsLists } from '../items-source'
import { GridMenuVariant, toMenuSections } from '../menu'

import { activePresetId, presetValue } from './date-presets'
import { FilterEditor, filterName, resolveFilter } from './filter-model'
import { FilterTextInput } from './filter-text-input'
import { flexRender } from './flex-render'
import { configWithItems, fieldItemsProps } from './items-view'
import { VisuallyHiddenLabel } from './visually-hidden'

import type { CellTypeRegistry } from '../cell-types-context'
import type { ItemsLists, ItemsMeta } from '../items-source'
import type { GridMenuProps } from '../menu'
import type { ResolvedGridOptions } from '../resolved-options'
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
import type { FilterModel, OperatorFilterModel } from './filter-model'
import type { FilterTarget, FilterTargetMeta } from './filter-target'
import type { InputComponentProps, BetweenValue, FieldState, GridMessages } from '@ez-kit/data-grid-core'
import type { ComponentType, ReactNode } from 'react'

const NO_META: ItemsMeta = {}

/** `config` spread so an absent one stays an absent key. */
function configProp(config: Record<string, unknown> | undefined): { config?: Record<string, unknown> } {
	return config !== undefined ? { config } : {}
}

export type RenderFilterInputArgs<TRow extends object = ErasedRow> = {
	/** The column or field whose filter control this is. */
	target: FilterTarget
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
	 * The grid's resolved `icons`, which settle each operator's icon. Omitted, an operator shows
	 * only the icon written on it, else its label.
	 */
	icons?: ResolvedGridOptions['icons']
	/**
	 * The live table instance, used only to wire "Enter applies the whole draft" on the
	 * fallback text inputs under `draft`. Optional so callers and tests that construct a target by
	 * hand need not also fabricate a table.
	 */
	table?: DataTable<GridFeatures, TRow>
	/**
	 * The target's filter model, when the caller already resolved it — the filter panel does, to
	 * hand the same model to a consumer. Resolved here otherwise.
	 */
	model?: FilterModel
}

/**
 * Renders the input(s) for a filter target — a column or a field — from its resolved filter model.
 * Two paths:
 *
 * 1. Operator-aware path — when the target has operators, dispatches on the model's `editor`
 *    (`none` → only the OperatorSelect, `between` → BetweenInput, `multiSelect` → the kit's
 *    multi-select, otherwise the column / cell-type / fallback input).
 * 2. Plain path — when there are no operators, uses `filtering.component`,
 *    then the cell-type registry, then a plain text Input.
 *
 * The model is the same one `<DataGrid.FilterPanel>` hands a consumer, which is what keeps a
 * panel built on a kit's own filter controls in step with the header.
 */
export function renderFilterInput<TRow extends object>(args: RenderFilterInputArgs<TRow>): ReactNode {
	// A component rather than a call, so the target's value lists are read by a hook of its own —
	// and only once the control is actually mounted: a header render function that leaves `filter`
	// out, or a panel chip that is closed, starts no hook.
	// Row-erased, like every reader of the table below `<DataGrid>` — see `ErasedRow`.
	return <FilterInput {...(args as unknown as RenderFilterInputArgs)} />
}

function FilterInput(args: RenderFilterInputArgs) {
	// A target that already carries its lists — the filter panel reads them for every target at
	// once — is not subscribed a second time: its meta is withheld from the read.
	const subscribed = useItemsLists(
		args.target.id,
		args.target.lists ? NO_META : args.target.meta,
		ItemsSourceSlot.Filtering,
	)
	const target = args.target.lists ? args.target : { ...args.target, lists: subscribed }
	return renderFilterControl({ ...args, target })
}

function renderFilterControl<TRow extends object>({
	target,
	Input,
	cellTypes,
	OperatorSelect,
	Menu,
	ClearFilterButton,
	BetweenInput,
	MultiSelectFilter,
	debounce: tableDebounce,
	messages,
	icons,
	table,
	model: resolvedModel,
}: RenderFilterInputArgs<TRow>): ReactNode {
	const { meta } = target
	const filteringMeta = meta.filtering
	const model =
		resolvedModel ?? resolveFilter(target, { messages, tableDebounce, cellTypes, ...(icons ? { icons } : {}) })
	const lists = target.lists ?? { options: undefined, labels: undefined }
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
	 * One name for every branch below, from `messages.filtering.placeholder`: "Filter <column>" is
	 * what the control is, whichever operator is current. Without it the
	 * filter inputs are anonymous — axe reports `label` (critical) on every filtered column, in
	 * both kits.
	 *
	 * Two routes, because the branches render two different kinds of control. A cell type's own
	 * component is the kit's, and only some of them forward `aria-label` — but every one honours
	 * `FieldState.id`, so those get the visually-hidden `<label htmlFor>`. The fallback text input
	 * goes through the kit's `core.Input`, which is `InputHTMLAttributes<HTMLInputElement>`, so
	 * that one takes the attribute directly and needs no label element.
	 */
	const fieldId = `filter-${target.id}`
	const fieldName = filterName(target, messages)
	// What an empty control shows: the target's `filtering.placeholder` hint, else the name. Never
	// the name itself — an author's "10 digits" is not what a screen reader should call the field.
	const fieldPlaceholder = model.placeholder
	const fieldLabel = <VisuallyHiddenLabel htmlFor={fieldId}>{fieldName}</VisuallyHiddenLabel>

	// ── operator-aware path ────────────────────────────────────────────────
	if (filteringMeta && model.hasOperators) {
		return renderOperatorFilter({
			model,
			lists,
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
			fieldPlaceholder,
			fieldLabel,
			onEnterApply,
		})
	}

	// ── plain filter path (no operators) ──────────────────────────────────
	const filterValue = target.getValue()
	const onChange = (v: unknown) => {
		target.setValue(v)
	}

	if (filteringMeta !== undefined) {
		const comp = filteringMeta.component as ((props: InputComponentProps) => ReactNode) | undefined
		if (comp)
			return flexRender(comp, {
				value: filterValue,
				onChange,
				...configProp(configWithItems(meta, lists.options)),
				placeholder: fieldPlaceholder,
			})
	}

	const plainCellTypeId = meta.cell?.type
	if (plainCellTypeId) {
		const def = cellTypes[plainCellTypeId]
		const comp = def?.filtering ?? def?.editing
		if (comp) {
			const field: FieldState = {
				id: fieldId,
				value: filterValue,
				onChange,
				onBlur: () => {},
				...fieldItemsProps(meta, lists.options, lists.labels, filterValue),
				placeholder: fieldPlaceholder,
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
			placeholder={fieldPlaceholder}
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
	'Input' | 'cellTypes' | 'OperatorSelect' | 'Menu' | 'ClearFilterButton' | 'BetweenInput' | 'messages'
> & {
	MultiSelectFilter: ComponentType<MultiSelectFilterProps> | undefined
	model: OperatorFilterModel
	lists: ItemsLists
	meta: FilterTargetMeta
	filteringMeta: NonNullable<FilterTargetMeta['filtering']>
	fieldId: string
	fieldName: string
	fieldPlaceholder: string
	fieldLabel: ReactNode
	onEnterApply: (() => void) | undefined
}

/** The operator-aware branch of {@link renderFilterInput}, dispatched on the model's `editor`. */
function renderOperatorFilter({
	model,
	lists,
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
	fieldPlaceholder,
	fieldLabel,
	onEnterApply,
}: OperatorFilterArgs): ReactNode {
	const inputValue = model.value?.value
	const currentOperatorId = model.operator

	const onValueChange = (v: unknown): void => {
		model.setValue({ operator: currentOperatorId, value: v })
	}

	// First in the filter's row, before whatever control the operator calls for — never a row of its
	// own under it, which cost every operator column a line of height and left the columns without
	// operators misaligned beside them. The box exists for the kits' stylesheets: it is what keeps
	// the control at its own width while the value control beside it takes the rest.
	const operatorSelect = (
		<div data-slot='filter-operator'>
			<OperatorSelect
				operators={model.operators}
				currentOperatorId={currentOperatorId}
				onChange={(nextOperatorId) => {
					model.setValue(model.nextValueForOperator(nextOperatorId))
				}}
			/>
		</div>
	)

	// An operator that takes no value keeps the row's height: its label stands where the value
	// control would, so switching to "is empty" and back does not make the header jump.
	if (model.editor === FilterEditor.None) {
		const label = model.operators.find((op) => op.id === currentOperatorId)?.label
		return (
			<div data-slot='filter-control'>
				{operatorSelect}
				<span data-slot='filter-operator-label'>{label}</span>
			</div>
		)
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
		const betweenType = meta.cell?.type === 'date' ? 'date' : 'number'
		return (
			<div data-slot='filter-control'>
				{operatorSelect}
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
		)
	}

	if (model.editor === FilterEditor.MultiSelect && MultiSelectFilter) {
		const selectedValues = Array.isArray(inputValue) ? (inputValue as string[]) : []
		return (
			<div data-slot='filter-control'>
				{operatorSelect}
				<MultiSelectFilter
					items={model.items}
					selectedValues={selectedValues}
					onChange={onValueChange}
					label={fieldName}
					placeholder={fieldPlaceholder}
					{...(model.itemsLoading ? { itemsLoading: true } : {})}
					{...(model.itemsError !== undefined ? { itemsError: model.itemsError } : {})}
				/>
			</div>
		)
	}

	// column-level filtering.component
	const columnFilterInput = filteringMeta.component as ((props: InputComponentProps) => ReactNode) | undefined
	if (columnFilterInput) {
		return (
			<div data-slot='filter-control'>
				{operatorSelect}
				{flexRender(columnFilterInput, {
					value: inputValue,
					onChange: onValueChange,
					...configProp(configWithItems(meta, lists.options)),
					placeholder: fieldPlaceholder,
				})}
				{presetMenu}
				{clearButton}
			</div>
		)
	}

	// registry by cell type
	const cellTypeId = meta.cell?.type
	if (cellTypeId) {
		const def = cellTypes[cellTypeId]
		const comp = def?.filtering ?? def?.editing
		if (comp) {
			const field: FieldState = {
				id: fieldId,
				value: inputValue,
				onChange: onValueChange,
				onBlur: () => {},
				...fieldItemsProps(meta, lists.options, lists.labels, inputValue),
				placeholder: fieldPlaceholder,
				error: undefined,
				errors: [],
				isValidating: false,
			}
			return (
				<div data-slot='filter-control'>
					{fieldLabel}
					{operatorSelect}
					{/* Mounted, not called: invoking a renderer as `Comp(props)` smuggles its hooks into
						    this header cell's fiber, and swapping one renderer for another — which is what
						    changing the operator does — reorders them. */}
					{flexRender(comp, field)}
					{presetMenu}
					{clearButton}
				</div>
			)
		}
	}

	return (
		<div data-slot='filter-control'>
			{operatorSelect}
			<FilterTextInput
				Input={Input}
				placeholder={fieldPlaceholder}
				aria-label={fieldName}
				value={(inputValue ?? '') as string}
				onCommit={onValueChange}
				debounce={model.debounce}
				{...(onEnterApply ? { onEnterApply } : {})}
			/>
			{presetMenu}
			{clearButton}
		</div>
	)
}
