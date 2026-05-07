import { useState } from 'react'

import type {
	ActionsCellProps,
	BetweenInputProps,
	ButtonProps,
	CheckboxProps,
	ChevronProps,
	ColumnMenuProps,
	ColumnVisibilityMenuProps,
	ConfirmDialogProps,
	CreatingActionsCellProps,
	DateFieldProps,
	EmptyStateProps,
	FilterPopoverProps,
	GridComponents,
	InputProps,
	LoadingRowProps,
	ModalProps,
	NoResultsStateProps,
	NumberInputProps,
	OperatorSelectProps,
	PageSizerProps,
	PaginationProps,
	ResizerProps,
	RowPinMenuProps,
	SelectionBarProps,
	SortIndicatorProps,
	SortMenuProps,
	TbodyProps,
	TdProps,
	ThProps,
	TheadProps,
	TableProps,
	TrProps,
	ToolbarProps,
} from '@ez-kit/data-grid-react'

function NativeTable(props: TableProps) {
	return <table {...props} />
}
function NativeThead(props: TheadProps) {
	return <thead {...props} />
}
function NativeTbody(props: TbodyProps) {
	return <tbody {...props} />
}
function NativeTr(props: TrProps) {
	return <tr {...props} />
}
function NativeTh(props: ThProps) {
	return <th {...props} />
}
function NativeTd(props: TdProps) {
	return <td {...props} />
}
function NativeButton(props: ButtonProps) {
	return (
		<button
			type='button'
			{...props}
		/>
	)
}
function NativeInput(props: InputProps) {
	return <input {...props} />
}
function NativeNumberInput({ value, onChange }: NumberInputProps) {
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
function NativeDateField({ value, onChange }: DateFieldProps) {
	return (
		<input
			type='date'
			value={value ?? ''}
			onChange={(e) => {
				onChange?.(e.target.value)
			}}
		/>
	)
}
function NativeCheckbox({ value, indeterminate, onChange, ...rest }: CheckboxProps) {
	return (
		<input
			type='checkbox'
			checked={value}
			ref={(el) => {
				if (el) el.indeterminate = indeterminate ?? false
			}}
			onChange={(e) => onChange?.(e.target.checked)}
			{...rest}
		/>
	)
}
function NativeModal({ open, onClose, title, children }: ModalProps) {
	return (
		<dialog
			open={open}
			onClose={onClose}
		>
			{title ? <header>{title}</header> : null}
			{children}
		</dialog>
	)
}
function NativePageSizer({ pageSize, items, onPageSizeChange }: PageSizerProps) {
	return (
		<select
			value={pageSize}
			onChange={(e) => {
				onPageSizeChange(Number(e.target.value))
			}}
		>
			{items.map((size) => (
				<option
					key={size}
					value={size}
				>
					{size}
				</option>
			))}
		</select>
	)
}
function NativeResizer({ onMouseDown, onTouchStart, onDoubleClick }: ResizerProps) {
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
			style={{
				position: 'absolute',
				top: 0,
				right: 0,
				width: '4px',
				height: '100%',
				cursor: 'col-resize',
				userSelect: 'none',
				touchAction: 'none',
			}}
		/>
	)
}
function NativeRowPinMenu({ isPinned, canPinTop, canPinBottom, onPinTop, onPinBottom, onUnpin }: RowPinMenuProps) {
	if (isPinned) {
		return (
			<button
				type='button'
				onClick={onUnpin}
			>
				Unpin
			</button>
		)
	}
	return (
		<>
			{canPinTop && (
				<button
					type='button'
					onClick={onPinTop}
				>
					Pin Top
				</button>
			)}
			{canPinBottom && (
				<button
					type='button'
					onClick={onPinBottom}
				>
					Pin Bottom
				</button>
			)}
		</>
	)
}
function NativeColumnMenu({ sections }: ColumnMenuProps) {
	const [open, setOpen] = useState(false)
	const { pin, visibility } = sections

	if (!pin && !visibility) return null

	return (
		<div style={{ position: 'relative', display: 'inline-flex' }}>
			<button
				type='button'
				onClick={() => {
					setOpen((p) => !p)
				}}
			>
				⋮
			</button>
			{open && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						background: 'white',
						border: '1px solid #ccc',
						zIndex: 10,
						minWidth: 120,
					}}
				>
					{pin?.canPinLeft && (
						<button
							type='button'
							onClick={() => {
								pin.onPinLeft()
								setOpen(false)
							}}
						>
							Pin Left
						</button>
					)}
					{pin?.canPinRight && (
						<button
							type='button'
							onClick={() => {
								pin.onPinRight()
								setOpen(false)
							}}
						>
							Pin Right
						</button>
					)}
					{pin?.isPinned && (
						<button
							type='button'
							onClick={() => {
								pin.onUnpin()
								setOpen(false)
							}}
						>
							Unpin
						</button>
					)}
					{visibility && (
						<button
							type='button'
							onClick={() => {
								visibility.onHide()
								setOpen(false)
							}}
						>
							Hide
						</button>
					)}
				</div>
			)}
		</div>
	)
}
function NativeColumnVisibilityMenu({ columns }: ColumnVisibilityMenuProps) {
	const [open, setOpen] = useState(false)
	return (
		<div style={{ position: 'relative', display: 'inline-flex' }}>
			<button
				type='button'
				onClick={() => {
					setOpen((p) => !p)
				}}
			>
				Columns
			</button>
			{open && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						right: 0,
						background: 'white',
						border: '1px solid #ccc',
						zIndex: 10,
						minWidth: 160,
						padding: '4px 0',
					}}
				>
					{columns.map((col) => (
						<label
							key={col.id}
							style={{ display: 'flex', gap: 8, padding: '4px 12px', cursor: 'pointer' }}
						>
							<input
								type='checkbox'
								checked={col.isVisible}
								onChange={col.onToggle}
							/>
							{col.label}
						</label>
					))}
				</div>
			)}
		</div>
	)
}
function NativeToolbar({ children, left, right, ...props }: ToolbarProps) {
	if (children) {
		return (
			<div
				role='toolbar'
				{...props}
			>
				{children}
			</div>
		)
	}

	return (
		<div
			role='toolbar'
			style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}
			{...props}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{left}</div>
			<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{right}</div>
		</div>
	)
}
function NativePagination({
	pageIndex,
	pageCount,
	canPreviousPage,
	canNextPage,
	onPreviousPage,
	onNextPage,
	onFirstPage,
	onLastPage,
}: PaginationProps) {
	return (
		<div>
			<button
				type='button'
				onClick={onFirstPage}
				disabled={!canPreviousPage}
			>
				{'«'}
			</button>
			<button
				type='button'
				onClick={onPreviousPage}
				disabled={!canPreviousPage}
			>
				{'‹'}
			</button>
			<span>
				{pageIndex + 1} / {pageCount}
			</span>
			<button
				type='button'
				onClick={onNextPage}
				disabled={!canNextPage}
			>
				{'›'}
			</button>
			<button
				type='button'
				onClick={onLastPage}
				disabled={!canNextPage}
			>
				{'»'}
			</button>
		</div>
	)
}
function NativeOperatorSelect({ operators, currentOperatorId, onChange }: OperatorSelectProps) {
	return (
		<select
			value={currentOperatorId}
			onChange={(e) => {
				onChange(e.target.value)
			}}
			style={{ fontSize: '0.75rem', padding: '0 2px' }}
		>
			{operators.map((op) => (
				<option
					key={op.id}
					value={op.id}
				>
					{op.symbol ?? op.label}
				</option>
			))}
		</select>
	)
}
function NativeBetweenInput({ value, onChange, type }: BetweenInputProps) {
	const inputType = type === 'number' ? 'number' : 'date'
	return (
		<div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
			<input
				type={inputType}
				placeholder='From'
				value={(value.from as string | number | undefined) ?? ''}
				onChange={(e) => {
					const v =
						inputType === 'number'
							? Number.isNaN(e.target.valueAsNumber)
								? undefined
								: e.target.valueAsNumber
							: e.target.value || undefined
					onChange({ ...value, from: v })
				}}
			/>
			<span>–</span>
			<input
				type={inputType}
				placeholder='To'
				value={(value.to as string | number | undefined) ?? ''}
				onChange={(e) => {
					const v =
						inputType === 'number'
							? Number.isNaN(e.target.valueAsNumber)
								? undefined
								: e.target.valueAsNumber
							: e.target.value || undefined
					onChange({ ...value, to: v })
				}}
			/>
		</div>
	)
}
function NativeFilterPopover({ children, hasActiveFilter }: FilterPopoverProps) {
	const [open, setOpen] = useState(false)
	return (
		<div style={{ position: 'relative', display: 'inline-flex' }}>
			<button
				type='button'
				aria-label='Filter'
				aria-expanded={open}
				onClick={() => {
					setOpen((p) => !p)
				}}
				style={{ opacity: hasActiveFilter ? 1 : 0.5, cursor: 'pointer' }}
			>
				⊟
			</button>
			{open && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						background: 'white',
						border: '1px solid #ccc',
						padding: '8px',
						zIndex: 10,
						minWidth: 200,
					}}
				>
					{children}
				</div>
			)}
		</div>
	)
}
function NativeConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
	if (!open) return null
	return (
		<dialog open>
			<p>
				<strong>{title}</strong>
			</p>
			<p>{description}</p>
			<button
				type='button'
				onClick={onConfirm}
			>
				Confirm
			</button>
			<button
				type='button'
				onClick={onCancel}
			>
				Cancel
			</button>
		</dialog>
	)
}
function NativeSelectionBar({ open, count, onDelete, onClear, actions }: SelectionBarProps) {
	if (!open) return null
	return (
		<div
			role='toolbar'
			data-slot='selection-bar'
			style={{ display: 'flex', gap: 8, padding: '6px 12px', border: '1px solid #ccc' }}
		>
			<span>{count} selected</span>
			{onDelete && (
				<button
					type='button'
					onClick={onDelete}
				>
					Delete
				</button>
			)}
			{actions}
			<button
				type='button'
				onClick={onClear}
			>
				Cancel
			</button>
		</div>
	)
}

function NativeSortIndicator({ sortDir }: SortIndicatorProps) {
	if (!sortDir) return null
	return <span aria-hidden='true'>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function NativeSortMenu({ items, canAddSort, onAddSort, onResetSorting }: SortMenuProps) {
	return (
		<div role='group' aria-label='Sort'>
			{items.map((item) => (
				<div key={item.columnId}>
					<select
						value={item.columnId}
						onChange={(event) => item.onChangeColumn(event.target.value)}
					>
						{item.availableColumns.map((column) => (
							<option key={column.id} value={column.id}>
								{column.label}
							</option>
						))}
					</select>
					<select
						value={item.direction}
						onChange={(event) => item.onChangeDirection(event.target.value as 'asc' | 'desc')}
					>
						<option value='asc'>Ascending</option>
						<option value='desc'>Descending</option>
					</select>
					<button type='button' onClick={item.onRemove} aria-label='Remove sort'>
						Remove
					</button>
				</div>
			))}
			<button type='button' onClick={onAddSort} disabled={!canAddSort}>
				Add sort
			</button>
			<button type='button' onClick={onResetSorting}>
				Reset
			</button>
		</div>
	)
}

function NativeLoadingRow({ columnCount }: LoadingRowProps) {
	return (
		<tr>
			<td colSpan={columnCount}>Loading…</td>
		</tr>
	)
}

function NativeEmptyState({ columnCount }: EmptyStateProps) {
	return (
		<tr>
			<td colSpan={columnCount}>No data</td>
		</tr>
	)
}

function NativeNoResultsState({ columnCount }: NoResultsStateProps) {
	return (
		<tr>
			<td colSpan={columnCount}>No results</td>
		</tr>
	)
}

function NativeActionsCell({ isEditing, hasEditing, hasDeleting, onEdit, onDelete, onSave, onCancel }: ActionsCellProps) {
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
			{hasEditing && <button type='button' onClick={onEdit}>Edit</button>}
			{hasDeleting && <button type='button' onClick={onDelete}>Delete</button>}
		</>
	)
}

function NativeCreatingActionsCell({ onSave, onCancel }: CreatingActionsCellProps) {
	return (
		<>
			<button type='button' onClick={() => void onSave()}>Save</button>
			<button type='button' onClick={onCancel}>Cancel</button>
		</>
	)
}

function NativeChevron({ expanded, onClick, disabled }: ChevronProps) {
	return (
		<button type='button' onClick={onClick} disabled={disabled} aria-label={expanded ? 'Collapse row' : 'Expand row'}>
			{expanded ? '▼' : '▶'}
		</button>
	)
}

export const nativeComponents: Required<GridComponents> = {
	Table: NativeTable,
	Thead: NativeThead,
	Tbody: NativeTbody,
	Tr: NativeTr,
	Th: NativeTh,
	Td: NativeTd,
	Button: NativeButton,
	Input: NativeInput,
	Checkbox: NativeCheckbox,
	NumberInput: NativeNumberInput,
	DateField: NativeDateField,
	Modal: NativeModal,
	Toolbar: NativeToolbar,
	Pagination: NativePagination,
	PageSizer: NativePageSizer,
	Resizer: NativeResizer,
	RowPinMenu: NativeRowPinMenu,
	ColumnMenu: NativeColumnMenu,
	ColumnVisibilityMenu: NativeColumnVisibilityMenu,
	FilterPopover: NativeFilterPopover,
	SelectionBar: NativeSelectionBar,
	ConfirmDialog: NativeConfirmDialog,
	OperatorSelect: NativeOperatorSelect,
	BetweenInput: NativeBetweenInput,
	SortIndicator: NativeSortIndicator,
	SortMenu: NativeSortMenu,
	LoadingRow: NativeLoadingRow,
	EmptyState: NativeEmptyState,
	NoResultsState: NativeNoResultsState,
	ActionsCell: NativeActionsCell,
	CreatingActionsCell: NativeCreatingActionsCell,
	Chevron: NativeChevron,
}
