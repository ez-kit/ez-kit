import { createColumns } from '@ez-kit/data-grid-core'
import { tableFeatures } from '@ez-kit/data-grid-core/features'
import { allDataGridFeatures } from '@ez-kit/data-grid-core/features/all'
import { render } from '@testing-library/react'
import { forwardRef, Fragment, useEffect, useState } from 'react'

import { GridComponentsProvider } from './components-context'
import { DataGrid } from './data-grid/data-grid'
import { DefaultLayout } from './layouts'
import { isGridMenuItemSlot } from './menu'
import { ActionsCellState } from './types'
import { useDataGrid } from './use-data-grid'

import type { FullGridComponents } from './contract'
import type { GridMenuProps } from './menu'
import type {
	DataTable,
	GridFeatures,
	ActionsCellProps,
	BetweenInputProps,
	ButtonProps,
	CheckboxProps,
	VisibilityMenuProps,
	ConfirmDialogProps,
	ClearFilterButtonProps,
	ActionBarProps,
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
	TbodyProps,
	TfootProps,
	TdProps,
	ThProps,
	TheadProps,
	TableProps,
	TrProps,
	ToolbarProps,
	SortIndicatorProps,
} from './types'
import type { UseDataGridConfig } from './use-data-grid'
import type { RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

// ── minimal HTML components for use in tests ─────────────────────────────

function TestTable(props: TableProps) {
	return <table {...props} />
}
// `forwardRef`, like the real kits: `TheadProps` and `TrProps` carry `RefAttributes`, and a kit
// that leaves the ref in props forwards nothing on React 18 — the header height and the pinned-row
// offsets are both measured through these.
const TestThead = forwardRef<HTMLTableSectionElement, TheadProps>(function TestThead(props, ref) {
	return (
		<thead
			{...props}
			ref={ref}
		/>
	)
})
function TestTbody(props: TbodyProps) {
	return <tbody {...props} />
}
function TestTfoot(props: TfootProps) {
	return <tfoot {...props} />
}
const TestTr = forwardRef<HTMLTableRowElement, TrProps>(function TestTr(props, ref) {
	return (
		<tr
			{...props}
			ref={ref}
		/>
	)
})
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
function TestMenu({ sections, triggerLabel, 'aria-label': ariaLabel }: GridMenuProps) {
	return (
		<div style={{ display: 'inline-flex' }}>
			{/* Entries render unconditionally — this double has no open state — so a test reads them
			    without driving a popover. `triggerLabel` is what the trigger shows when the menu has a
			    current choice, and then it is the trigger's accessible name too. */}
			<button
				type='button'
				data-slot='menu-trigger'
				{...(triggerLabel === undefined ? { 'aria-label': ariaLabel } : {})}
			>
				{triggerLabel ?? '⋮'}
			</button>
			{sections.flatMap((section) =>
				section.items.map((item) =>
					isGridMenuItemSlot(item) ? (
						<span key={item.id}>{item.component}</span>
					) : (
						<button
							key={item.id}
							type='button'
							disabled={item.disabled ?? false}
							onClick={item.onAction}
						>
							{item.label}
						</button>
					),
				),
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
function TestToolbar({ children, start, end, className }: ToolbarProps) {
	return (
		<div
			role='toolbar'
			className={className}
		>
			{start}
			{children}
			{end}
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
	const { row, hasEditing, hasDeleting, onEdit, onDelete, actions } = props
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
			{actions.map((item) =>
				isGridMenuItemSlot(item) ? (
					<Fragment key={item.id}>{item.component}</Fragment>
				) : (
					<button
						key={item.id}
						type='button'
						data-row-id={row.id}
						data-slot='row-action'
						onClick={item.onAction}
					>
						{item.label}
					</button>
				),
			)}
		</>
	)
}
function TestPagination({
	pageIndex,
	pageCount,
	links,
	edges,
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
		<div
			data-links={links || undefined}
			data-edges={edges || undefined}
		>
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
function TestBetweenInput({ value, onChange, type, slider }: BetweenInputProps) {
	const inputType = type === 'number' ? 'number' : 'date'
	const inputs = (
		// `data-slider` is how a test observes that the column's slider flag reached the kit: this
		// double renders two fields either way.
		<div
			data-slider={slider === true ? 'true' : undefined}
			style={{ display: 'flex', gap: '4px' }}
		>
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
	return inputs
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
function TestClearFilterButton({ disabled, onClick, children, 'aria-label': ariaLabel }: ClearFilterButtonProps) {
	return (
		<button
			type='button'
			data-slot='clear-filter-button'
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
/**
 * Unstyled stand-in for the kits' `ActionBar`. Renders exactly the DOM contract the shadcn /
 * heroui components must reproduce: **one** root carrying the variant, the open state, the
 * selected count and one `data-pending-*` per deferred axis, with a section element per live
 * concern inside it.
 *
 * One root is the point. The two sections used to be two components, each drawing a whole bar,
 * and a double that kept them apart could not have caught them overlapping.
 */
function TestActionBar({ open, variant, selection, draft }: ActionBarProps) {
	const pending = draft?.pending
	// This double unmounts when closed, so the one state it ever renders is `open`. A kit that
	// animates out keeps the element and writes `closed` — the attribute belongs on this root
	// either way, which is what the contract pins.
	if (!open) return null
	return (
		<div
			role='toolbar'
			data-slot='action-bar'
			data-testid='action-bar'
			data-variant={variant}
			data-state='open'
			data-selected-count={String(selection?.count ?? 0)}
			{...(pending
				? {
						'data-pending-sorting': String(pending.sorting),
						'data-pending-column-filters': String(pending.columnFilters),
						'data-pending-global-filter': String(pending.globalFilter),
					}
				: {})}
			style={{ display: 'flex', gap: 8, padding: '6px 12px', border: '1px solid #ccc' }}
		>
			{selection && selection.count > 0 && (
				<div data-slot='action-bar-selection'>
					<span>{selection.count} selected</span>
					{selection.onDelete && (
						<button
							type='button'
							onClick={selection.onDelete}
						>
							Delete
						</button>
					)}
					{selection.start}
					{selection.actions?.map((item) =>
						isGridMenuItemSlot(item) ? (
							<span key={item.id}>{item.component}</span>
						) : (
							<button
								key={item.id}
								type='button'
								data-slot='action-bar-action'
								data-destructive={item.destructive === true ? '' : undefined}
								disabled={item.disabled === true}
								onClick={item.onAction}
							>
								{item.label}
							</button>
						),
					)}
					{selection.end}
					<button
						type='button'
						data-slot='action-bar-close'
						onClick={selection.onClear}
					>
						Cancel
					</button>
				</div>
			)}
			{draft && (
				<div data-slot='action-bar-draft'>
					{Object.entries(draft.pending).map(([axis, count]) => (
						<span
							key={axis}
							data-slot='action-bar-draft-part'
							data-axis={axis}
						>
							{count}
						</span>
					))}
					<button
						type='button'
						data-slot='action-bar-apply'
						onClick={draft.onApply}
					>
						Apply
					</button>
					<button
						type='button'
						data-slot='action-bar-reset'
						onClick={draft.onReset}
					>
						Reset
					</button>
				</div>
			)}
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
function TestLoadMoreRow({ isFetching, hasNextPage, error, trigger, onTrigger, onRetry }: LoadMoreRowProps) {
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
	if (trigger === 'manual' && hasNextPage) {
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
		Modal: TestModal,
		Button: TestButton,
		Input: TestInput,
		Checkbox: TestCheckbox,
		Toolbar: TestToolbar,
		Menu: TestMenu,
		NumberInput: TestNumberInput,
		// The one optional slot this double registers, and it stands in for what each UI kit
		// does in its own `data-grid.tsx`: without a `core.Layout` a childless `<DataGrid>`
		// renders the table and nothing else, so every case about a toolbar, a pagination row or
		// an action bar would be testing a grid that has none. `data-grid.test.tsx` covers the
		// unregistered case with a provider of its own.
		Layout: DefaultLayout,
		ActionBar: TestActionBar,
	},
	pagination: {
		Pagination: TestPagination,
		PageSizer: TestPageSizer,
	},
	sorting: {
		// Renders an element rather than `null` so a test can click the arrow itself — the case
		// that was broken while the affordance filtered clicks by their target. Empty, so it
		// stays invisible to every `getByText` in the suite.
		SortIndicator: ({ canSort }: SortIndicatorProps) => (canSort ? <span data-testid='sort-indicator' /> : null),
		SortMenu: () => null,
	},
	filtering: {
		FilterPopover: TestFilterPopover,
		FilterPanel: TestFilterPanel,
		FilterPanelChip: TestFilterPanelChip,
		FilterChip: TestFilterChip,
		ClearFilterButton: TestClearFilterButton,
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
		FormShell: TestFormShell,
	},
	deleting: {
		ConfirmDialog: TestConfirmDialog,
	},
	rowActions: {
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

/**
 * The feature set every fixture grid is built with.
 *
 * `allDataGridFeatures` — the one place where the all-in set is the right answer. A fixture that
 * composed its own would be testing its own composition rather than the behaviour under test, and
 * a feature left out of it fails silently (§2.4): the state slice, the table members and the row
 * methods simply do not exist. Register everything here, and let a case that cares about omission
 * say so explicitly with {@link NARROW_TEST_FEATURES}.
 */
export const TEST_FEATURES = allDataGridFeatures

/**
 * A set with **nothing** registered — `tableFeatures({})`.
 *
 * The counterpart of {@link TEST_FEATURES}, and what the feature-omission cases are written
 * against: a grid built on this has no `state.sorting`, no `table.editing`, no `row.getIsEditing`.
 * Exported beside the all-in set so the two are read together and neither can drift into a
 * per-file literal.
 */
export const NARROW_TEST_FEATURES = tableFeatures({})

export type RenderGridResult = ReturnType<typeof render> & {
	/** The live table — drive state from a test with `table.setSorting(…)` etc. */
	table: DataTable<GridFeatures, TestRow>
}

/**
 * Render a full `<DataGrid>` over {@link TEST_ROWS} with the test component kit, and
 * hand the test the live `DataTable` back so it can drive state directly.
 *
 * With no `children` the grid renders the registered `core.Layout` — {@link DefaultLayout}, the
 * preset each kit binds. Pass `children` for a case about a control that no preset mounts (the
 * chips strip, a hand-placed page sizer): composition is the only way to put one on the page
 * now that the `filtering.chips` / `pagination.pageSizer` options are gone.
 */
export function renderGrid(
	config: Partial<UseDataGridConfig<GridFeatures, TestRow>> = {},
	children?: ReactNode,
): RenderGridResult {
	// Wrapper object, not a bare `let`: reassigning an outer variable during render is
	// a side effect the react-hooks lint rule rejects.
	const ref: { table: DataTable<GridFeatures, TestRow> | null } = { table: null }

	function Harness(): ReactElement {
		const table = useDataGrid<GridFeatures, TestRow>({
			features: TEST_FEATURES,
			data: TEST_ROWS,
			columns: TEST_COLUMNS,
			...config,
		})
		// Handed out in an effect, not during render: writing to an outer object mid-render
		// is a side effect. Effects flush inside `render`'s `act`, so the caller sees it.
		useEffect(() => {
			ref.table = table
		}, [table])
		return <DataGrid<GridFeatures, TestRow> table={table}>{children}</DataGrid>
	}

	const result = renderWithComponents(<Harness />)
	const table = ref.table
	if (!table) throw new Error('renderGrid: the grid never mounted, so no table was captured.')
	return { ...result, table }
}
