import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MultiSelectFilter } from '../filtering/MultiSelectFilter'

import { BadgeCellView } from './BadgeCell'
import { SelectCellInput, SelectCellView } from './SelectCell'

import type { FieldState, SelectCellConfig } from '@ez-kit/data-grid-react'

const BERLIN = { value: 'wh_12', label: 'Berlin' }
const OLD_DEPOT = { value: 'wh_3', label: 'Old Depot' }

function field(overrides: Partial<FieldState<SelectCellConfig>> = {}): FieldState<SelectCellConfig> {
	return {
		id: 'edit-warehouse',
		value: undefined,
		onChange: vi.fn(),
		onBlur: vi.fn(),
		error: undefined,
		errors: [],
		isValidating: false,
		...overrides,
	}
}

function openMultiSelect(): void {
	fireEvent.click(screen.getByRole('button'))
}

describe('value list states (shadcn)', () => {
	it('draws a skeleton while a select cell’s label is pending', () => {
		const { container } = render(
			<SelectCellView
				value='wh_12'
				row={{}}
				rowIndex={0}
				itemStatus='pending'
			/>,
		)

		expect(container.querySelector('[data-slot="select-cell-skeleton"]')).not.toBeNull()
		expect(screen.queryByText('wh_12')).toBeNull()
	})

	it('draws a skeleton while a badge cell’s label is pending', () => {
		const { container } = render(
			<BadgeCellView
				value='open'
				row={{}}
				rowIndex={0}
				itemStatus='pending'
			/>,
		)

		expect(container.querySelector('[data-slot="badge-cell-skeleton"]')).not.toBeNull()
	})

	it.each(['error', 'missing'] as const)('shows the raw value when the label is %s', (itemStatus) => {
		render(
			<SelectCellView
				value='wh_99'
				row={{}}
				rowIndex={0}
				config={{ items: [BERLIN] }}
				itemStatus={itemStatus}
			/>,
		)

		expect(screen.getByText('wh_99')).toBeInTheDocument()
	})

	it('marks a raw value whose list failed, and names the failure', () => {
		render(
			<SelectCellView
				value='wh_12'
				row={{}}
				rowIndex={0}
				config={{ items: [] }}
				itemStatus='error'
			/>,
		)

		expect(screen.getByText('wh_12')).toHaveAttribute('title', 'Couldn’t load the options.')
	})

	it('announces the editor’s failed list beside the control', () => {
		render(<SelectCellInput {...field({ config: { items: [] }, itemsError: new Error('503') })} />)

		expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load the options.')
	})

	it('labels a cell from the resolved item, list or not', () => {
		render(
			<SelectCellView
				value='wh_12'
				row={{}}
				rowIndex={0}
				config={{ items: [] }}
				itemStatus='resolved'
				item={BERLIN}
			/>,
		)

		expect(screen.getByText('Berlin')).toBeInTheDocument()
	})

	it('names the editor’s current value from the base item it no longer offers', () => {
		render(<SelectCellInput {...field({ value: 'wh_3', config: { items: [BERLIN] }, item: OLD_DEPOT })} />)

		expect(screen.getByRole('combobox')).toHaveTextContent('Old Depot')
	})

	it('says on the editor’s trigger that its empty list is loading', () => {
		render(<SelectCellInput {...field({ config: { items: [] }, itemsLoading: true })} />)

		expect(screen.getByRole('combobox')).toHaveTextContent('Loading')
	})

	it('shows a loading state instead of an empty multi-select', () => {
		render(
			<MultiSelectFilter
				items={[]}
				selectedValues={[]}
				onChange={vi.fn()}
				label='Filter Warehouse…'
				itemsLoading
			/>,
		)
		openMultiSelect()

		expect(screen.getByRole('group', { name: 'Filter Warehouse…' })).toHaveAttribute('aria-busy', 'true')
		expect(screen.getByRole('status')).toHaveTextContent('Loading')
		expect(screen.queryByText('No results')).toBeNull()
	})

	it('shows the error of a failed list', () => {
		render(
			<MultiSelectFilter
				items={[]}
				selectedValues={[]}
				onChange={vi.fn()}
				itemsError={new Error('503')}
			/>,
		)
		openMultiSelect()

		expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load the options.')
	})

	it('shows a zero count and keeps the value selectable', () => {
		const onChange = vi.fn()
		render(
			<MultiSelectFilter
				items={[{ value: 'archived', label: 'Archived', count: 0 }]}
				selectedValues={[]}
				onChange={onChange}
			/>,
		)
		openMultiSelect()

		expect(screen.getByText('0')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('checkbox'))
		expect(onChange).toHaveBeenCalledWith(['archived'])
	})
})
