import { createColumns, createTable } from '@ez-kit/data-grid-core'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { DefaultLayout } from '../layouts/default-layout'
import { FilterPanelLayout } from '../layouts/filter-panel-layout'
import { PopoverFiltersLayout } from '../layouts/popover-filters-layout'
import { prepareDataGridTable } from '../prepare-table'
import { TEST_FEATURES, TEST_OPERATORS, testComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'
import { useFilters } from './filter-panel'
import { TableProvider } from './table-context'

import type { GridComponents } from '../contract'
import type { BetweenInputProps, GridFeatures, InputProps, MultiSelectFilterProps, OperatorSelectProps } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'
import type { ComponentType, ReactElement, ReactNode } from 'react'

/**
 * The filter's merged `config` — `cell.config` under `filtering.config` — reaching the kit's own
 * value controls (`MultiSelectFilter`, `BetweenInput`) wherever they are mounted, and the filter
 * model. `core.Input` and `OperatorSelect` render more than a column's value and get none.
 */

type Row = { id: number; tag: string; status: string; score: number }

const ROWS: Row[] = [
	{ id: 1, tag: 'a', status: 'open', score: 3 },
	{ id: 2, tag: 'b', status: 'done', score: 7 },
]

const TAG_ITEMS = [
	{ value: 'a', label: 'A' },
	{ value: 'b', label: 'B' },
]

const COLUMNS = createColumns<Row>([
	{
		accessorKey: 'tag',
		header: 'Tag',
		cell: { type: 'select', config: { items: TAG_ITEMS } },
		filtering: { operators: true, config: { creatable: true } },
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: { type: 'select', config: { items: [{ value: 'open', label: 'Open' }] } },
		filtering: { operators: true },
	},
])

type Received = {
	multiSelect: MultiSelectFilterProps[]
	between: BetweenInputProps[]
	input: InputProps[]
	operatorSelect: OperatorSelectProps[]
}

function spies(): { received: Received; components: GridComponents } {
	const received: Received = { multiSelect: [], between: [], input: [], operatorSelect: [] }
	const { Input } = testComponents.core
	const { OperatorSelect, BetweenInput } = testComponents.filtering
	const components: GridComponents = {
		core: {
			Input: (props: InputProps) => {
				received.input.push(props)
				return <Input {...props} />
			},
		},
		filtering: {
			MultiSelectFilter: (props: MultiSelectFilterProps) => {
				received.multiSelect.push(props)
				return (
					<div
						role='group'
						aria-label={props.label}
					/>
				)
			},
			BetweenInput: (props: BetweenInputProps) => {
				received.between.push(props)
				return <BetweenInput {...props} />
			},
			OperatorSelect: (props: OperatorSelectProps) => {
				received.operatorSelect.push(props)
				return <OperatorSelect {...props} />
			},
		},
	}
	return { received, components }
}

function renderWithLayout(
	Layout: ComponentType,
	config: Partial<UseDataGridConfig<GridFeatures, Row>> = {},
): { received: Received; table: () => ReturnType<typeof useDataGrid<GridFeatures, Row>> } {
	const { received, components } = spies()
	const ref: { table: ReturnType<typeof useDataGrid<GridFeatures, Row>> | null } = { table: null }
	function Harness(): ReactElement {
		const table = useDataGrid<GridFeatures, Row>({
			features: TEST_FEATURES,
			operators: TEST_OPERATORS,
			data: ROWS,
			columns: COLUMNS,
			filtering: true,
			...config,
		})
		ref.table = table
		return (
			<DataGrid<GridFeatures, Row>
				table={table}
				components={{ ...components, core: { ...components.core, Layout } }}
			/>
		)
	}
	render(
		<GridComponentsProvider components={testComponents}>
			<Harness />
		</GridComponentsProvider>,
	)
	return {
		received,
		table: () => {
			if (!ref.table) throw new Error('the grid did not render')
			return ref.table
		},
	}
}

function lastFor<T extends { label?: string | undefined }>(received: T[], label: string): T | undefined {
	return [...received].reverse().find((props) => props.label === label)
}

describe('filtering.config — MultiSelectFilter', () => {
	it('reaches the header filter', () => {
		const { received } = renderWithLayout(DefaultLayout)

		expect(lastFor(received.multiSelect, 'Filter Tag…')?.config).toEqual({ items: TAG_ITEMS, creatable: true })
	})

	it('reaches the header popover', async () => {
		const user = userEvent.setup()
		const { received } = renderWithLayout(PopoverFiltersLayout)

		for (const trigger of screen.getAllByRole('button', { name: 'Filter' })) await user.click(trigger)

		expect(lastFor(received.multiSelect, 'Filter Tag…')?.config).toEqual({ items: TAG_ITEMS, creatable: true })
	})

	it('reaches the filter panel', async () => {
		const user = userEvent.setup()
		const { received } = renderWithLayout(FilterPanelLayout)

		await user.click(screen.getByRole('button', { name: /Tag/ }))

		expect(lastFor(received.multiSelect, 'Filter Tag…')?.config).toEqual({ items: TAG_ITEMS, creatable: true })
	})

	it('hands the same config object to every render while the column and its list stay the same', () => {
		const { received, table } = renderWithLayout(DefaultLayout)

		act(() => {
			table().setColumnFilters([{ id: 'status', value: { operator: 'in', value: ['open'] } }])
		})

		const configs = received.multiSelect.filter((props) => props.label === 'Filter Tag…').map((props) => props.config)
		expect(configs.length).toBeGreaterThan(1)
		expect(new Set(configs).size).toBe(1)
	})

	it('carries only the base for a column without a layer', () => {
		const { received } = renderWithLayout(DefaultLayout)

		expect(lastFor(received.multiSelect, 'Filter Status…')?.config).toEqual({
			items: [{ value: 'open', label: 'Open' }],
		})
	})

	it('reaches the multi-select of a filter field', async () => {
		const user = userEvent.setup()
		const { received } = renderWithLayout(FilterPanelLayout, {
			filtering: {
				manual: true,
				fields: [
					{
						id: 'warehouse',
						header: 'Warehouse',
						cell: { type: 'select', config: { items: [{ value: 'msk', label: 'Moscow' }] } },
						filtering: { operators: true, config: { mode: 'tags' } },
					},
				],
			},
		})

		await user.click(screen.getByRole('button', { name: /Warehouse/ }))

		expect(lastFor(received.multiSelect, 'Filter Warehouse…')?.config).toEqual({
			items: [{ value: 'msk', label: 'Moscow' }],
			mode: 'tags',
		})
	})
})

describe('filtering.config — the other filter controls', () => {
	const SCORE = createColumns<Row>([
		{
			accessorKey: 'score',
			header: 'Score',
			cell: { type: 'number' },
			filtering: {
				operators: { betweenOperator: { min: 0, max: 10 } },
				defaultOperator: 'between',
				config: { unit: '%' },
			},
		},
		{ accessorKey: 'tag', header: 'Tag', filtering: { operators: true, config: { hint: 'x' } } },
	])

	it('reaches BetweenInput beside its own bounds', () => {
		const { received } = renderWithLayout(DefaultLayout, { columns: SCORE })

		const between = received.between.at(-1)
		expect(between?.min).toBe(0)
		expect(between?.max).toBe(10)
		expect(between?.config).toEqual({ unit: '%' })
	})

	it('reaches a date column’s BetweenInput', () => {
		type Dated = Row & { due: string }
		const columns = createColumns<Dated>([
			{
				accessorKey: 'due',
				header: 'Due',
				cell: { type: 'date', config: { format: { month: 'short' } } },
				filtering: { operators: true, defaultOperator: 'between', config: { weekStartsOn: 1 } },
			},
		])
		const { received } = renderWithLayout(DefaultLayout, { columns: columns as never })

		const between = received.between.at(-1)
		expect(between?.type).toBe('date')
		expect(between?.config).toEqual({ format: { month: 'short' }, weekStartsOn: 1 })
	})

	it('does not reach core.Input or OperatorSelect', () => {
		const { received } = renderWithLayout(DefaultLayout, { columns: SCORE })

		expect(received.input.length).toBeGreaterThan(0)
		expect(received.operatorSelect.length).toBeGreaterThan(0)
		expect(received.input.every((props) => !('config' in props))).toBe(true)
		expect(received.operatorSelect.every((props) => !('config' in props))).toBe(true)
	})
})

describe('filtering.config — the filter model and the rows', () => {
	function hook(columns = COLUMNS) {
		const table = prepareDataGridTable(
			createTable<GridFeatures, Row>({
				features: TEST_FEATURES,
				operators: TEST_OPERATORS,
				data: ROWS,
				columns,
				filtering: true,
			}),
		)
		function Wrapper({ children }: { children: ReactNode }) {
			return (
				<GridComponentsProvider components={testComponents}>
					<TableProvider table={table}>{children}</TableProvider>
				</GridComponentsProvider>
			)
		}
		return { table, ...renderHook(() => useFilters(), { wrapper: Wrapper }) }
	}

	it('hands the model the config the renderer gets', () => {
		const { result } = hook()

		const tag = result.current?.filters.find((target) => target.id === 'tag')
		expect(tag?.filter.config).toEqual({ items: TAG_ITEMS, creatable: true })
	})

	it('is undefined for a column with no config, no layer and no list', () => {
		const { result } = hook(createColumns<Row>([{ accessorKey: 'tag', header: 'Tag', filtering: { operators: true } }]))

		const tag = result.current?.filters.find((target) => target.id === 'tag')
		expect(tag?.filter).toBeDefined()
		expect(tag?.filter.config).toBeUndefined()
	})

	it('changes nothing about which rows a filter keeps', () => {
		const { received, table } = renderWithLayout(DefaultLayout)
		expect(received.multiSelect.length).toBeGreaterThan(0)

		act(() => {
			table().setColumnFilters([{ id: 'tag', value: { operator: 'in', value: ['c'] } }])
		})

		expect(table().getRowModel().rows).toHaveLength(0)
	})
})
