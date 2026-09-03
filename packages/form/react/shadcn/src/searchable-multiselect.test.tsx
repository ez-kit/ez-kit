import { FormOptionSources } from '@ez-kit/form-react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Form } from './form'

import type { OptionValue } from '@ez-kit/form-core'
import type { OptionSourceRegistry, OptionSourceResult, SearchableOptionSource } from '@ez-kit/form-react'

/**
 * A searchable multiselect, end to end through this kit.
 *
 * The binding layer's own tests cover the merge and the value array; what belongs here is
 * what only the Base UI combobox can show — that each **chip** reads the label of a value the
 * current search never returned, and that picking a result adds a chip and empties the query.
 */

type Values = { cities: string[] }

const CITIES: readonly { label: string; value: OptionValue }[] = [
	{ label: 'Berlin', value: 'ber' },
	{ label: 'Bergen', value: 'bgo' },
	{ label: 'Lisbon', value: 'lis' },
	{ label: 'Porto', value: 'opo' },
]

const NOTHING: OptionSourceResult = { options: [], loading: false }

/** A search that returns nothing until asked — so a chip's label can only come from below. */
function useCitySearch({ query }: { params: Record<string, unknown>; query?: string }): OptionSourceResult {
	if (query === undefined || query === '') return NOTHING
	return { options: CITIES.filter((city) => city.label.toLowerCase().startsWith(query.toLowerCase())), loading: false }
}

function useCitiesByValue({ values }: { values: readonly OptionValue[] }): OptionSourceResult {
	return { options: CITIES.filter((city) => values.includes(city.value)), loading: false }
}

const CITY_SOURCE: SearchableOptionSource = { useOptions: useCitySearch, useSelectedOptions: useCitiesByValue }
const SOURCES: OptionSourceRegistry = { cities: CITY_SOURCE }

function SearchableCase({ cities }: { cities: string[] }) {
	return (
		<FormOptionSources value={SOURCES}>
			<Form defaultValues={{ cities } satisfies Values}>
				{(form) => (
					<form.MultiSelectField
						name='cities'
						label='Cities'
						placeholder='Search cities'
						searchable
						optionsFrom='cities'
					/>
				)}
			</Form>
		</FormOptionSources>
	)
}

function chipTexts(container: HTMLElement): string[] {
	return [...container.querySelectorAll('[data-slot="combobox-chip"]')].map((chip) => chip.textContent)
}

describe('@ez-kit/form-shadcn searchable multiselect', () => {
	it('shows a label on every chip, for values the search never returned', () => {
		const { container } = render(<SearchableCase cities={['lis', 'opo']} />)

		// Nothing has been typed, so `useOptions` returned an empty page; the chips still read
		// "Lisbon" and "Porto" because the renderer merged in what `useSelectedOptions` resolved.
		expect(chipTexts(container)).toEqual(expect.arrayContaining([expect.stringContaining('Lisbon')]))
		expect(chipTexts(container)).toEqual(expect.arrayContaining([expect.stringContaining('Porto')]))
	})

	it('renders the combobox chips rather than the plain popover trigger', () => {
		const { container } = render(<SearchableCase cities={['lis']} />)

		expect(container.querySelector('[data-slot="combobox-chips"]')).not.toBeNull()
		expect(container.querySelector('[data-slot="popover-trigger"]')).toBeNull()
	})

	it('offers exactly the rows the source returned, without filtering them again', async () => {
		const user = userEvent.setup()
		render(<SearchableCase cities={[]} />)

		await user.type(screen.getByRole('combobox'), 'ber')

		expect(await screen.findByText('Berlin')).toBeInTheDocument()
		expect(screen.getByText('Bergen')).toBeInTheDocument()
	})

	it('adds a chip and clears the query when a result is picked', async () => {
		const user = userEvent.setup()
		const { container } = render(<SearchableCase cities={[]} />)

		const input = screen.getByRole('combobox')
		await user.type(input, 'berg')
		await user.click(await screen.findByText('Bergen'))

		expect(chipTexts(container)).toEqual([expect.stringContaining('Bergen')])
		// The term that produced the chip must not stay behind narrowing the next search.
		expect(input).toHaveValue('')
	})

	it('stays interactive while a query is in flight', async () => {
		const user = userEvent.setup()
		render(<SearchableCase cities={[]} />)

		const input = screen.getByRole('combobox')
		await user.type(input, 'b')

		expect(input).not.toBeDisabled()
	})

	it('leaves a non-searchable multiselect on the plain popover trigger', () => {
		function PlainCase() {
			return (
				<FormOptionSources value={SOURCES}>
					<Form defaultValues={{ cities: ['lis'] } satisfies Values}>
						{(form) => (
							<form.MultiSelectField
								name='cities'
								label='Cities'
								optionsFrom='cities'
							/>
						)}
					</Form>
				</FormOptionSources>
			)
		}

		const { container } = render(<PlainCase />)

		expect(container.querySelector('[data-slot="combobox-chips"]')).toBeNull()
	})
})
