import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Form } from './form'

/**
 * The `loading` half of the option-bearing fields.
 *
 * What matters is exactly two things per field: a skeleton stands in for what is not there
 * yet, and the control cannot be operated meanwhile — which is also what keeps a value that
 * arrived before its option from rendering as an empty trigger.
 */

type Values = {
	role: string
	tagIds: string[]
	perks: string[]
	plan: string
}

const DEFAULTS: Values = { role: 'admin', tagIds: [], perks: [], plan: '' }

const OPTIONS = [
	{ label: 'User', value: 'user' },
	{ label: 'Admin', value: 'admin' },
]

/** The marker both kits' skeletons carry, so the same assertion works either side. */
const SKELETON = '[data-form-skeleton]'

function LoadingCase({ loading }: { loading: boolean }) {
	return (
		<Form defaultValues={DEFAULTS}>
			{(form) => (
				<>
					<form.SelectField
						name='role'
						label='Role'
						loading={loading}
						options={loading ? [] : OPTIONS}
					/>
					<form.MultiSelectField
						name='tagIds'
						label='Tags'
						loading={loading}
						options={loading ? [] : OPTIONS}
					/>
					<form.CheckboxGroupField
						name='perks'
						label='Perks'
						loading={loading}
						options={loading ? [] : OPTIONS}
					/>
					<form.RadioGroupField
						name='plan'
						label='Plan'
						loading={loading}
						options={loading ? [] : OPTIONS}
					/>
				</>
			)}
		</Form>
	)
}

describe('@ez-kit/form-heroui loading options', () => {
	it('renders a skeleton in every option-bearing field while loading', () => {
		const { container } = render(<LoadingCase loading />)

		// One per field: two triggers, two placeholder lists.
		expect(container.querySelectorAll(SKELETON).length).toBeGreaterThanOrEqual(4)
	})

	it('renders no skeleton once the options have arrived', () => {
		const { container } = render(<LoadingCase loading={false} />)

		expect(container.querySelector(SKELETON)).toBeNull()
	})

	it('keeps the select and multi-select triggers non-interactive while loading', () => {
		render(<LoadingCase loading />)

		expect(screen.getByLabelText('Role')).toBeDisabled()
		expect(screen.getByLabelText('Tags')).toBeDisabled()
	})

	it('shows a skeleton rather than a stale value on a select whose value outran its options', () => {
		render(<LoadingCase loading />)

		// `role` is already 'admin', but no option carries that label yet.
		expect(screen.queryByText('Admin')).not.toBeInTheDocument()
	})

	it('disables the expanded groups while loading', () => {
		const { container } = render(<LoadingCase loading />)

		for (const name of ['perks', 'plan']) {
			const root = container.querySelector(`[data-field="${name}"]`)

			expect(root).toHaveAttribute('data-loading', 'true')
			// React Aria reports a disabled group on the root rather than per option.
			expect(root).toHaveAttribute('aria-disabled', 'true')
		}
	})
})
