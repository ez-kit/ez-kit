import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents } from './test-kit'

type Person = { firstName: string }
type Values = { people: Person[] }

const { Form } = createForm({ components: testComponents })
const NEW_PERSON: Person = { firstName: '' }

function BareList({ onSubmit }: { onSubmit?: (values: Values) => void }) {
	return (
		<Form
			defaultValues={{ people: [{ firstName: 'Ada' }] }}
			onSubmit={({ value }) => {
				onSubmit?.(value)
			}}
		>
			{(form) => (
				<>
					<form.Array
						name='people'
						newItem={NEW_PERSON}
					>
						{({ items, add, canAdd }) => (
							<ul>
								{items.map((item) => (
									<li key={item.key}>
										<item.TextField
											name='firstName'
											label={`Name ${String(item.index)}`}
										/>
										<button
											type='button'
											onClick={item.remove}
										>{`remove ${String(item.index)}`}</button>
									</li>
								))}
								<button
									type='button'
									onClick={() => {
										add()
									}}
									disabled={!canAdd}
								>
									add
								</button>
							</ul>
						)}
					</form.Array>
					<form.SubmitButton>Save</form.SubmitButton>
				</>
			)}
		</Form>
	)
}

describe('form.Array', () => {
	it('renders no chrome of its own', () => {
		render(<BareList />)
		// test-kit's ArrayField / ArrayItem stamp no `data-slot` (they use `data-testkit`), so a
		// null-data-slot assertion here would never fail regardless of what renders. Assert
		// instead that the chrome ArrayField would add — its default "Add" control — is absent.
		expect(screen.queryByRole('button', { name: 'Add' })).toBeNull()
		expect(screen.getByRole('list')).toBeInTheDocument()
	})

	it('removes the entry the author asked for', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<BareList onSubmit={onSubmit} />)

		await user.click(screen.getByRole('button', { name: 'add' }))
		await user.type(screen.getByLabelText('Name 1'), 'Grace')
		await user.click(screen.getByRole('button', { name: 'remove 0' }))
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ people: [{ firstName: 'Grace' }] })
		})
	})

	it('addresses the entry paths from inside an entry', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<BareList onSubmit={onSubmit} />)

		await user.clear(screen.getByLabelText('Name 0'))
		await user.type(screen.getByLabelText('Name 0'), 'Katherine')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ people: [{ firstName: 'Katherine' }] })
		})
	})
})
