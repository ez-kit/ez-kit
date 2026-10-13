import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { SubmitButton } from './blocks/form-parts'

import { Form } from './index'

/**
 * Focus on the first error, through this kit's real controls.
 *
 * The binding layer's walk focuses the element carrying the field's `id`, and falls back to the
 * first focusable element inside the field when that element cannot take focus. These fields are
 * the ones where the fallback decides: a radio group and a slider put the `id` on a container, so
 * what is proven here is that focus lands on the control a keyboard user drives.
 */

type Values = { size: string; volume: number; agree: boolean; notify: boolean; born: string }

const DEFAULTS: Values = { size: '', volume: 0, agree: false, notify: false, born: '' }

const OPTIONS = [
	{ label: 'Small', value: 'small' },
	{ label: 'Large', value: 'large' },
]

/** Every field on one form; only `invalid` fails, so the walk has exactly one place to go. */
function InvalidCase({ invalid }: { invalid: keyof Values }) {
	return (
		<Form
			defaultValues={DEFAULTS}
			validators={{ onSubmit: () => ({ fields: { [invalid]: 'Not accepted' } }) }}
		>
			{(form) => (
				<>
					<form.RadioGroupField
						name='size'
						label='Size'
						options={OPTIONS}
					/>
					<form.SliderField
						name='volume'
						label='Volume'
					/>
					<form.CheckboxField
						name='agree'
						label='Agree'
					/>
					<form.SwitchField
						name='notify'
						label='Notify'
					/>
					<form.DateField
						name='born'
						label='Born'
					/>
					<SubmitButton>Save</SubmitButton>
				</>
			)}
		</Form>
	)
}

function fieldWrapper(name: keyof Values): HTMLElement {
	const wrapper = document.querySelector<HTMLElement>(`[data-field="${name}"]`)
	if (wrapper === null) throw new Error(`no [data-field="${name}"] rendered`)
	return wrapper
}

describe('@ez-kit/form-shadcn focus on the first error', () => {
	it.each([
		['size', 'radio'],
		['volume', 'slider'],
		['agree', 'checkbox'],
		['notify', 'switch'],
		['born', 'button'],
	] as const)('focuses the %s field on its %s control', async (name, role) => {
		const user = userEvent.setup()
		render(<InvalidCase invalid={name} />)

		await user.click(screen.getByRole('button', { name: 'Save' }))

		const control = within(fieldWrapper(name)).getAllByRole(role)[0]
		await waitFor(() => {
			expect(document.activeElement).toBe(control)
		})
	})
})
