import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createForm } from './create-form'
import { FormOptionSources } from './options/source-context'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { OptionSourceRegistry, SearchableOptionSource } from './options/source-types'
import type { OptionValue, Searchable, SearchSettings, SelectOption } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * The query a searchable field hands its source: debounced, and gated on a minimum length.
 *
 * The kit gets the typed text at once — it is what the input shows, and what a creatable
 * field's "Add …" row is built from. The source gets it only after a pause in typing, and only
 * once it is long enough; below that it gets `undefined`, and the kit shows a hint where an
 * empty list would say "No matches". The first fake-timer tests in this package, so every case
 * runs between `useFakeTimers` and `useRealTimers`.
 */

type Values = { country: string; city: string; cities: string[] }

const CITIES: readonly SelectOption[] = [
	{ label: 'Berlin', value: 'ber' },
	{ label: 'Bergen', value: 'bgo' },
	{ label: 'Lisbon', value: 'lis' },
]

/** The default pause of a remote source — what case 1 waits out, a millisecond at a time. */
const REMOTE_DEBOUNCE = 300

const HINT = (minLength: number): string => `Type at least ${String(minLength)} characters`

function searchCities(query: string): readonly SelectOption[] {
	if (query === '') return []
	return CITIES.filter((city) => city.label.toLowerCase().startsWith(query.toLowerCase()))
}

const { useForm, Form } = createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })

type SearchSpy = { source: SearchableOptionSource; queries: (string | undefined)[] }

/** A two-hook source recording every query its list hook was handed. */
function citySource(settings: SearchSettings = {}, { pendingWithoutQuery = false } = {}): SearchSpy {
	const queries: (string | undefined)[] = []

	// `pendingWithoutQuery` mimics a TanStack Query v5 hook disabled for an absent query: it stays
	// `isPending`, so it reports `loading: true` for as long as there is nothing to search.
	function useCitySearch({ query }: { params: Record<string, unknown>; query?: string }) {
		queries.push(query)
		return { options: searchCities(query ?? ''), loading: pendingWithoutQuery && query === undefined }
	}

	function useCitiesByValue({ values }: { values: readonly OptionValue[] }) {
		return { options: CITIES.filter((city) => values.includes(city.value)), loading: false }
	}

	return { source: { ...settings, useOptions: useCitySearch, useSelectedOptions: useCitiesByValue }, queries }
}

type FieldKind = 'select' | 'multiselect'

function City({
	kind,
	searchable = true,
	country = 'de',
	defaults = { country: 'de', city: '', cities: [] },
}: {
	kind: FieldKind
	searchable?: Searchable
	country?: string
	defaults?: Values
}): ReactNode {
	const form = useForm({ defaultValues: defaults })
	return (
		<Form form={form}>
			{kind === 'select' ? (
				<form.SelectField
					name='city'
					label='City'
					searchable={searchable}
					optionsFrom='cities'
					optionsParams={{ country }}
				/>
			) : (
				<form.MultiSelectField
					name='cities'
					label='Cities'
					searchable={searchable}
					optionsFrom='cities'
					optionsParams={{ country }}
				/>
			)}
		</Form>
	)
}

function withSources(sources: OptionSourceRegistry, children: ReactNode): ReactNode {
	return <FormOptionSources value={sources}>{children}</FormOptionSources>
}

function searchInput(kind: FieldKind): HTMLInputElement {
	const input = document.querySelector(`input[data-testkit="${kind}-search"]`)
	if (!(input instanceof HTMLInputElement)) throw new Error(`No ${kind} search input rendered`)
	return input
}

function control(kind: FieldKind): HTMLSelectElement {
	const element = document.querySelector(`select[data-testkit="${kind}"]`)
	if (!(element instanceof HTMLSelectElement)) throw new Error(`No ${kind} rendered`)
	return element
}

function optionLabels(kind: FieldKind): string[] {
	return [...control(kind).options].map((option) => option.textContent)
}

function hint(): string | null {
	return document.querySelector('[data-testkit="search-hint"]')?.textContent ?? null
}

function advance(ms: number): void {
	act(() => {
		vi.advanceTimersByTime(ms)
	})
}

beforeEach(() => {
	vi.useFakeTimers()
})

afterEach(() => {
	vi.useRealTimers()
})

/**
 * Types `text` one character at a time, with no time passing between keys — fast typing.
 *
 * `fireEvent` rather than `userEvent`: Testing Library's async wrapper waits on a real
 * `setTimeout(0)` that vitest's fake clock never fires, so an awaited `user.type` hangs here.
 */
function type(input: HTMLInputElement, text: string): void {
	for (const character of text) {
		fireEvent.change(input, { target: { value: input.value + character } })
	}
}

function clear(input: HTMLInputElement): void {
	fireEvent.change(input, { target: { value: '' } })
}

describe.each<FieldKind>(['select', 'multiselect'])('the query a searchable %s hands its source', (kind) => {
	it('waits out the default 300 ms pause, then hands over the whole text once', () => {
		const spy = citySource()
		render(withSources({ cities: spy.source }, <City kind={kind} />))

		type(searchInput(kind), 'ber')

		expect(searchInput(kind).value).toBe('ber')
		expect(new Set(spy.queries)).toEqual(new Set(['']))

		advance(REMOTE_DEBOUNCE - 1)
		expect(spy.queries.filter((query) => query !== '' && query !== undefined)).toEqual([])

		advance(1)
		expect(spy.queries.filter((query) => query !== '' && query !== undefined)).toEqual(['ber'])
		expect(spy.queries.at(-1)).toBe('ber')
	})

	it('reads `debounce` and `minLength` from the source, and shows a hint below the minimum', () => {
		const spy = citySource({ debounce: 0, minLength: 2 })
		const defaults: Values = { country: 'de', city: 'lis', cities: ['lis'] }
		render(
			withSources(
				{ cities: spy.source },
				<City
					kind={kind}
					defaults={defaults}
				/>,
			),
		)

		type(searchInput(kind), 'b')

		expect(spy.queries).not.toContain('b')
		expect(spy.queries.at(-1)).toBeUndefined()
		expect(hint()).toBe(HINT(2))
		expect(optionLabels(kind)).toContain('Lisbon')

		type(searchInput(kind), 'e')

		expect(spy.queries.at(-1)).toBe('be')
		expect(hint()).toBeNull()
		expect(optionLabels(kind)).toEqual(expect.arrayContaining(['Berlin', 'Bergen', 'Lisbon']))
	})

	it("lets the field's own settings win over the source's", () => {
		const spy = citySource({ debounce: 0, minLength: 2 })
		render(
			withSources(
				{ cities: spy.source },
				<City
					kind={kind}
					searchable={{ minLength: 3 }}
				/>,
			),
		)

		type(searchInput(kind), 'be')
		expect(spy.queries).not.toContain('be')
		expect(hint()).toBe(HINT(3))

		type(searchInput(kind), 'r')
		expect(spy.queries.at(-1)).toBe('ber')
		expect(hint()).toBeNull()
	})

	it('hands over the cleared text once the input is emptied', () => {
		const spy = citySource({ debounce: REMOTE_DEBOUNCE, minLength: 0 })
		render(withSources({ cities: spy.source }, <City kind={kind} />))

		type(searchInput(kind), 'ber')
		advance(REMOTE_DEBOUNCE)
		expect(spy.queries.at(-1)).toBe('ber')

		clear(searchInput(kind))
		advance(REMOTE_DEBOUNCE)

		expect(spy.queries.at(-1)).toBe('')
	})

	it('reports loading while a debounce is pending', () => {
		const spy = citySource()
		render(withSources({ cities: spy.source }, <City kind={kind} />))

		expect(control(kind).dataset.loading).toBeUndefined()

		type(searchInput(kind), 'ber')
		expect(control(kind).dataset.loading).toBe('true')

		advance(REMOTE_DEBOUNCE)
		expect(control(kind).dataset.loading).toBeUndefined()
	})

	it("keeps a disabled source's loading out of the kit below the minimum", () => {
		const spy = citySource({ debounce: 0, minLength: 2 }, { pendingWithoutQuery: true })
		render(withSources({ cities: spy.source }, <City kind={kind} />))

		type(searchInput(kind), 'b')

		expect(hint()).toBe(HINT(2))
		expect(control(kind).dataset.loading).toBeUndefined()
	})

	it('cancels a pending query when the parameters change', () => {
		const spy = citySource()
		const { rerender } = render(withSources({ cities: spy.source }, <City kind={kind} />))

		type(searchInput(kind), 'ber')
		rerender(
			withSources(
				{ cities: spy.source },
				<City
					kind={kind}
					country='pt'
				/>,
			),
		)
		advance(REMOTE_DEBOUNCE)

		expect(spy.queries).not.toContain('ber')
		expect(searchInput(kind).value).toBe('')
	})
})

describe('a searchable field over an in-memory list', () => {
	function StaticCity({ searchable = true }: { searchable?: Searchable }): ReactNode {
		const form = useForm({ defaultValues: { country: 'de', city: 'lis', cities: [] } })
		return (
			<Form form={form}>
				<form.SelectField
					name='city'
					label='City'
					searchable={searchable}
					options={CITIES}
				/>
			</Form>
		)
	}

	it('filters at once, without waiting for a timer', () => {
		render(<StaticCity />)

		type(searchInput('select'), 'berg')

		expect(optionLabels('select')).toEqual(['Bergen', 'Lisbon'])
	})

	it('honours a field-level minimum, keeping the selected option and showing the hint', () => {
		render(<StaticCity searchable={{ minLength: 2 }} />)

		type(searchInput('select'), 'b')

		expect(hint()).toBe(HINT(2))
		expect(optionLabels('select')).toEqual(['Lisbon'])

		type(searchInput('select'), 'e')

		expect(hint()).toBeNull()
		expect(optionLabels('select')).toEqual(['Berlin', 'Bergen', 'Lisbon'])
	})
})

describe('a creatable searchable field over a source', () => {
	function CreatableCity({ source }: { source: SearchableOptionSource }): ReactNode {
		const form = useForm({ defaultValues: { country: 'de', city: '', cities: [] } })
		return withSources(
			{ cities: source },
			<Form form={form}>
				<form.SelectField
					name='city'
					label='City'
					searchable
					creatable
					optionsFrom='cities'
				/>
			</Form>,
		)
	}

	it('offers the typed text at once, before the source has seen it', () => {
		const spy = citySource()
		render(<CreatableCity source={spy.source} />)

		type(searchInput('select'), 'zz')

		expect(spy.queries).not.toContain('zz')
		expect(optionLabels('select')).toContain('Add "zz"')
	})
})

/** Type cases only — compiled by `typecheck`, never rendered. */
export function SearchSettingsTypeCases(): ReactNode {
	const form = useForm({ defaultValues: { country: 'de', city: '', cities: [] } })
	return (
		<Form form={form}>
			<form.SelectField
				name='city'
				label='City'
				searchable={{ debounce: 100 }}
				options={[{ label: 'Berlin', value: 'ber' }]}
			/>
			<form.SelectField
				name='city'
				label='City'
				// @ts-expect-error -- not a number
				searchable={{ debounce: '100' }}
				options={[{ label: 'Berlin', value: 'ber' }]}
			/>
		</Form>
	)
}

describe('search settings types', () => {
	it('takes a settings object on the field and on the source', () => {
		const settings: SearchSettings = { debounce: 200 }
		const source = citySource(settings).source

		expectTypeOf(source).toExtend<SearchableOptionSource>()
		expectTypeOf<SearchableOptionSource>().toHaveProperty('debounce')
		expectTypeOf<SearchableOptionSource>().toHaveProperty('minLength')
		expectTypeOf<{ debounce: 200 }>().toExtend<Searchable>()
		expectTypeOf<{ debounce: '200' }>().not.toExtend<Searchable>()
	})
})
