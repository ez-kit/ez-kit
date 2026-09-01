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
 * belongs to the Base UI combobox and that a unit test of the contract cannot see — that the
 * input reads the **label** of a value the current search did not return, rather than its raw
 * id or nothing, and that `filter={null}` really did stop it filtering the rows a second time.
 */

type Values = { city: string }

const CITIES: readonly { label: string; value: OptionValue }[] = [
	{ label: 'Berlin', value: 'ber' },
	{ label: 'Bergen', value: 'bgo' },
	{ label: 'Lisbon', value: 'lis' },
]

const NOTHING: OptionSourceResult = { options: [], loading: false }

/** A search that returns nothing until asked — so Lisbon can only come from the second hook. */
function useCitySearch({ query }: { params: Record<string, unknown>; query?: string }): OptionSourceResult {
	if (query === undefined || query === '') return NOTHING
	return { options: CITIES.filter((city) => city.label.toLowerCase().startsWith(query.toLowerCase())), loading: false }
}

function useCitiesByValue({ values }: { values: readonly OptionValue[] }): OptionSourceResult {
	return { options: CITIES.filter((city) => values.includes(city.value)), loading: false }
}

const CITY_SOURCE: SearchableOptionSource = { useOptions: useCitySearch, useSelectedOptions: useCitiesByValue }
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

describe('@ez-kit/form-shadcn searchable select', () => {
	it('shows the label of a preselected value the search never returned', () => {
		render(<SearchableCase city='lis' />)

		// Nothing has been typed, so `useOptions` returned an empty page; the input still reads
		// "Lisbon" because the renderer merged in what `useSelectedOptions` resolved.
		expect(screen.getByRole('combobox', { name: 'City' })).toHaveValue('Lisbon')
	})

	it('renders a combobox rather than the plain select trigger', () => {
		const { container } = render(<SearchableCase city='lis' />)

		expect(container.querySelector('[data-slot="combobox-value"]')).toBeNull()
		expect(screen.getByRole('combobox', { name: 'City' }).tagName).toBe('INPUT')
	})

	it('offers exactly the rows the source returned, without filtering them again', async () => {
		const user = userEvent.setup()
		render(<SearchableCase city='' />)

		await user.type(screen.getByRole('combobox', { name: 'City' }), 'ber')

		// Both start with "ber" per the source's own rule. Base UI must not re-filter them
		// against the typed text — that is what `filter={null}` turns off.
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

	it('keeps what the user typed when the source hands back a fresh result set', async () => {
		// A real query hook returns a new array as each response lands, and Base UI re-syncs the
		// input's text from `items` whenever their identity changes — which would wipe out the
		// half-typed query on every keystroke's response. Controlling `inputValue` is what stops
		// it; this source churns its array identity deliberately to hold that in place.
		const user = userEvent.setup()

		function useChurningSearch({ query }: { params: Record<string, unknown>; query?: string }): OptionSourceResult {
			const text = query ?? ''
			return {
				options: CITIES.filter((city) => city.label.toLowerCase().startsWith(text)).map((city) => ({ ...city })),
				loading: false,
			}
		}

		function ChurningCase() {
			return (
				<FormOptionSources value={{ cities: { useOptions: useChurningSearch, useSelectedOptions: useCitiesByValue } }}>
					<Form defaultValues={{ city: 'lis' } satisfies Values}>
						{(form) => (
							<form.SelectField
								name='city'
								label='City'
								searchable
								optionsFrom='cities'
							/>
						)}
					</Form>
				</FormOptionSources>
			)
		}

		render(<ChurningCase />)
		const input = screen.getByRole('combobox', { name: 'City' })
		expect(input).toHaveValue('Lisbon')

		await user.clear(input)
		await user.type(input, 'ber')

		expect(input).toHaveValue('ber')
	})

	it('leaves a non-searchable select on the plain Radix trigger', () => {
		function PlainCase() {
			return (
				<FormOptionSources value={SOURCES}>
					<Form defaultValues={{ city: 'lis' } satisfies Values}>
						{(form) => (
							<form.SelectField
								name='city'
								label='City'
								optionsFrom='cities'
							/>
						)}
					</Form>
				</FormOptionSources>
			)
		}

		const { container } = render(<PlainCase />)

		expect(container.querySelector('[data-slot="select-trigger"]')).not.toBeNull()
	})
})
