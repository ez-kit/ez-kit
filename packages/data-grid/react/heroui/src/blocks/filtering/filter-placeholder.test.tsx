import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NumberFilterInput } from '../cell-types/NumberCell'
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

describe('filter placeholder (heroui)', () => {
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

		expect(screen.getByRole('button', { name: 'Any status Filter Status…' })).toHaveTextContent('Any status')
	})

	it('shows the hint in the text filter', () => {
		render(<TextCellInput {...field({ placeholder: '10 digits' })} />)

		expect(screen.getByPlaceholderText('10 digits')).toBeInTheDocument()
	})

	it('shows the hint in the number filter', () => {
		render(<NumberFilterInput {...field({ placeholder: 'Amount' })} />)

		expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument()
	})
})
