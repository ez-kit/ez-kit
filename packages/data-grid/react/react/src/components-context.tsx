import { createContext, useContext, useMemo, type ReactNode } from 'react'

import type {
	ButtonProps,
	CheckboxProps,
	DateFieldProps,
	GridComponents,
	InputProps,
	ModalProps,
	NumberInputProps,
	PageSizerProps,
	PaginationProps,
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
