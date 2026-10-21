import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { OperatorSelect } from './OperatorSelect'

import type { FilterOperatorOption } from '@ez-kit/data-grid-react'

const OPERATORS: FilterOperatorOption[] = [
	{ id: 'contains', label: 'Contains', filterFn: () => true },
	{ id: 'greaterOrEqual', label: 'Greater than or equal', filterFn: () => true },
]

describe('heroui OperatorSelect', () => {
	it('shows the current label, named after it, while no icon is given', () => {
		render(
			<OperatorSelect
				operators={OPERATORS}
				currentOperatorId='greaterOrEqual'
				onChange={vi.fn()}
			/>,
		)

		const button = screen.getByRole('button', { name: 'Filter operator: Greater than or equal' })
		expect(button).toHaveTextContent('Greater than or equal')
		// react-aria writes `true`, which ARIA defines as `menu`.
		expect(button).toHaveAttribute('aria-haspopup')
	})

	it('shows the icon in place of the label once one is given', () => {
		render(
			<OperatorSelect
				operators={[{ id: 'contains', label: 'Contains', icon: '*a*', filterFn: () => true }]}
				currentOperatorId='contains'
				onChange={vi.fn()}
			/>,
		)

		const button = screen.getByRole('button', { name: 'Filter operator: Contains' })
		expect(button).toHaveTextContent('*a*')
		expect(button).not.toHaveTextContent('Contains')
	})
})
