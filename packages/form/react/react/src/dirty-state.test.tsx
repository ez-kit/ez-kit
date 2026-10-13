import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { ReactNode } from 'react'

const { Form, useForm } = createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })

type Profile = {
	name: string
}

const SAVED: Profile = { name: 'Ann' }

/** How a save hands its value back: the three shapes the submission docs discuss. */
const SaveRecipe = {
	/** `reset(value)`, with `defaultValues` written inline — the hazard. */
	ResetInline: 'reset-inline',
	/** `reset(value)`, and the saved value fed back as `defaultValues` through state. */
	ResetWithState: 'reset-with-state',
	/** `reset(value, { keepDefaultValues: true })`, with `defaultValues` written inline. */
	ResetKeepingDefaults: 'reset-keeping-defaults',
} as const

type SaveRecipe = (typeof SaveRecipe)[keyof typeof SaveRecipe]

function renderEditor(recipe: SaveRecipe): void {
	function Editor(): ReactNode {
		const [, force] = useState(0)
		const [saved, setSaved] = useState(SAVED)
		const form = useForm({
			defaultValues: recipe === SaveRecipe.ResetWithState ? saved : { name: SAVED.name },
			onSubmit: ({ value, formApi }) => {
				if (recipe === SaveRecipe.ResetWithState) setSaved(value)
				formApi.reset(value, { keepDefaultValues: recipe === SaveRecipe.ResetKeepingDefaults })
			},
		})
		return (
			<Form form={form}>
				<form.TextField
					name='name'
					label='Name'
				/>
				<form.Submit>{({ isDirty }) => <output aria-label='dirty'>{String(isDirty)}</output>}</form.Submit>
				<form.Subscribe selector={(state) => state.isDefaultValue}>
					{(isDefault) => <output aria-label='default'>{String(isDefault)}</output>}
				</form.Subscribe>
				<form.SubmitButton>Save</form.SubmitButton>
				<button
					type='button'
					onClick={() => {
						force((n) => n + 1)
					}}
				>
					Re-render
				</button>
			</Form>
		)
	}
	render(<Editor />)
}

async function editSaveAndRerender(): Promise<void> {
	const user = userEvent.setup()
	await user.type(screen.getByLabelText('Name'), 'a')
	expect(screen.getByLabelText('dirty')).toHaveTextContent('true')
	await user.click(screen.getByRole('button', { name: 'Save' }))
	await waitFor(() => {
		expect(screen.getByLabelText('dirty')).toHaveTextContent('false')
	})
	expect(screen.getByLabelText('Name')).toHaveValue('Anna')
	await user.click(screen.getByRole('button', { name: 'Re-render' }))
}

describe('dirty state recipes', () => {
	it('is clean again after reset(value) in onSubmit, and stays clean across re-renders', async () => {
		renderEditor(SaveRecipe.ResetWithState)
		await editSaveAndRerender()
		expect(screen.getByLabelText('dirty')).toHaveTextContent('false')
		expect(screen.getByLabelText('Name')).toHaveValue('Anna')
		expect(screen.getByLabelText('default')).toHaveTextContent('true')
	})

	it('loses the saved value on the next render when defaultValues stay inline', async () => {
		renderEditor(SaveRecipe.ResetInline)
		await editSaveAndRerender()
		expect(screen.getByLabelText('Name')).toHaveValue('Ann')
		expect(screen.getByLabelText('dirty')).toHaveTextContent('false')
	})

	it('keeps the saved value with keepDefaultValues, but no longer reads as the default', async () => {
		renderEditor(SaveRecipe.ResetKeepingDefaults)
		await editSaveAndRerender()
		expect(screen.getByLabelText('Name')).toHaveValue('Anna')
		expect(screen.getByLabelText('dirty')).toHaveTextContent('false')
		expect(screen.getByLabelText('default')).toHaveTextContent('false')
	})

	it('takes late defaultValues while untouched, and not after the user typed', async () => {
		const user = userEvent.setup()
		function Late({ loaded }: { loaded: string }): ReactNode {
			return (
				<Form defaultValues={{ name: loaded }}>
					{(form) => (
						<form.TextField
							name='name'
							label='Name'
						/>
					)}
				</Form>
			)
		}
		const { rerender } = render(<Late loaded='' />)
		rerender(<Late loaded='Ann' />)
		await waitFor(() => {
			expect(screen.getByLabelText('Name')).toHaveValue('Ann')
		})
		await user.type(screen.getByLabelText('Name'), 'x')
		rerender(<Late loaded='Bob' />)
		expect(screen.getByLabelText('Name')).toHaveValue('Annx')
	})
})
