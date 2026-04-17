import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import type {
	ButtonProps,
	CheckboxProps,
	ColumnMenuProps,
	DateFieldProps,
	GridComponents,
	InputProps,
	ModalProps,
	NumberInputProps,
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

// ── default native-HTML implementations ──────────────────────────────────

function DefaultTable(props: TableProps) {
	return <table {...props} />
}
function DefaultThead(props: TheadProps) {
	return <thead {...props} />
}
function DefaultTbody(props: TbodyProps) {
	return <tbody {...props} />
}
function DefaultTr(props: TrProps) {
	return <tr {...props} />
}
function DefaultTh(props: ThProps) {
	return <th {...props} />
}
function DefaultTd(props: TdProps) {
	return <td {...props} />
}
function DefaultButton(props: ButtonProps) {
	return (
		<button
			type='button'
			{...props}
		/>
	)
}
function DefaultInput(props: InputProps) {
	return <input {...props} />
}
function DefaultNumberInput({ value, onChange }: NumberInputProps) {
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
function DefaultDateField({ value, onChange }: DateFieldProps) {
	return (
		<input
			type='date'
			value={value ?? ''}
			onChange={(e) => { onChange?.(e.target.value) }}
		/>
	)
}
function DefaultCheckbox({ value, indeterminate, onChange, ...rest }: CheckboxProps) {
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
function DefaultModal({ open, onClose, title, children }: ModalProps) {
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
function DefaultPageSizer({ pageSize, items, onPageSizeChange }: PageSizerProps) {
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
function DefaultResizer({ onMouseDown, onTouchStart, onDoubleClick }: ResizerProps) {
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
function DefaultRowPinMenu({ isPinned, canPinTop, canPinBottom, onPinTop, onPinBottom, onUnpin }: RowPinMenuProps) {
	if (isPinned) {
		return <button type='button' onClick={onUnpin}>Unpin</button>
	}
	return (
		<>
			{canPinTop && <button type='button' onClick={onPinTop}>Pin Top</button>}
			{canPinBottom && <button type='button' onClick={onPinBottom}>Pin Bottom</button>}
		</>
	)
}
function DefaultColumnMenu({ sections }: ColumnMenuProps) {
	const [open, setOpen] = useState(false)
	const { pin } = sections

	if (!pin) return null

	return (
		<div style={{ position: 'relative', display: 'inline-flex' }}>
			<button
				type='button'
				onClick={() => { setOpen((p) => !p) }}
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
					{pin.canPinLeft && (
						<button
							type='button'
							onClick={() => { pin.onPinLeft(); setOpen(false) }}
						>
							Pin Left
						</button>
					)}
					{pin.canPinRight && (
						<button
							type='button'
							onClick={() => { pin.onPinRight(); setOpen(false) }}
						>
							Pin Right
						</button>
					)}
					{pin.isPinned && (
						<button
							type='button'
							onClick={() => { pin.onUnpin(); setOpen(false) }}
						>
							Unpin
						</button>
					)}
				</div>
			)}
		</div>
	)
}
function DefaultToolbar({ children, ...props }: ToolbarProps) {
	return (
		<div
			role='toolbar'
			{...props}
		>
			{children}
		</div>
	)
}
function DefaultPagination({
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

function DefaultSelectionBar({ open, count, onDelete, onClear, actions }: SelectionBarProps) {
	if (!open) return null
	return (
		<div
			role='toolbar'
			data-slot='selection-bar'
			style={{ display: 'flex', gap: 8, padding: '6px 12px', border: '1px solid #ccc' }}
		>
			<span>{count} selected</span>
			{onDelete && (
				<button type='button' onClick={onDelete}>
					Delete
				</button>
			)}
			{actions}
			<button type='button' onClick={onClear}>
				Cancel
			</button>
		</div>
	)
}

export const defaultComponents: Required<GridComponents> = {
	Table: DefaultTable,
	Thead: DefaultThead,
	Tbody: DefaultTbody,
	Tr: DefaultTr,
	Th: DefaultTh,
	Td: DefaultTd,
	Button: DefaultButton,
	Input: DefaultInput,
	Checkbox: DefaultCheckbox,
	NumberInput: DefaultNumberInput,
	DateField: DefaultDateField,
	Modal: DefaultModal,
	Toolbar: DefaultToolbar,
	Pagination: DefaultPagination,
	PageSizer: DefaultPageSizer,
	Resizer: DefaultResizer,
	RowPinMenu: DefaultRowPinMenu,
	ColumnMenu: DefaultColumnMenu,
	SelectionBar: DefaultSelectionBar,
}

// ── context ───────────────────────────────────────────────────────────────

const GridComponentsContext = createContext(defaultComponents)

export interface GridComponentsProviderProps {
	components?: GridComponents
	children: ReactNode
}

export function GridComponentsProvider({ components, children }: GridComponentsProviderProps) {
	const parentComponents = useContext(GridComponentsContext)

	const value = useMemo(() => {
		const prevMerged = { ...defaultComponents, ...parentComponents }

		const merged: Required<GridComponents> = components ? { ...prevMerged, ...components } : prevMerged

		return merged
	}, [parentComponents, components])

	return <GridComponentsContext value={value}>{children}</GridComponentsContext>
}

export function useGridComponents(): Required<GridComponents> {
	return useContext(GridComponentsContext)
}
