// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

const { Form } = createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })

/**
 * On a real server there is no `window`, which is what the step flow's isomorphic layout effects read:
 * React 18 warns about a plain `useLayoutEffect` rendered there, once per call. The DOM test files
 * cannot show this — jsdom defines `window`.
 */
describe('form.Steps on the server', () => {
	it('renders the initial step and its fields without a warning', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		const html = renderToString(
			<Form defaultValues={{ email: '', card: '' }}>
				{(form) => (
					<form.Steps initial='payment'>
						<form.Step name='account'>
							<form.TextField
								name='email'
								label='Email'
							/>
						</form.Step>
						<form.Step name='payment'>
							<form.TextField
								name='card'
								label='Card'
							/>
						</form.Step>
					</form.Steps>
				)}
			</Form>,
		)

		expect(html).toContain('Card')
		expect(error).not.toHaveBeenCalled()
		error.mockRestore()
	})
})
