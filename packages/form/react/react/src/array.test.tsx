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

function scopeFlags(scope: { disabled: boolean; required: boolean }) {
	return (
		<div>
			<span data-testid='scope-disabled'>{String(scope.disabled)}</span>
			<span data-testid='scope-required'>{String(scope.required)}</span>
		</div>
	)
}

/** `disabled` / `required` omitted entirely — never passed, not even as `undefined`. */
function ScopeFlagsOmittedList() {
	return (
		<Form
			defaultValues={{ people: [{ firstName: 'Ada' }] }}
			onSubmit={() => {
				// unused in this assertion
			}}
		>
			{(form) => (
				<form.Array
					name='people'
					newItem={NEW_PERSON}
				>
					{scopeFlags}
				</form.Array>
			)}
		</Form>
	)
}

function ScopeFlagsGivenList() {
	return (
		<Form
			defaultValues={{ people: [{ firstName: 'Ada' }] }}
			onSubmit={() => {
				// unused in this assertion
			}}
		>
			{(form) => (
				<form.Array
					name='people'
					newItem={NEW_PERSON}
					disabled
					required
				>
					{scopeFlags}
				</form.Array>
			)}
		</Form>
	)
}

function MaxLengthList() {
	return (
		<Form
			defaultValues={{ people: [{ firstName: 'Ada' }] }}
			onSubmit={() => {
				// unused in this assertion
			}}
		>
			{(form) => (
				<form.Array
					name='people'
					newItem={NEW_PERSON}
					validate={{ maxLength: 1 }}
				>
					{({ items, add, canAdd }) => (
						<ul>
							{items.map((item) => (
								<li key={item.key}>
									<item.TextField
										name='firstName'
										label={`Name ${String(item.index)}`}
									/>
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
			)}
		</Form>
	)
}

describe('form.Array', () => {
	it('renders no chrome of its own', () => {
		render(<BareList />)
		// test-kit's ArrayField / ArrayItem stamp `data-testkit`, not `data-slot`; assert against
		// the literals the kit actually writes (verified against test-kit.tsx), not a slot the kit
		// never stamps — a query for a slot that is stamped nowhere can never fail and proves
		// nothing.
		expect(document.querySelector('[data-testkit="array"]')).toBeNull()
		expect(document.querySelector('[data-testkit="array-items"]')).toBeNull()
		expect(document.querySelector('[data-testkit="array-item"]')).toBeNull()
		expect(document.querySelector('[data-field-type="array"]')).toBeNull()
		expect(screen.getByRole('list')).toBeInTheDocument()
	})

	it('surfaces disabled and required on the scope, normalised to false when omitted', () => {
		render(<ScopeFlagsOmittedList />)
		expect(screen.getByTestId('scope-disabled')).toHaveTextContent('false')
		expect(screen.getByTestId('scope-required')).toHaveTextContent('false')
	})

	it('surfaces disabled and required on the scope as data when given, since the primitive draws no frame to put them on', () => {
		render(<ScopeFlagsGivenList />)
		expect(screen.getByTestId('scope-disabled')).toHaveTextContent('true')
		expect(screen.getByTestId('scope-required')).toHaveTextContent('true')
	})

	it('forwards validate to the engine, so canAdd reflects maxLength', () => {
		render(<MaxLengthList />)
		expect(screen.getByRole('button', { name: 'add' })).toBeDisabled()
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
