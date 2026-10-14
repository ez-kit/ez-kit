'use client'

import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	filterFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { FilterEditor, createColumns, useColumnFilters } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import type { ColumnFilterModel, ColumnFiltersValue, OperatorColumnFilterModel } from '@ez-kit/data-grid-react'
import type { CSSProperties, ReactNode } from 'react'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnFilteringFeature,
	filterFns,
	filteredRowModel: createFilteredRowModel(),
})

type Order = {
	id: number
	customer: string
	status: 'open' | 'shipped' | 'delivered' | 'cancelled'
	total: number
	placedAt: string
}

const DATA: Order[] = [
	{ id: 1001, customer: 'Acme Inc.', status: 'open', total: 1280, placedAt: '2026-05-12' },
	{ id: 1002, customer: 'Globex Corp.', status: 'shipped', total: 875, placedAt: '2026-05-10' },
	{ id: 1003, customer: 'Initech', status: 'delivered', total: 410, placedAt: '2026-05-08' },
	{ id: 1004, customer: 'Umbrella Co.', status: 'cancelled', total: 220, placedAt: '2026-04-28' },
	{ id: 1005, customer: 'Stark Industries', status: 'open', total: 3120, placedAt: '2026-05-11' },
	{ id: 1006, customer: 'Wayne Enterprises', status: 'shipped', total: 1990, placedAt: '2026-05-09' },
	{ id: 1007, customer: 'Hooli', status: 'delivered', total: 660, placedAt: '2026-04-30' },
	{ id: 1008, customer: 'Pied Piper', status: 'open', total: 145, placedAt: '2026-05-14' },
]

const STATUS_ITEMS = [
	{ value: 'open', label: 'Open' },
	{ value: 'shipped', label: 'Shipped' },
	{ value: 'delivered', label: 'Delivered' },
	{ value: 'cancelled', label: 'Cancelled' },
]

const COLUMNS = createColumns<Order>([
	{ accessorKey: 'customer', header: 'Customer', filtering: { operators: true } },
	{
		accessorKey: 'status',
		header: 'Status',
		cell: { type: 'select', config: { items: STATUS_ITEMS } },
		filtering: { operators: true, defaultOperator: 'in' },
	},
	{ accessorKey: 'total', header: 'Total', cell: { type: 'number' }, filtering: { operators: true } },
	{ accessorKey: 'placedAt', header: 'Placed', cell: { type: 'date' }, filtering: { operators: true } },
])

const PANEL: CSSProperties = {
	display: 'flex',
	flexWrap: 'wrap',
	alignItems: 'flex-end',
	gap: '0.75rem',
	padding: '0.75rem',
	marginBottom: '0.75rem',
	border: '1px solid #e5e7eb',
	borderRadius: '0.5rem',
	fontSize: '0.875rem',
}

const FIELD: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' }

const CONTROL: CSSProperties = {
	padding: '0.25rem 0.5rem',
	border: '1px solid #d1d5db',
	borderRadius: '0.375rem',
	background: 'white',
	fontSize: '0.875rem',
}

const BUTTON: CSSProperties = { ...CONTROL, cursor: 'pointer' }

const INPUT_TYPE: Partial<Record<FilterEditor, string>> = {
	[FilterEditor.Text]: 'text',
	[FilterEditor.Number]: 'number',
	[FilterEditor.Date]: 'date',
}

function parseInput(filter: ColumnFilterModel, raw: string): unknown {
	if (raw === '') return undefined
	return filter.cellType === 'number' ? Number(raw) : raw
}

type ValueEditorProps = {
	filter: OperatorColumnFilterModel
	editor: FilterEditor
	value: unknown
	onChange: (value: unknown) => void
}

function ValueEditor({ filter, editor, value, onChange }: ValueEditorProps): ReactNode {
	if (editor === FilterEditor.None) return null

	if (editor === FilterEditor.MultiSelect) {
		const selected = Array.isArray(value) ? (value as string[]) : []
		return (
			<div style={{ display: 'flex', gap: '0.5rem' }}>
				{filter.items.map((item) => (
					<label key={item.value}>
						<input
							type='checkbox'
							checked={selected.includes(item.value)}
							onChange={(event) => {
								onChange(event.target.checked ? [...selected, item.value] : selected.filter((v) => v !== item.value))
							}}
						/>{' '}
						{item.label}
					</label>
				))}
			</div>
		)
	}

	if (editor === FilterEditor.Between) {
		const range = (value ?? {}) as { from?: unknown; to?: unknown }
		const type = filter.cellType === 'date' ? 'date' : 'number'
		return (
			<div style={{ display: 'flex', gap: '0.25rem' }}>
				<input
					aria-label={`${filter.label} from`}
					style={CONTROL}
					type={type}
					value={String(range.from ?? '')}
					onChange={(event) => {
						onChange({ ...range, from: parseInput(filter, event.target.value) })
					}}
				/>
				<input
					aria-label={`${filter.label} to`}
					style={CONTROL}
					type={type}
					value={String(range.to ?? '')}
					onChange={(event) => {
						onChange({ ...range, to: parseInput(filter, event.target.value) })
					}}
				/>
			</div>
		)
	}

	return (
		<input
			aria-label={`${filter.label} value`}
			style={CONTROL}
			type={INPUT_TYPE[editor] ?? 'text'}
			value={String(value ?? '')}
			onChange={(event) => {
				onChange(parseInput(filter, event.target.value))
			}}
		/>
	)
}

type FilterFieldProps = {
	filter: OperatorColumnFilterModel
	pending: ColumnFiltersValue
	onPendingChange: (next: ColumnFiltersValue) => void
}

function FilterField({ filter, pending, onPendingChange }: FilterFieldProps) {
	const current = pending[filter.columnId] ?? { operator: filter.operator, value: undefined }
	const write = (value: ColumnFiltersValue[string]) => {
		onPendingChange({ ...pending, [filter.columnId]: value })
	}

	return (
		<div style={FIELD}>
			<span style={{ fontWeight: 500 }}>{filter.label}</span>
			<div style={{ display: 'flex', gap: '0.25rem' }}>
				<select
					aria-label={`${filter.label} operator`}
					style={CONTROL}
					value={current.operator}
					onChange={(event) => {
						write(filter.nextValueForOperator(event.target.value, current))
					}}
				>
					{filter.operators.map((op) => (
						<option
							key={op.id}
							value={op.id}
						>
							{op.label}
						</option>
					))}
				</select>
				<ValueEditor
					filter={filter}
					editor={filter.editorFor(current.operator)}
					value={current.value}
					onChange={(value) => {
						write({ operator: current.operator, value })
					}}
				/>
			</div>
		</div>
	)
}

function OrderFilters() {
	const filters = useColumnFilters()
	const [pending, setPending] = useState<ColumnFiltersValue | null>(null)
	if (!filters) return null

	const shown = pending ?? filters.value
	const operatorFilters = filters.columns.flatMap(({ filter }) => (filter.hasOperators ? [filter] : []))

	return (
		<div style={PANEL}>
			{operatorFilters.map((filter) => (
				<FilterField
					key={filter.columnId}
					filter={filter}
					pending={shown}
					onPendingChange={setPending}
				/>
			))}
			<button
				type='button'
				style={BUTTON}
				disabled={pending === null}
				onClick={() => {
					filters.setValue(shown)
					setPending(null)
				}}
			>
				Apply
			</button>
			<button
				type='button'
				style={BUTTON}
				disabled={pending === null}
				onClick={() => {
					setPending(null)
				}}
			>
				Reset
			</button>
		</div>
	)
}

export function CustomFilterPanelExample() {
	const [requests, setRequests] = useState(0)

	return (
		<div>
			<p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
				filtering.onChange calls: <strong>{requests}</strong>
			</p>
			<DataGrid
				features={features}
				data={DATA}
				columns={COLUMNS}
				filtering={{
					onChange: () => {
						setRequests((count) => count + 1)
					},
				}}
			>
				<OrderFilters />
				<DataGrid.Table>
					<DataGrid.Header>
						{({ headerGroups }) =>
							headerGroups.map((headerGroup) => (
								<DataGrid.HeaderRow
									key={headerGroup.id}
									headerGroup={headerGroup}
								>
									{({ headers }) =>
										headers.map((header) => (
											<DataGrid.HeaderCell
												key={header.id}
												header={header}
											>
												{({ sortTrigger }) => <DataGrid.HeaderMain>{sortTrigger}</DataGrid.HeaderMain>}
											</DataGrid.HeaderCell>
										))
									}
								</DataGrid.HeaderRow>
							))
						}
					</DataGrid.Header>
					<DataGrid.Body />
				</DataGrid.Table>
			</DataGrid>
		</div>
	)
}
