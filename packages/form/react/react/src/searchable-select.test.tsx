import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { FormOptionSources } from './options/source-context'
import { testComponents } from './test-kit'

import type { OptionSourceRegistry, SearchableOptionSource } from './options/source-types'
import type { OptionValue, SelectOption } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * Server-side search: the source returns only the page matching the last query.
 *
 * Everything before this feature assumed a source hands back the whole list, so the option
 * for the value in form state was always on it. Here it usually is not — which is why a
 * searchable source answers a second question (`useSelectedOptions`) and the renderer merges
 * the two lists before the kit ever sees them. The regression these tests exist for is a
 * selected value rendering as a blank trigger because its option was not in the results.
 */

type Values = { country: string; city: string }

/** A catalogue deliberately larger than any one page of results. */
const CITIES: readonly SelectOption<OptionValue>[] = [
	{ label: 'Berlin', value: 'ber' },
	{ label: 'Bergen', value: 'bgo' },
	{ label: 'Lisbon', value: 'lis' },
	{ label: 'Porto', value: 'opo' },
]

/** What a search for `query` returns — a *page*, never the catalogue. */
function searchCities(query: string): readonly SelectOption<OptionValue>[] {
	if (query === '') return []
	return CITIES.filter((city) => city.label.toLowerCase().startsWith(query.toLowerCase()))
}

const { useForm, Form } = createForm({ components: testComponents })

function withSources(sources: OptionSourceRegistry, children: ReactNode): ReactNode {
	return <FormOptionSources value={sources}>{children}</FormOptionSources>
}

function searchInput(): HTMLInputElement {
	const input = document.querySelector('input[data-testkit="select-search"]')
	if (!(input instanceof HTMLInputElement)) throw new Error('No search input rendered')
	return input
}

function selectFor(name: string): HTMLSelectElement {
	const element = document.querySelector(`select[name="${name}"]`)
	if (!(element instanceof HTMLSelectElement)) throw new Error(`No select named "${name}"`)
	return element
}

/** The option labels currently on the field, in order — what the kit was handed. */
function optionLabels(name: string): string[] {
	return [...selectFor(name).options].map((option) => option.textContent)
}

type SearchSpy = {
	source: SearchableOptionSource
	queries: (string | undefined)[]
	selectedCalls: { values: readonly OptionValue[]; query: string | undefined }[]
}

/**
 * A source in the two-hook form, recording what each half was asked.
 *
 * Both members are declared as named `use…` functions and referenced, never written inline:
 * they *are* hooks, and React and the lint rule alike identify one by its name.
 */
function searchableCitySource(options?: { listLoading?: boolean; selectedLoading?: boolean }): SearchSpy {
	const queries: (string | undefined)[] = []
	const selectedCalls: { values: readonly OptionValue[]; query: string | undefined }[] = []

	function useCitySearch({ query }: { params: Record<string, unknown>; query?: string }) {
		queries.push(query)
		return { options: searchCities(query ?? ''), loading: options?.listLoading ?? false }
	}

	function useCitiesByValue({ values, query }: { values: readonly OptionValue[]; query?: string }) {
		selectedCalls.push({ values, query })
		return {
			options: CITIES.filter((city) => values.includes(city.value)),
			loading: options?.selectedLoading ?? false,
		}
	}

	return { source: { useOptions: useCitySearch, useSelectedOptions: useCitiesByValue }, queries, selectedCalls }
}

/** The searchable city field under test. Hoisted, so its identity is stable across renders. */
function SearchableCity({ defaults }: { defaults: Values }): ReactNode {
	const form = useForm({ defaultValues: defaults })
	return (
		<Form form={form}>
			<form.SelectField
				name='city'
				label='City'
				searchable
				optionsFrom='cities'
				optionsParams={{ country: defaults.country }}
			/>
		</Form>
	)
}

/** The same field without `searchable`, for the "never asks the second question" cases. */
function PlainCity({ defaults }: { defaults: Values }): ReactNode {
	const form = useForm({ defaultValues: defaults })
	return (
		<Form form={form}>
			<form.SelectField
				name='city'
				label='City'
				optionsFrom='cities'
			/>
		</Form>
	)
}

/** A searchable field wired to a static list: filtered client-side, no source involved. */
function StaticSearchableCity(): ReactNode {
	const form = useForm({ defaultValues: { country: 'de', city: '' } })
	return (
		<Form form={form}>
			<form.SelectField
				name='city'
				label='City'
				searchable
				options={[
					{ label: 'Berlin', value: 'ber' },
					{ label: 'Bremen', value: 'bre' },
					{ label: 'Cologne', value: 'cgn' },
				]}
			/>
		</Form>
	)
}

function renderSearchable(sources: OptionSourceRegistry, defaults: Values) {
	return render(withSources(sources, <SearchableCity defaults={defaults} />))
}

describe('searchable select', () => {
	it('resolves the label of a value the current results do not contain', () => {
		// The whole feature in one assertion: nothing has been typed, so the search returns an
		// empty page — and the preselected city still renders as "Lisbon", not as "lis" and not
		// as a blank trigger.
		const spy = searchableCitySource()
		renderSearchable({ cities: spy.source }, { country: 'pt', city: 'lis' })

		expect(searchCities('')).toHaveLength(0)
		expect(optionLabels('city')).toContain('Lisbon')
		expect(selectFor('city').value).toBe('lis')
	})

	it('calls `useSelectedOptions` with the current value, as an array', () => {
		const spy = searchableCitySource()
		renderSearchable({ cities: spy.source }, { country: 'pt', city: 'lis' })

		expect(spy.selectedCalls.length).toBeGreaterThan(0)
		expect(spy.selectedCalls.at(-1)?.values).toEqual(['lis'])
	})

	it('asks for nothing when the field is empty', () => {
		const spy = searchableCitySource()
		renderSearchable({ cities: spy.source }, { country: 'pt', city: '' })

		expect(spy.selectedCalls.at(-1)?.values).toEqual([])
	})

	it('passes the raw query straight to `useOptions`, with no debounce of its own', async () => {
		const user = userEvent.setup()
		const spy = searchableCitySource()
		renderSearchable({ cities: spy.source }, { country: 'de', city: '' })

		await user.type(searchInput(), 'ber')

		// Every keystroke, from the first character — debouncing is the source's job for now.
		expect(spy.queries).toContain('b')
		expect(spy.queries).toContain('be')
		expect(spy.queries.at(-1)).toBe('ber')
		expect(optionLabels('city')).toEqual(expect.arrayContaining(['Berlin', 'Bergen']))
	})

	it('does not duplicate a value present in both results', async () => {
		const user = userEvent.setup()
		const spy = searchableCitySource()
		renderSearchable({ cities: spy.source }, { country: 'de', city: 'ber' })

		await user.type(searchInput(), 'ber')

		const berlins = optionLabels('city').filter((label) => label === 'Berlin')
		expect(berlins).toHaveLength(1)
	})

	it('reports loading while *either* hook is loading', () => {
		const listing = searchableCitySource({ listLoading: true })
		const { unmount } = renderSearchable({ cities: listing.source }, { country: 'de', city: 'ber' })
		expect(selectFor('city').dataset.loading).toBe('true')
		unmount()

		const resolving = searchableCitySource({ selectedLoading: true })
		renderSearchable({ cities: resolving.source }, { country: 'de', city: 'ber' })
		expect(selectFor('city').dataset.loading).toBe('true')
	})

	it('is not loading once both hooks have settled', () => {
		const spy = searchableCitySource()
		renderSearchable({ cities: spy.source }, { country: 'de', city: 'ber' })

		expect(selectFor('city').dataset.loading).toBeUndefined()
	})

	it('never calls `useSelectedOptions` for a field that is not searchable', () => {
		const spy = searchableCitySource()

		render(withSources({ cities: spy.source }, <PlainCity defaults={{ country: 'de', city: 'ber' }} />))

		expect(spy.selectedCalls).toHaveLength(0)
		// The plain half of a two-hook source still serves a plain field.
		expect(spy.queries.at(-1)).toBeUndefined()
	})

	it('renders no search binding for a field that is not searchable', () => {
		const spy = searchableCitySource()

		render(withSources({ cities: spy.source }, <PlainCity defaults={{ country: 'de', city: '' }} />))

		expect(document.querySelector('input[data-testkit="select-search"]')).toBeNull()
	})

	it('throws, naming the field, when a searchable field is wired to a plain-function source', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const plain = () => ({ options: CITIES, loading: false })

		expect(() => {
			renderSearchable({ cities: plain }, { country: 'de', city: '' })
		}).toThrow(/Field "city" is `searchable`, but the option source "cities" is a plain function/)

		error.mockRestore()
	})

	it('searches a static options list client-side, with no source at all', async () => {
		const user = userEvent.setup()
		render(<StaticSearchableCity />)

		expect(optionLabels('city')).toEqual(['Berlin', 'Bremen', 'Cologne'])

		await user.type(searchInput(), 'bre')

		// Case-insensitive substring of the label — the one rule this package owns. 'Bremen'
		// matches, and so would 'BRE'; 'Berlin' does not.
		expect(optionLabels('city')).toEqual(['Bremen'])
	})
})
