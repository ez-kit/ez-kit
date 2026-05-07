import { SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { COL_PINNING_KEY, FILTERING_VARIANT_KEY } from '../use-data-grid'
import { getCommonPinStyles } from '../utils/pin-styles'

import { flexRender } from './flex-render'
import { useTableContext } from './table-context'

import type { CellInputProps, CellTypeRegistry } from '../cell-types-context'
import type { BetweenInputProps, ColumnMenuSections, InputProps, OperatorSelectProps } from '../types'
import type { BetweenValue, StructuredFilterValue } from '@ez-kit/data-grid-core'
import type { Header, ColumnMeta } from '@tanstack/table-core'
import type { ComponentType, CSSProperties, KeyboardEvent, ReactNode } from 'react'

type HeaderProps = {
	/** Extra styles applied to the `<thead>` element (e.g. for virtualized layout). */
	theadStyle?: CSSProperties | undefined
	/** When true, adds `data-sticky="true"` to the thead for CSS targeting. */
	stickyHeader?: boolean
}

/**
 * Renders the table `<thead>` with all header groups.
 * - Clicking a sortable header toggles sort.
 * - If filtering is enabled on a column, renders a filter input below the header.
 * - `filtering.component` injects a custom filter control per column.
 */
export function Header({ theadStyle, stickyHeader }: HeaderProps = {}) {
	const table = useTableContext()
	const { Thead, Tr, Th, Input, Resizer, SortIndicator, ColumnMenu, Checkbox, OperatorSelect, BetweenInput, FilterPopover } =
		useGridComponents()
	const cellTypes = useCellTypes()
	const hasFiltering = Boolean(table.options.getFilteredRowModel)
	const colPinEnabled = (table as unknown as Record<symbol, unknown>)[COL_PINNING_KEY] as boolean | undefined
	const filteringVariant = (table as unknown as Record<symbol, unknown>)[FILTERING_VARIANT_KEY] as
		| 'inline'
		| 'popover'
		| undefined

	return (
		<Thead
			data-slot='thead'
			style={theadStyle}
			{...(stickyHeader ? { 'data-sticky': 'true' } : {})}
		>
			{table.getHeaderGroups().map((headerGroup) => (
				<Tr
					data-slot='tr'
					key={headerGroup.id}
				>
					{headerGroup.headers.map((header) => {
						const meta = header.column.columnDef.meta
						const canSort = header.column.getCanSort()
						const sortDir = header.column.getIsSorted()
						const pinStyles = getCommonPinStyles(header.column)

						const sortHandler = canSort ? header.column.getToggleSortingHandler() : undefined
						const onSortKeyDown = canSort
							? (e: KeyboardEvent) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault()
										sortHandler?.(e)
									}
								}
							: undefined

						const canResize = Boolean(table.options.enableColumnResizing) && header.column.getCanResize()
						const thStyle = {
							...pinStyles,
							...(canResize ? { position: 'relative' as const } : {}),
						}

						// Build column menu sections
						const sections: ColumnMenuSections = {}
						const colPinDef = meta?.columnPinning
						const isStaticPin = typeof colPinDef === 'object' && colPinDef.pin !== undefined
						const isPinningDisabled = colPinDef === false

						if (colPinEnabled && !meta?.isSystemColumn && !isPinningDisabled && !isStaticPin && !header.isPlaceholder) {
							const isPinned = header.column.getIsPinned()
							sections.pin = {
								isPinned,
								canPinLeft: isPinned !== 'left',
								canPinRight: isPinned !== 'right',
								onPinLeft: () => {
									header.column.pin('left')
								},
								onPinRight: () => {
									header.column.pin('right')
								},
								onUnpin: () => {
									header.column.pin(false)
								},
							}
						}

						if (!meta?.isSystemColumn && !header.isPlaceholder && header.column.getCanHide()) {
							sections.visibility = {
								onHide: () => {
									header.column.toggleVisibility(false)
								},
							}
						}

						if (canSort && !header.isPlaceholder) {
							sections.sorting = {
								currentSort: sortDir,
								canAsc: sortDir !== 'asc',
								canDesc: sortDir !== 'desc',
								onSortAsc: () => { header.column.toggleSorting(false); },
								onSortDesc: () => { header.column.toggleSorting(true); },
								onClearSort: () => { header.column.clearSorting(); },
							}
						}

						const hasSections = Object.keys(sections).length > 0

						// Selection column: render select-all checkbox
						if (header.column.id === SELECTION_COLUMN_ID) {
							const isAllSelected = table.getIsAllRowsSelected()
							const isSomeSelected = table.getIsSomeRowsSelected()
							return (
								<Th
									data-slot='th'
									data-slot-selection-th='true'
									key={header.id}
									colSpan={header.colSpan}
									style={thStyle}
									pinned={header.column.getIsPinned()}
								>
									<Checkbox
										value={isAllSelected}
										indeterminate={isSomeSelected && !isAllSelected}
										onChange={() => {
											table.toggleAllRowsSelected(!isAllSelected)
										}}
										aria-label='Select all rows'
									/>
								</Th>
							)
						}

						return (
							<Th
								data-slot='th'
								key={header.id}
								colSpan={header.colSpan}
								style={thStyle}
								pinned={header.column.getIsPinned()}
							>
								{(() => {
									const canFilter =
										hasFiltering && meta?.filtering !== false && !meta?.isSystemColumn && header.column.getCanFilter()
									const filterContent = canFilter
										? renderFilterInput({ header, meta, Input, cellTypes, OperatorSelect, BetweenInput })
										: null
									return (
										<>
											<div
												data-slot='header-main'
												style={{ display: 'flex', alignItems: 'center' }}
											>
												<div
													data-slot='sort-trigger'
													role={canSort ? 'button' : undefined}
													tabIndex={canSort ? 0 : undefined}
													style={{ cursor: canSort ? 'pointer' : undefined, flex: 1, display: 'flex', alignItems: 'center' }}
													onClick={sortHandler}
													onKeyDown={onSortKeyDown}
												>
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext() as unknown as Record<string, unknown>,
															)}
													<SortIndicator sortDir={sortDir} canSort={canSort} />
												</div>
												{filteringVariant === 'popover' && canFilter && (
													<FilterPopover hasActiveFilter={Boolean(header.column.getFilterValue())}>
														{filterContent}
													</FilterPopover>
												)}
												{hasSections && (
													<ColumnMenu
														column={header.column}
														sections={sections}
													/>
												)}
											</div>
											{filteringVariant !== 'popover' && canFilter && (
												<div data-slot='header-extras'>{filterContent}</div>
											)}
										</>
									)
								})()}
								{canResize && (
									<Resizer
										onMouseDown={header.getResizeHandler()}
										onTouchStart={header.getResizeHandler()}
										onDoubleClick={() => {
											header.column.resetSize()
										}}
										isResizing={header.column.getIsResizing()}
									/>
								)}
							</Th>
						)
					})}
				</Tr>
			))}
		</Thead>
	)
}

// ── helpers ───────────────────────────────────────────────────────────────

type FilterInputArgs = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	header: Header<any, unknown>
	meta: ColumnMeta<unknown, unknown> | undefined
	Input: ComponentType<InputProps>
	cellTypes: CellTypeRegistry
	OperatorSelect: ComponentType<OperatorSelectProps>
	BetweenInput: ComponentType<BetweenInputProps>
}

function renderFilterInput({
	header,
	meta,
	Input,
	cellTypes,
	OperatorSelect,
	BetweenInput,
}: FilterInputArgs): ReactNode {
	const resolvedOperators = meta?.resolvedOperators

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
			return (
				<>
					<BetweenInput
						value={(inputValue as BetweenValue | undefined) ?? {}}
						onChange={onValueChange}
						variant={betweenCfg?.variant ?? 'inputs'}
						type={betweenType}
						{...(betweenCfg?.min !== undefined ? { min: betweenCfg.min } : {})}
						{...(betweenCfg?.max !== undefined ? { max: betweenCfg.max } : {})}
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
						{comp({
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
				return (
					<>
						{comp({
							value: inputValue,
							onChange: onValueChange,
							...(meta.config !== undefined ? { config: meta.config } : {}),
						})}
						{operatorSelect}
					</>
				)
			}
		}

		return (
			<>
				<Input
					placeholder={`Filter ${header.column.id}…`}
					value={(inputValue ?? '') as string}
					onChange={(e) => {
						onValueChange(e.target.value)
					}}
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
			return comp({
				value: filterValue,
				onChange,
				...(meta.config !== undefined ? { config: meta.config } : {}),
			})
	}

	if (meta?.cellType) {
		const def = cellTypes[meta.cellType]
		const comp = def?.filter ?? def?.edit
		if (comp)
			return comp({
				value: filterValue,
				onChange,
				...(meta.config !== undefined ? { config: meta.config } : {}),
			})
	}

	return (
		<Input
			placeholder={`Filter ${header.column.id}…`}
			value={(filterValue ?? '') as string}
			onChange={(e) => {
				header.column.setFilterValue(e.target.value)
			}}
		/>
	)
}
