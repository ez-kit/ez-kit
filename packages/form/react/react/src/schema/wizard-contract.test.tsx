import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { testComponents } from '../test-kit'

/**
 * The `Wizard` contract member — one flat props object, kit owns the tree (I5, see
 * `contract.ts`). This test proves the test kit renders the chrome those props describe,
 * which is what makes it a compile error (`satisfies FormComponents`) for a real kit to skip.
 */
test('the test kit renders the wizard chrome from the props it is given', () => {
	render(
		<testComponents.Wizard
			steps={[
				{
					index: 0,
					title: 'One',
					description: undefined,
					status: 'current',
					invalid: false,
					disabled: false,
					goTo: () => {},
				},
				{
					index: 1,
					title: 'Two',
					description: undefined,
					status: 'upcoming',
					invalid: false,
					disabled: true,
					goTo: () => {},
				},
			]}
			currentIndex={0}
			canGoBack={false}
			canGoNext
			isLastStep={false}
			goNext={() => {}}
			goBack={() => {}}
			submitting={false}
		>
			body
		</testComponents.Wizard>,
	)

	expect(screen.getAllByTestId('wizard-step')).toHaveLength(2)
	expect(screen.getByRole('button', { name: /back/i })).toBeDisabled()
	expect(screen.getByText('body')).toBeInTheDocument()
})
