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
 * Server-side search over a **multi-value** field.
 *
 * The single-value case is pinned in `searchable-select.test.tsx`; everything here is about
 * what changes when the selection is a list. Which, deliberately, is almost nothing: the
 * source contract did not move — `useSelectedOptions` already took its `values` as an array —
 * so the source used below is the same shape a searchable `select` would be given, and the
 * test at the bottom proves one literally serves both fields at once.
 *
 * The regression this file exists for is the chips: with a server-side search the selected
 * cities are usually absent from the current page of results, so without the second query
 * they would read as raw ids ("lis") or as nothing at all.
 */

type Values = { country: string; cities: string[]; city: string }

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
	const input = document.querySelector('input[data-testkit="multiselect-search"]')
	if (!(input instanceof HTMLInputElement)) throw new Error('No search input rendered')
	return input
}

function multiselectFor(name: string): HTMLSelectElement {
	const element = document.querySelector(`select[name="${name}"]`)
	if (!(element instanceof HTMLSelectElement)) throw new Error(`No multiselect named "${name}"`)
	return element
}

/** The option labels currently on the field, in order — what the kit was handed. */
function optionLabels(name: string): string[] {
	return [...multiselectFor(name).options].map((option) => option.textContent)
}

/** The text of each chip, in selection order — what a person actually reads. */
function chipLabels(): string[] {
	return [...document.querySelectorAll('[data-testkit="multiselect-chip"]')].map((chip) => chip.textContent)
}

function selectedValues(name: string): string[] {
	return [...multiselectFor(name).selectedOptions].map((option) => option.value)
}

type SearchSpy = {
	source: SearchableOptionSource
	queries: (string | undefined)[]
	selectedCalls: { values: readonly OptionValue[]; query: string | undefined }[]
}

/**
 * A source in the two-hook form, recording what each half was asked.
 *
 * Written exactly as a source for a searchable *select* would be — nothing about it knows the
 * field it serves holds a list.
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

/** The searchable multi-city field under test. Hoisted, so its identity is stable. */
function SearchableCities({ defaults }: { defaults: Values }): ReactNode {
	const form = useForm({ defaultValues: defaults })
	return (
		<Form form={form}>
			<form.MultiSelectField
				name='cities'
				label='Cities'
				searchable
				optionsFrom='cities'
				optionsParams={{ country: defaults.country }}
			/>
		</Form>
	)
}

/** Nothing selected. Typed, so the empty list does not infer as `never[]`. */
const EMPTY_DEFAULTS: Values = { country: 'de', cities: [], city: '' }

/** A searchable multiselect wired to a static list — legal TSX, a runtime error by design. */
function StaticSearchableCities(): ReactNode {
	const form = useForm({ defaultValues: EMPTY_DEFAULTS })
	return (
		<Form form={form}>
			<form.MultiSelectField
				name='cities'
				label='Cities'
				searchable
				options={[{ label: 'Berlin', value: 'ber' }]}
			/>
		</Form>
	)
}

/** The same field without `searchable`, for the "never asks the second question" case. */
function PlainCities({ country, cities }: { country: string; cities: string[] }): ReactNode {
	const form = useForm({ defaultValues: { country, cities, city: '' } })
	return (
		<Form form={form}>
			<form.MultiSelectField
				name='cities'
				label='Cities'
				optionsFrom='cities'
			/>
		</Form>
	)
}

/** One source, both kinds of field, in one form — the "no source change needed" claim. */
function OneSourceTwoFields(): ReactNode {
	const form = useForm({ defaultValues: { country: 'pt', cities: ['lis', 'opo'], city: 'ber' } })
	return (
		<Form form={form}>
			<form.SelectField
				name='city'
				label='City'
				searchable
				optionsFrom='cities'
			/>
			<form.MultiSelectField
				name='cities'
				label='Cities'
				searchable
				optionsFrom='cities'
			/>
		</Form>
	)
}

function renderSearchable(sources: OptionSourceRegistry, defaults: Values) {
	return render(withSources(sources, <SearchableCities defaults={defaults} />))
}

function defaults(cities: string[], country = 'pt'): Values {
	return { country, cities, city: '' }
}

describe('searchable multiselect', () => {
	it('labels every selected value the current results do not contain', () => {
		// The whole feature in one assertion: nothing has been typed, so the search returns an
		// empty page — and both preselected cities still read as their labels, not as "lis"
		// and "opo" and not as blanks.
		const spy = searchableCitySource()
		renderSearchable({ cities: spy.source }, defaults(['lis', 'opo']))

		expect(searchCities('')).toHaveLength(0)
		expect(chipLabels()).toEqual(['Lisbon', 'Porto'])
		expect(optionLabels('cities')).toEqual(expect.arrayContaining(['Lisbon', 'Porto']))
	})

	it('calls `useSelectedOptions` with the whole value array', () => {
		const spy = searchableCitySource()
		renderSearchable({ cities: spy.source }, defaults(['lis', 'opo']))

		expect(spy.selectedCalls.length).toBeGreaterThan(0)
		expect(spy.selectedCalls.at(-1)?.values).toEqual(['lis', 'opo'])
	})

	it('asks for nothing when nothing is selected', () => {
		const spy = searchableCitySource()
		renderSearchable({ cities: spy.source }, defaults([]))

		expect(spy.selectedCalls.at(-1)?.values).toEqual([])
	})

	it('serves a searchable select and a searchable multiselect from the identical source', () => {
		// The source contract did not change for this feature, and this is what says so: one
		// registry entry, written for the single-value case, resolving both fields' labels.
		const spy = searchableCitySource()
		render(withSources({ cities: spy.source }, <OneSourceTwoFields />))

		expect(chipLabels()).toEqual(['Lisbon', 'Porto'])
		expect(optionLabels('city')).toContain('Berlin')
		expect(spy.selectedCalls.some((call) => call.values.length === 2)).toBe(true)
		expect(spy.selectedCalls.some((call) => call.values.length === 1)).toBe(true)
	})

	it('passes the raw query straight to `useOptions`, with no debounce of its own', async () => {
		const user = userEvent.setup()
		const spy = searchableCitySource()
		renderSearchable({ cities: spy.source }, defaults([], 'de'))

		await user.type(searchInput(), 'ber')

		expect(spy.queries).toContain('b')
		expect(spy.queries).toContain('be')
		expect(spy.queries.at(-1)).toBe('ber')
		expect(optionLabels('cities')).toEqual(expect.arrayContaining(['Berlin', 'Bergen']))
	})

	it('does not duplicate a selected value that the search also returned', async () => {
		const user = userEvent.setup()
		const spy = searchableCitySource()
		renderSearchable({ cities: spy.source }, defaults(['ber'], 'de'))

		await user.type(searchInput(), 'ber')

		const berlins = optionLabels('cities').filter((label) => label === 'Berlin')
		expect(berlins).toHaveLength(1)
	})

	it('clears the query once a selection lands', async () => {
		const user = userEvent.setup()
		const spy = searchableCitySource()
		renderSearchable({ cities: spy.source }, defaults([], 'de'))

		await user.type(searchInput(), 'berg')
		expect(searchInput().value).toBe('berg')

		await user.selectOptions(multiselectFor('cities'), 'bgo')

		expect(searchInput().value).toBe('')
		expect(selectedValues('cities')).toEqual(['bgo'])
		// And the chip still reads as a label, though "" returns no page at all.
		expect(chipLabels()).toEqual(['Bergen'])
	})

	it('reports loading while *either* hook is loading', () => {
		const listing = searchableCitySource({ listLoading: true })
		const { unmount } = renderSearchable({ cities: listing.source }, defaults(['lis']))
		expect(multiselectFor('cities').dataset.loading).toBe('true')
		unmount()

		const resolving = searchableCitySource({ selectedLoading: true })
		renderSearchable({ cities: resolving.source }, defaults(['lis']))
		expect(multiselectFor('cities').dataset.loading).toBe('true')
	})

	it('is not loading once both hooks have settled', () => {
		const spy = searchableCitySource()
		renderSearchable({ cities: spy.source }, defaults(['lis']))

		expect(multiselectFor('cities').dataset.loading).toBeUndefined()
	})

	it('clears the whole selection to `[]` when the source parameters change', () => {
		// `b4cfee8` behaviour, unchanged by search: a new country makes every chosen city
		// meaningless, and the list value goes back to empty rather than to `undefined`.
		const spy = searchableCitySource()
		const { rerender } = renderSearchable({ cities: spy.source }, defaults(['lis', 'opo']))
		expect(chipLabels()).toEqual(['Lisbon', 'Porto'])

		rerender(withSources({ cities: spy.source }, <SearchableCities defaults={defaults(['lis', 'opo'], 'de')} />))

		expect(chipLabels()).toEqual([])
		expect(spy.selectedCalls.at(-1)?.values).toEqual([])
	})

	it('renders no search binding for a multiselect that is not searchable', () => {
		const spy = searchableCitySource()

		render(
			withSources(
				{ cities: spy.source },
				<PlainCities
					country='de'
					cities={['ber']}
				/>,
			),
		)

		expect(document.querySelector('input[data-testkit="multiselect-search"]')).toBeNull()
		expect(spy.selectedCalls).toHaveLength(0)
	})

	it('throws, naming the field, when a searchable multiselect is wired to a plain-function source', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const plain = () => ({ options: CITIES, loading: false })

		expect(() => {
			renderSearchable({ cities: plain }, defaults([]))
		}).toThrow(/Field "cities" is `searchable`, but the option source "cities" is a plain function/)

		error.mockRestore()
	})

	it('throws, naming the field, when a searchable multiselect has a static options list', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		expect(() => {
			render(<StaticSearchableCities />)
		}).toThrow(/Field "cities" is `searchable`, which requires an `optionsFrom` source/)

		error.mockRestore()
	})
})
