import { render } from '@testing-library/react'
import { useState } from 'react'

import { GridComponentsProvider } from './components-context'

import type {
	ActionsCellProps,
	BetweenInputProps,
	ButtonProps,
	CheckboxProps,
	ColumnMenuProps,
	ColumnVisibilityMenuProps,
	ConfirmDialogProps,
	CreatingActionsCellProps,
	ClearFiltersButtonComponentProps,
	EmptyStateProps,
	FilterChipProps,
	FilterPopoverProps,
	GridComponents,
	InputProps,
	LoadingRowProps,
	ModalProps,
	MultiSelectFilterProps,
	NoResultsStateProps,
	NumberInputProps,
	OperatorSelectProps,
	PageSizerProps,
	PaginationProps,
	ResizerProps,
	RowPinMenuProps,
	SelectionBarProps,
	TbodyProps,
	TdProps,
	ThProps,
	TheadProps,
	TableProps,
	TrProps,
	ToolbarProps,
} from './types'
import type { RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

// ── minimal HTML components for use in tests ─────────────────────────────

function TestTable(props: TableProps) { return <table {...props} /> }
function TestThead(props: TheadProps) { return <thead {...props} /> }
function TestTbody(props: TbodyProps) { return <tbody {...props} /> }
function TestTr(props: TrProps) { return <tr {...props} /> }
function TestTh(props: ThProps) { return <th {...props} /> }
function TestTd(props: TdProps) { return <td {...props} /> }
function TestButton(props: ButtonProps) { return <button type='button' {...props} /> }
function TestInput(props: InputProps) { return <input {...props} /> }
function TestNumberInput({ value, onChange }: NumberInputProps) {
	return (
		<input
			type='number'
			value={typeof value === 'number' && !Number.isNaN(value) ? value : ''}
			onChange={(e) => {
				const n = e.target.valueAsNumber
				onChange?.(Number.isNaN(n) ? undefined : n)
			}}
		/>
	)
}
function TestCheckbox({ value, indeterminate, onChange, ...rest }: CheckboxProps) {
	return (
		<input
			type='checkbox'
			checked={value}
			ref={(el) => { if (el) el.indeterminate = indeterminate ?? false }}
			onChange={(e) => onChange?.(e.target.checked)}
			{...rest}
		/>
	)
}
function TestModal({ open, onClose, title, children }: ModalProps) {
	return (
		<dialog open={open} onClose={onClose}>
			{title ? <header>{title}</header> : null}
			{children}
		</dialog>
	)
}
function TestPageSizer({ pageSize, items, onPageSizeChange }: PageSizerProps) {
	return (
		<select value={pageSize} onChange={(e) => { onPageSizeChange(Number(e.target.value)) }}>
			{items.map((size) => <option key={size} value={size}>{size}</option>)}
		</select>
	)
}
function TestResizer({ onMouseDown, onTouchStart, onDoubleClick }: ResizerProps) {
	return (
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
		<div
			data-slot='column-resizer'
			role='separator'
			aria-label='Resize column'
			aria-orientation='vertical'
			onMouseDown={onMouseDown}
			onTouchStart={onTouchStart}
			onDoubleClick={onDoubleClick}
			style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', cursor: 'col-resize', userSelect: 'none', touchAction: 'none' }}
		/>
	)
}
function TestRowPinMenu({ isPinned, canPinTop, canPinBottom, onPinTop, onPinBottom, onUnpin }: RowPinMenuProps) {
	if (isPinned) return <button type='button' onClick={onUnpin}>Unpin</button>
	return (
		<>
			{canPinTop && <button type='button' onClick={onPinTop}>Pin Top</button>}
			{canPinBottom && <button type='button' onClick={onPinBottom}>Pin Bottom</button>}
		</>
	)
}
function TestColumnMenu({ sections }: ColumnMenuProps) {
	const [open, setOpen] = useState(false)
	const { pin, visibility } = sections
	if (!pin && !visibility) return null
	return (
		<div style={{ position: 'relative', display: 'inline-flex' }}>
			<button type='button' onClick={() => { setOpen((p) => !p) }}>⋮</button>
			{open && (
				<div style={{ position: 'absolute', top: '100%', background: 'white', border: '1px solid #ccc', zIndex: 10 }}>
					{pin?.canPinLeft && <button type='button' onClick={() => { pin.onPinLeft(); setOpen(false) }}>Pin Left</button>}
					{pin?.canPinRight && <button type='button' onClick={() => { pin.onPinRight(); setOpen(false) }}>Pin Right</button>}
					{pin?.isPinned && <button type='button' onClick={() => { pin.onUnpin(); setOpen(false) }}>Unpin</button>}
					{visibility && <button type='button' onClick={() => { visibility.onHide(); setOpen(false) }}>Hide</button>}
				</div>
			)}
		</div>
	)
}
function TestColumnVisibilityMenu({ columns }: ColumnVisibilityMenuProps) {
	const [open, setOpen] = useState(false)
	return (
		<div style={{ position: 'relative', display: 'inline-flex' }}>
			<button type='button' onClick={() => { setOpen((p) => !p) }}>Columns</button>
			{open && (
				<div style={{ position: 'absolute', top: '100%', right: 0 }}>
					{columns.map((col) => (
						<label key={col.id}>
							<input type='checkbox' checked={col.isVisible} onChange={col.onToggle} />
							{col.label}
						</label>
					))}
				</div>
			)}
		</div>
	)
}
function TestToolbar({ children, left, right }: ToolbarProps) {
	return (
		<div role='toolbar'>
			{left}
			{children}
			{right}
		</div>
	)
}
function TestActionsCell({ row, isEditing, hasEditing, hasDeleting, onEdit, onDelete, onSave, onCancel }: ActionsCellProps) {
	if (isEditing) {
		return (
			<>
				<button type='button' onClick={() => void onSave()}>Save</button>
				<button type='button' onClick={onCancel}>Cancel</button>
			</>
		)
	}
	return (
		<>
			{hasEditing && <button type='button' onClick={onEdit} data-row-id={row.id}>Edit</button>}
			{hasDeleting && <button type='button' onClick={onDelete} data-row-id={row.id}>Delete</button>}
		</>
	)
}
function TestCreatingActionsCell({ onSave, onCancel }: CreatingActionsCellProps) {
	return (
		<>
			<button type='button' onClick={() => void onSave()}>Save</button>
			<button type='button' onClick={onCancel}>Cancel</button>
		</>
	)
}
function TestPagination({ pageIndex, pageCount, canPreviousPage, canNextPage, onPreviousPage, onNextPage, onFirstPage, onLastPage }: PaginationProps) {
	return (
		<div>
			<button type='button' onClick={onFirstPage} disabled={!canPreviousPage}>{'«'}</button>
			<button type='button' onClick={onPreviousPage} disabled={!canPreviousPage}>{'‹'}</button>
			<span>{pageIndex + 1} / {pageCount}</span>
			<button type='button' onClick={onNextPage} disabled={!canNextPage}>{'›'}</button>
			<button type='button' onClick={onLastPage} disabled={!canNextPage}>{'»'}</button>
		</div>
	)
}
function TestOperatorSelect({ operators, currentOperatorId, onChange }: OperatorSelectProps) {
	return (
		<select value={currentOperatorId} onChange={(e) => { onChange(e.target.value) }}>
			{operators.map((op) => <option key={op.id} value={op.id}>{op.symbol ?? op.label}</option>)}
		</select>
	)
}
function TestBetweenInput({ value, onChange, type }: BetweenInputProps) {
	const inputType = type === 'number' ? 'number' : 'date'
	return (
		<div style={{ display: 'flex', gap: '4px' }}>
			<input
				type={inputType}
				placeholder='From'
				value={(value.from as string | number | undefined) ?? ''}
				onChange={(e) => {
					const v = inputType === 'number' ? (Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber) : e.target.value || undefined
					onChange({ ...value, from: v })
				}}
			/>
			<span>–</span>
			<input
				type={inputType}
				placeholder='To'
				value={(value.to as string | number | undefined) ?? ''}
				onChange={(e) => {
					const v = inputType === 'number' ? (Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber) : e.target.value || undefined
					onChange({ ...value, to: v })
				}}
			/>
		</div>
	)
}
function TestMultiSelectFilter({ options, selectedValues, onChange, placeholder }: MultiSelectFilterProps) {
	const toggle = (value: string): void => {
		const next = selectedValues.includes(value) ? selectedValues.filter((v) => v !== value) : [...selectedValues, value]
		onChange(next)
	}
	return (
		<div role='group' aria-label={placeholder ?? 'Filter'}>
			{options.map((opt) => (
				<label key={opt.value} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
					<input
						type='checkbox'
						checked={selectedValues.includes(opt.value)}
						onChange={() => { toggle(opt.value) }}
					/>
					<span>{opt.label}</span>
					{opt.count !== undefined && <span data-slot='count'>{opt.count}</span>}
				</label>
			))}
		</div>
	)
}
function TestFilterPopover({ children, hasActiveFilter }: FilterPopoverProps) {
	const [open, setOpen] = useState(false)
	return (
		<div style={{ position: 'relative', display: 'inline-flex' }}>
			<button type='button' aria-label='Filter' aria-expanded={open} onClick={() => { setOpen((p) => !p) }} style={{ opacity: hasActiveFilter ? 1 : 0.5 }}>⊟</button>
			{open && <div style={{ position: 'absolute', top: '100%' }}>{children}</div>}
		</div>
	)
}
function TestFilterChip({ label, value, onRemove, kind }: FilterChipProps) {
	return (
		<span data-slot='filter-chip' data-chip-kind={kind} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', border: '1px solid #ccc' }}>
			<strong>{label}</strong>
			<span>{value}</span>
			<button type='button' aria-label={`Remove ${label} filter`} onClick={onRemove}>×</button>
		</span>
	)
}
function TestClearFiltersButton({ disabled, onPress, children, ariaLabel }: ClearFiltersButtonComponentProps) {
	return (
		<button type='button' data-slot='clear-filters-button' aria-label={ariaLabel} disabled={disabled} onClick={onPress}>
			{children ?? '⌫'}
		</button>
	)
}
function TestConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
	if (!open) return null
	return (
		<dialog open>
			<p><strong>{title}</strong></p>
			<p>{description}</p>
			<button type='button' onClick={onConfirm}>Confirm</button>
			<button type='button' onClick={onCancel}>Cancel</button>
		</dialog>
	)
}
function TestSelectionBar({ open, count, variant, onDelete, onClear, actions }: SelectionBarProps) {
	if (!open) return null
	return (
		<div role='toolbar' data-slot='selection-bar' data-variant={variant} style={{ display: 'flex', gap: 8, padding: '6px 12px', border: '1px solid #ccc' }}>
			<span>{count} selected</span>
			{onDelete && <button type='button' onClick={onDelete}>Delete</button>}
			{actions}
			<button type='button' onClick={onClear}>Cancel</button>
		</div>
	)
}
function TestLoadingRow({ columnCount }: LoadingRowProps) {
	return <tr><td colSpan={columnCount}>Loading…</td></tr>
}
function TestEmptyState({ columnCount }: EmptyStateProps) {
	return <tr><td colSpan={columnCount}>No data</td></tr>
}
function TestNoResultsState({ columnCount }: NoResultsStateProps) {
	return <tr><td colSpan={columnCount}>No results</td></tr>
}

// Minimal FormShell stub (no chrome) — UI kits provide real implementations.
function TestFormShell({ children }: { children?: ReactNode }) {
	return <>{children}</>
}

export const testComponents: Required<GridComponents> = {
	FormShell: TestFormShell,
	Table: TestTable,
	Thead: TestThead,
	Tbody: TestTbody,
	Tr: TestTr,
	Th: TestTh,
	Td: TestTd,
	Button: TestButton,
	Input: TestInput,
	Checkbox: TestCheckbox,
	NumberInput: TestNumberInput,
	Modal: TestModal,
	Toolbar: TestToolbar,
	GlobalFilterInput: ({ value, onChange, placeholder }) => (
		<input
			data-slot='global-filter-input'
			value={value}
			onChange={(e) => {
				onChange(e.target.value)
			}}
			placeholder={placeholder}
		/>
	),
	Pagination: TestPagination,
	PageSizer: TestPageSizer,
	Resizer: TestResizer,
	RowPinMenu: TestRowPinMenu,
	ColumnMenu: TestColumnMenu,
	ColumnVisibilityMenu: TestColumnVisibilityMenu,
	FilterPopover: TestFilterPopover,
	FilterChip: TestFilterChip,
	ClearFiltersButton: TestClearFiltersButton,
	SelectionBar: TestSelectionBar,
	ConfirmDialog: TestConfirmDialog,
	OperatorSelect: TestOperatorSelect,
	BetweenInput: TestBetweenInput,
	MultiSelectFilter: TestMultiSelectFilter,
	LoadingRow: TestLoadingRow,
	EmptyState: TestEmptyState,
	NoResultsState: TestNoResultsState,
	SortIndicator: () => null,
	SortMenu: () => null,
	ActionsCell: TestActionsCell,
	CreatingActionsCell: TestCreatingActionsCell,
	Chevron: () => null,
}

function TestWrapper({ children }: { children: ReactNode }) {
	return <GridComponentsProvider components={testComponents}>{children}</GridComponentsProvider>
}

export function renderWithComponents(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>): ReturnType<typeof render> {
	return render(ui, { wrapper: TestWrapper, ...options })
}
