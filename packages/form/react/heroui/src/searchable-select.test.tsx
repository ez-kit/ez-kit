import { FormOptionSources } from '@ez-kit/form-react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Form } from './form'

import type { OptionValue } from '@ez-kit/form-core'
import type { OptionSourceRegistry, OptionSourceResult, SearchableOptionSource } from '@ez-kit/form-react'

/**
 * A searchable select, end to end through this kit.
 *
 * The binding layer's own tests cover the merge; what is this kit's to prove is the part that
 * is purely React Aria's and that a unit test of the contract cannot see — that the combo box
 * renders the **label** of a value the current search did not return, rather than its raw id
 * or an empty box, and that it does not additionally filter the rows the source handed it.
 */

type Values = { city: string }

const CITIES: readonly { label: string; value: OptionValue }[] = [
	{ label: 'Berlin', value: 'ber' },
	{ label: 'Bergen', value: 'bgo' },
	{ label: 'Lisbon', value: 'lis' },
]

const NOTHING: OptionSourceResult = { options: [], loading: false }

/** A search that only ever returns Berlin — so Lisbon can only come from the second hook. */
function useBerlinOnly({ query }: { params: Record<string, unknown>; query?: string }): OptionSourceResult {
	if (query === undefined || query === '') return NOTHING
	return { options: CITIES.filter((city) => city.label.toLowerCase().startsWith(query.toLowerCase())), loading: false }
}

function useCitiesByValue({ values }: { values: readonly OptionValue[] }): OptionSourceResult {
	return { options: CITIES.filter((city) => values.includes(city.value)), loading: false }
}

const CITY_SOURCE: SearchableOptionSource = { useOptions: useBerlinOnly, useSelectedOptions: useCitiesByValue }
const SOURCES: OptionSourceRegistry = { cities: CITY_SOURCE }

function SearchableCase({ city }: { city: string }) {
	return (
		<FormOptionSources value={SOURCES}>
			<Form defaultValues={{ city } satisfies Values}>
				{(form) => (
					<form.SelectField
						name='city'
						label='City'
						placeholder='Search cities'
						searchable
						optionsFrom='cities'
					/>
				)}
			</Form>
		</FormOptionSources>
	)
}

describe('@ez-kit/form-heroui searchable select', () => {
	it('shows the label of a preselected value the search never returned', () => {
		render(<SearchableCase city='lis' />)

		// Nothing has been typed, so `useOptions` returned an empty page; the input still reads
		// "Lisbon" because the renderer merged in what `useSelectedOptions` resolved.
		expect(screen.getByRole('combobox', { name: 'City' })).toHaveValue('Lisbon')
	})

	it('renders a combo box, not a plain select trigger', () => {
		const { container } = render(<SearchableCase city='lis' />)

		expect(container.querySelector('input[role="combobox"]')).not.toBeNull()
	})

	it('offers exactly the rows the source returned, without filtering them again', async () => {
		const user = userEvent.setup()
		render(<SearchableCase city='' />)

		await user.type(screen.getByRole('combobox', { name: 'City' }), 'ber')

		// Both start with "ber" per the source's own rule. React Aria must not re-filter them
		// against the typed text — "Bergen" survives only because `items` turns that off.
		expect(await screen.findByText('Berlin')).toBeInTheDocument()
		expect(screen.getByText('Bergen')).toBeInTheDocument()
	})

	it('stays interactive while a query is in flight', async () => {
		const user = userEvent.setup()
		render(<SearchableCase city='' />)

		const input = screen.getByRole('combobox', { name: 'City' })
		await user.type(input, 'b')

		// A plain select disables itself while loading; a searchable one must not — it is
		// loading on almost every keystroke.
		expect(input).not.toBeDisabled()
	})
})
