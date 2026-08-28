import { createColumns } from '@ez-kit/data-grid-core'
import { render } from '@testing-library/react'
import { useEffect, useState } from 'react'

import { GridComponentsProvider } from './components-context'
import { DataGrid } from './data-grid/data-grid'
import { ActionsCellState } from './types'
import { useDataGrid } from './use-data-grid'

import type { FullGridComponents } from './contract'
import type { GridMenuProps } from './menu'
import type {
	ActionsCellProps,
	BetweenInputProps,
	ButtonProps,
	CheckboxProps,
	VisibilityMenuProps,
	ConfirmDialogProps,
	ClearFiltersButtonComponentProps,
	DraftBarProps,
	EmptyStateProps,
	FilterChipProps,
	FilterPanelChipProps,
	FilterPanelProps,
	FilterPopoverProps,
	InputProps,
	LoadingRowProps,
	LoadMoreRowProps,
	ModalProps,
	MultiSelectFilterProps,
	NoResultsStateProps,
	NumberInputProps,
	OperatorSelectProps,
	PageSizerProps,
	PaginationProps,
	RefetchOverlayProps,
	ResizerProps,
	SelectionBarProps,
	TbodyProps,
	TfootProps,
	TdProps,
	ThProps,
	TheadProps,
	TableProps,
	TrProps,
	ToolbarProps,
} from './types'
import type { UseDataGridConfig } from './use-data-grid'
import type { DataTable } from '@ez-kit/data-grid-core'
import type { RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

// ── minimal HTML components for use in tests ─────────────────────────────

function TestTable(props: TableProps) {
	return <table {...props} />
}
function TestThead(props: TheadProps) {
	return <thead {...props} />
}
function TestTbody(props: TbodyProps) {
	return <tbody {...props} />
}
function TestTfoot(props: TfootProps) {
	return <tfoot {...props} />
}
function TestTr(props: TrProps) {
	return <tr {...props} />
}
function TestTh(props: ThProps) {
	return <th {...props} />
}
function TestTd(props: TdProps) {
	return <td {...props} />
}
function TestButton(props: ButtonProps) {
	return (
		<button
			type='button'
			{...props}
		/>
	)
}
function TestInput(props: InputProps) {
	// Falls back to `placeholder` for the accessible name when the caller doesn't pass
	// an explicit `aria-label` — real UI-kit inputs are expected to do the same, so tests
	// can query column-filter inputs by their visible "Filter <column>…" placeholder text.
	return (
		<input
			aria-label={props.placeholder}
			{...props}
		/>
	)
}
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
			ref={(el) => {
				if (el) el.indeterminate = indeterminate ?? false
			}}
			onChange={(e) => onChange?.(e.target.checked)}
			{...rest}
		/>
	)
}
function TestModal({ open, onClose, title, children }: ModalProps) {
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
function TestPageSizer({ pageSize, items, onPageSizeChange }: PageSizerProps) {
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
/**
 * Menus are stubbed *open*: every entry is a plain button labelled by its `label`, so a test
 * can click "Pin Top" without first driving a popover. The trigger is still rendered so tests
 * can assert the menu exists at all.
 */
function TestMenu({ sections, 'aria-label': ariaLabel }: GridMenuProps) {
	return (
		<div style={{ display: 'inline-flex' }}>
			<button
				type='button'
				aria-label={ariaLabel}
			>
				⋮
			</button>
			{sections.flatMap((section) =>
				section.items.map((item) => (
					<button
						key={item.id}
						type='button'
						disabled={item.disabled ?? false}
						onClick={item.onSelect}
					>
						{item.label}
					</button>
				)),
			)}
		</div>
	)
}
function TestColumnVisibilityMenu({ columns }: VisibilityMenuProps) {
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
				<div style={{ position: 'absolute', top: '100%', right: 0 }}>
					{columns.map((col) => (
						<label key={col.id}>
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
function TestToolbar({ children, left, right }: ToolbarProps) {
	return (
		<div role='toolbar'>
			{left}
			{children}
			{right}
		</div>
	)
}
function TestSaveCancel({
	onSave,
	onCancel,
	canCancel,
}: {
	onSave: () => Promise<void>
	onCancel: () => void
	canCancel: boolean
}) {
	return (
		<>
			<button
				type='button'
				onClick={() => void onSave()}
			>
				Save
			</button>
			{canCancel && (
				<button
					type='button'
					onClick={onCancel}
				>
					Cancel
				</button>
			)}
		</>
	)
}
function TestActionsCell(props: ActionsCellProps) {
	if (props.state === ActionsCellState.Editing) {
		return (
			<TestSaveCancel
				onSave={props.onSave}
				onCancel={props.onCancel}
				canCancel
			/>
		)
	}
	if (props.state === ActionsCellState.Creating) {
		return (
			<TestSaveCancel
				onSave={props.onSave}
				onCancel={props.onCancel}
				canCancel={props.canCancel}
			/>
		)
	}
	const { row, hasEditing, hasDeleting, onEdit, onDelete } = props
	return (
		<>
			{hasEditing && (
				<button
					type='button'
					onClick={onEdit}
					data-row-id={row.id}
				>
					Edit
				</button>
			)}
			{hasDeleting && (
				<button
					type='button'
					onClick={onDelete}
					data-row-id={row.id}
				>
					Delete
				</button>
			)}
		</>
	)
}
function TestPagination({
	pageIndex,
	pageCount,
	variant,
	canPreviousPage,
	canNextPage,
	onPreviousPage,
	onNextPage,
	onFirstPage,
	onLastPage,
}: PaginationProps) {
	// `pageCount` is undefined when the total is unknown — render the page number alone
	// rather than "1 / undefined".
	const position = pageCount === undefined ? String(pageIndex + 1) : `${String(pageIndex + 1)} / ${String(pageCount)}`
	return (
		<div data-variant={variant}>
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
			<span>{position}</span>
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
function TestOperatorSelect({ operators, currentOperatorId, onChange }: OperatorSelectProps) {
	return (
		<select
			value={currentOperatorId}
			onChange={(e) => {
				onChange(e.target.value)
			}}
		>
			{operators.map((op) => (
				<option
					key={op.id}
					value={op.id}
				>
					{op.label}
				</option>
			))}
		</select>
	)
}
function TestBetweenInput({ value, onChange, type, presets, onPresetSelect }: BetweenInputProps) {
	const inputType = type === 'number' ? 'number' : 'date'
	const inputs = (
		<div style={{ display: 'flex', gap: '4px' }}>
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
	if (!presets || presets.length === 0 || !onPresetSelect) return inputs
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
			<div
				data-slot='between-presets'
				style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}
			>
				{presets.map((p) => (
					<button
						key={p.id}
						type='button'
						onClick={() => {
							onPresetSelect(p)
						}}
					>
						{p.label}
					</button>
				))}
			</div>
			{inputs}
		</div>
	)
}
function TestMultiSelectFilter({ items, selectedValues, onChange, placeholder }: MultiSelectFilterProps) {
	const toggle = (value: string): void => {
		const next = selectedValues.includes(value) ? selectedValues.filter((v) => v !== value) : [...selectedValues, value]
		onChange(next)
	}
	return (
		<div
			role='group'
			aria-label={placeholder ?? 'Filter'}
		>
			{items.map((opt) => (
				<label
					key={opt.value}
					style={{ display: 'flex', gap: 4, alignItems: 'center' }}
				>
					<input
						type='checkbox'
						checked={selectedValues.includes(opt.value)}
						onChange={() => {
							toggle(opt.value)
						}}
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
			<button
				type='button'
				aria-label='Filter'
				aria-expanded={open}
				onClick={() => {
					setOpen((p) => !p)
				}}
				style={{ opacity: hasActiveFilter ? 1 : 0.5 }}
			>
				⊟
			</button>
			{open && <div style={{ position: 'absolute', top: '100%' }}>{children}</div>}
		</div>
	)
}
function TestFilterPanel({ children, hasActiveFilter }: FilterPanelProps) {
	return (
		<section
			data-slot='filter-panel-chrome'
			data-has-active={hasActiveFilter ? 'true' : 'false'}
			style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 4 }}
		>
			{children}
		</section>
	)
}
function TestFilterPanelChip({ label, valueDisplay, hasValue, onClear, children }: FilterPanelChipProps) {
	const [open, setOpen] = useState(false)
	return (
		<span
			data-slot='filter-panel-chip'
			data-has-value={hasValue ? 'true' : 'false'}
			style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 2 }}
		>
			<button
				type='button'
				onClick={() => {
					setOpen((p) => !p)
				}}
				style={{
					border: '1px solid #ccc',
					borderRadius: 4,
					padding: '2px 6px',
					background: hasValue ? '#eef' : 'transparent',
					cursor: 'pointer',
				}}
			>
				<strong>{label}:</strong> <span data-slot='filter-panel-chip-value'>{valueDisplay}</span>
			</button>
			{hasValue && (
				<button
					type='button'
					aria-label={`Clear ${label} filter`}
					onClick={onClear}
					style={{ border: 'none', background: 'none', cursor: 'pointer' }}
				>
					×
				</button>
			)}
			{open && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						zIndex: 10,
						background: '#fff',
						border: '1px solid #ccc',
						padding: 6,
					}}
				>
					{children}
				</div>
			)}
		</span>
	)
}
function TestFilterChip({ label, value, onRemove, kind, isDraft }: FilterChipProps) {
	return (
		<span
			data-slot='filter-chip'
			data-chip-kind={kind}
			{...(isDraft ? { 'data-draft-filter': '' } : {})}
			style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', border: '1px solid #ccc' }}
		>
			<strong>{label}</strong>
			<span>{value}</span>
			<button
				type='button'
				aria-label={`Remove ${label} filter`}
				onClick={onRemove}
			>
				×
			</button>
		</span>
	)
}
function TestClearFiltersButton({
	disabled,
	onClick,
	children,
	'aria-label': ariaLabel,
}: ClearFiltersButtonComponentProps) {
	return (
		<button
			type='button'
			data-slot='clear-filters-button'
			aria-label={ariaLabel}
			disabled={disabled}
			onClick={onClick}
		>
			{children ?? '⌫'}
		</button>
	)
}
function TestConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
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
function TestSelectionBar({ open, count, variant, onDelete, onClear, actions }: SelectionBarProps) {
	if (!open) return null
	return (
		<div
			role='toolbar'
			data-slot='selection-bar'
			data-testid='selection-bar'
			data-variant={variant}
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
/**
 * Unstyled stand-in for the kits' `DraftBar`. Renders exactly the DOM contract the
 * shadcn / heroui components must reproduce: the `draft-bar` test id, one `data-pending-*`
 * attribute per deferred axis, the `data-selected-count` context chip, and Apply / Reset.
 */
function TestDraftBar({ open, pending, selectedCount, variant, onApply, onReset }: DraftBarProps) {
	if (!open) return null
	return (
		<div
			role='toolbar'
			data-slot='draft-bar'
			data-testid='draft-bar'
			data-variant={variant}
			data-pending-sorting={String(pending.sorting)}
			data-pending-filters={String(pending.filters)}
			data-pending-search={pending.search ? 'true' : 'false'}
			data-selected-count={String(selectedCount)}
		>
			{selectedCount > 0 && <span data-slot='draft-bar-selected-chip'>{selectedCount} selected</span>}
			<button
				type='button'
				onClick={onApply}
			>
				Apply
			</button>
			<button
				type='button'
				onClick={onReset}
			>
				Reset
			</button>
		</div>
	)
}
function TestLoadingRow({ columnCount }: LoadingRowProps) {
	return (
		<tr>
			<td colSpan={columnCount}>Loading…</td>
		</tr>
	)
}
function TestEmptyState({ columnCount }: EmptyStateProps) {
	return (
		<tr>
			<td colSpan={columnCount}>No data</td>
		</tr>
	)
}
function TestNoResultsState({ columnCount }: NoResultsStateProps) {
	return (
		<tr>
			<td colSpan={columnCount}>No results</td>
		</tr>
	)
}
function TestLoadMoreRow({ isFetching, hasMore, error, trigger, onTrigger, onRetry }: LoadMoreRowProps) {
	if (error != null) {
		return (
			<div data-slot='load-more-error'>
				<button
					type='button'
					onClick={onRetry}
				>
					Retry
				</button>
			</div>
		)
	}
	if (isFetching) return <div data-slot='load-more-spinner'>Loading more…</div>
	if (trigger === 'manual' && hasMore) {
		return (
			<button
				type='button'
				data-slot='load-more-button'
				onClick={onTrigger}
			>
				Load more
			</button>
		)
	}
	return null
}

function TestRefetchOverlay(_props: RefetchOverlayProps) {
	return (
		<div
			data-slot='refetch-overlay-inner'
			data-testid='refetch-overlay'
		>
			Refreshing…
		</div>
	)
}

// Minimal FormShell stub (no chrome) — UI kits provide real implementations.
function TestFormShell({ children }: { children?: ReactNode }) {
	return <>{children}</>
}

export const testComponents: FullGridComponents = {
	core: {
		Table: TestTable,
		Thead: TestThead,
		Tbody: TestTbody,
		Tfoot: TestTfoot,
		Tr: TestTr,
		Th: TestTh,
		Td: TestTd,
		Button: TestButton,
		Input: TestInput,
		Checkbox: TestCheckbox,
		Toolbar: TestToolbar,
		Menu: TestMenu,
	},
	pagination: {
		Pagination: TestPagination,
		PageSizer: TestPageSizer,
	},
	sorting: {
		SortIndicator: () => null,
		SortMenu: () => null,
	},
	filtering: {
		FilterPopover: TestFilterPopover,
		FilterPanel: TestFilterPanel,
		FilterPanelChip: TestFilterPanelChip,
		FilterChip: TestFilterChip,
		ClearFiltersButton: TestClearFiltersButton,
		GlobalFilterInput: ({ value, onChange, placeholder, onKeyDown }) => (
			<input
				data-slot='global-filter-input'
				aria-label={placeholder}
				value={value}
				onChange={(e) => {
					onChange(e.target.value)
				}}
				placeholder={placeholder}
				{...(onKeyDown ? { onKeyDown } : {})}
			/>
		),
		OperatorSelect: TestOperatorSelect,
		BetweenInput: TestBetweenInput,
		MultiSelectFilter: TestMultiSelectFilter,
	},
	editing: {
		Modal: TestModal,
		FormShell: TestFormShell,
		ConfirmDialog: TestConfirmDialog,
		NumberInput: TestNumberInput,
	},
	selection: {
		SelectionBar: TestSelectionBar,
	},
	draft: {
		DraftBar: TestDraftBar,
	},
	'row-actions': {
		ActionsCell: TestActionsCell,
	},
	resizing: {
		Resizer: TestResizer,
	},
	visibility: {
		VisibilityMenu: TestColumnVisibilityMenu,
	},
	fallbacks: {
		LoadingRow: TestLoadingRow,
		EmptyState: TestEmptyState,
		NoResultsState: TestNoResultsState,
		RefetchOverlay: TestRefetchOverlay,
	},
	infinite: {
		LoadMoreRow: TestLoadMoreRow,
	},
	expanding: {
		Chevron: () => null,
	},
}

function TestWrapper({ children }: { children: ReactNode }) {
	return <GridComponentsProvider components={testComponents}>{children}</GridComponentsProvider>
}

export function renderWithComponents(
	ui: ReactElement,
	options?: Omit<RenderOptions, 'wrapper'>,
): ReturnType<typeof render> {
	return render(ui, { wrapper: TestWrapper, ...options })
}

// ── shared grid harness ───────────────────────────────────────────────────

export type TestRow = {
	id: number
	name: string
	age: number
}

export const TEST_ROWS: TestRow[] = [
	{ id: 1, name: 'Alice', age: 30 },
	{ id: 2, name: 'Bob', age: 24 },
	{ id: 3, name: 'Carol', age: 41 },
]

export const TEST_COLUMNS = createColumns<TestRow>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age' },
])

export type RenderGridResult = ReturnType<typeof render> & {
	/** The live table — drive state from a test with `table.setSorting(…)` etc. */
	table: DataTable<TestRow>
}

/**
 * Render a full `<DataGrid>` over {@link TEST_ROWS} with the test component kit, and
 * hand the test the live `DataTable` back so it can drive state directly.
 */
export function renderGrid(config: Partial<UseDataGridConfig<TestRow>> = {}): RenderGridResult {
	// Wrapper object, not a bare `let`: reassigning an outer variable during render is
	// a side effect the react-hooks lint rule rejects.
	const ref: { table: ReturnType<typeof useDataGrid<TestRow>> | null } = { table: null }

	function Harness(): ReactElement {
		const table = useDataGrid<TestRow>({ data: TEST_ROWS, columns: TEST_COLUMNS, ...config })
		// Handed out in an effect, not during render: writing to an outer object mid-render
		// is a side effect. Effects flush inside `render`'s `act`, so the caller sees it.
		useEffect(() => {
			ref.table = table
		}, [table])
		return <DataGrid<TestRow> table={table} />
	}

	const result = renderWithComponents(<Harness />)
	const table = ref.table
	if (!table) throw new Error('renderGrid: the grid never mounted, so no table was captured.')
	return { ...result, table }
}
