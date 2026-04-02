import { createContext, useContext, type ReactNode } from 'react'

import type {
	ButtonProps,
	CheckboxProps,
	GridComponents,
	InputProps,
	ModalProps,
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
function DefaultCheckbox({ checked, indeterminate, onChange, ...rest }: CheckboxProps) {
	return (
		<input
			type='checkbox'
			checked={checked}
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
	Modal: DefaultModal,
	Toolbar: DefaultToolbar,
	Pagination: DefaultPagination,
}

// ── context ───────────────────────────────────────────────────────────────

const GridComponentsContext = createContext(defaultComponents)

export interface GridComponentsProviderProps {
	components?: GridComponents
	children: ReactNode
}

export function GridComponentsProvider({ components, children }: GridComponentsProviderProps) {
	const parentComponents = useContext(GridComponentsContext)

	const prevMerged = parentComponents ? { ...defaultComponents, ...parentComponents } : defaultComponents

	const merged: Required<GridComponents> = components ? { ...prevMerged, ...components } : prevMerged

	return <GridComponentsContext value={merged}>{children}</GridComponentsContext>
}

export function useGridComponents(): Required<GridComponents> {
	return useContext(GridComponentsContext)
}
