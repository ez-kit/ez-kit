import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { testComponents } from '../test-kit'

/**
 * The layout contract — `Section` and `Grid` with `Grid.Item` — is what a document's blocks and
 * `columns` render through. This test proves the test kit implements it, with the props a real
 * kit's `satisfies FormComponents` checks.
 */
test('the test kit implements the layout contract', () => {
	render(
		<testComponents.Section
			title='Client'
			description={undefined}
		>
			<testComponents.Grid columns={2}>
				<testComponents.Grid.Item colSpan={2}>field</testComponents.Grid.Item>
			</testComponents.Grid>
		</testComponents.Section>,
	)

	expect(screen.getByTestId('grid')).toHaveAttribute('data-columns', '2')
	expect(screen.getByTestId('grid-item')).toHaveAttribute('data-col-span', '2')
	expect(screen.getByText('Client')).toBeInTheDocument()
})
