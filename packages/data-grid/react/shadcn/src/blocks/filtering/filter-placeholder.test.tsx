import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NumberCellInput } from '../cell-types/NumberCell'
import { TextCellInput } from '../cell-types/TextCell'

import { MultiSelectFilter } from './MultiSelectFilter'

import type { FieldState } from '@ez-kit/data-grid-react'

const ITEMS = [
	{ value: 'open', label: 'Open' },
	{ value: 'done', label: 'Done' },
]

function field(overrides: Partial<FieldState> = {}): FieldState {
	return {
		id: 'filter-inn',
		value: undefined,
		onChange: vi.fn(),
		onBlur: vi.fn(),
		error: undefined,
		errors: [],
		isValidating: false,
		...overrides,
	}
}

describe('filter placeholder (shadcn)', () => {
	it('names an empty multi-select by its label and the hint it shows', () => {
		render(
			<MultiSelectFilter
				items={ITEMS}
				selectedValues={[]}
				onChange={vi.fn()}
				label='Filter Status…'
				placeholder='Any status'
			/>,
		)

		expect(screen.getByRole('button', { name: 'Filter Status…, Any status' })).toHaveTextContent('Any status')
	})

	it('names a multi-select with picked values by its label and what it shows', () => {
		render(
			<MultiSelectFilter
				items={ITEMS}
				selectedValues={['open']}
				onChange={vi.fn()}
				label='Filter Status…'
				placeholder='Any status'
			/>,
		)

		expect(screen.getByRole('button', { name: 'Filter Status…, Open' })).toBeInTheDocument()
	})

	it('does not repeat the name when the placeholder is the name', () => {
		render(
			<MultiSelectFilter
				items={ITEMS}
				selectedValues={[]}
				onChange={vi.fn()}
				label='Filter Status…'
				placeholder='Filter Status…'
			/>,
		)

		expect(screen.getByRole('button', { name: 'Filter Status…' })).toBeInTheDocument()
	})

	it('shows the hint in the text filter', () => {
		render(<TextCellInput {...field({ placeholder: '10 digits' })} />)

		expect(screen.getByPlaceholderText('10 digits')).toBeInTheDocument()
	})

	it('shows the hint in the number filter', () => {
		render(<NumberCellInput {...field({ placeholder: 'Amount' })} />)

		expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument()
	})
})
