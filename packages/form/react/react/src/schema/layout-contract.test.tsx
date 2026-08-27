import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { testComponents } from '../test-kit'

/**
 * The layout contract — `Section` and `GridItem` — is what config-driven forms use to group
 * fields into headed, column-gridded blocks. This test proves the test kit implements it,
 * which is what makes it a compile error (`satisfies FormComponents`) for a real kit to skip.
 */
test('the test kit implements the layout contract', () => {
	render(
		<testComponents.Section
			title='Client'
			description={undefined}
			columns={2}
		>
			<testComponents.GridItem colSpan={2}>field</testComponents.GridItem>
		</testComponents.Section>,
	)

	expect(screen.getByTestId('section')).toHaveAttribute('data-columns', '2')
	expect(screen.getByTestId('grid-item')).toHaveAttribute('data-col-span', '2')
	expect(screen.getByText('Client')).toBeInTheDocument()
})
