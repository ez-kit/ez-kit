'use client'

import { FormOptionSources } from '@ez-kit/form-react'
import { useEffect, useState } from 'react'

import { Form } from 'shared/form/FormKit'

import type { OptionSourceRegistry } from '@ez-kit/form-react'

/** One row of the catalogue the "backend" owns. */
type City = { id: number; name: string; country: string }

/**
 * A catalogue the form never receives whole — the premise of the whole feature.
 *
 * Form state holds `cities: [4821, 4825]` while the current results are whatever matched the
 * last few characters typed, so the options carrying those two ids are usually absent. That
 * is exactly why every chip needs a label resolved by a second query.
 *
 * Each example on this site is self-contained, so this list is its own; the single-value
 * demo next door has a longer one for the same reason.
 */
const CITIES: readonly City[] = [
	{ id: 1001, name: 'Berlin', country: 'de' },
	{ id: 1002, name: 'Bremen', country: 'de' },
	{ id: 1003, name: 'Bonn', country: 'de' },
	{ id: 1004, name: 'Bochum', country: 'de' },
	{ id: 1005, name: 'Bielefeld', country: 'de' },
	{ id: 1006, name: 'Hamburg', country: 'de' },
	{ id: 1007, name: 'Hannover', country: 'de' },
	{ id: 1008, name: 'Heidelberg', country: 'de' },
	{ id: 1009, name: 'Munich', country: 'de' },
	{ id: 1010, name: 'Mainz', country: 'de' },
	{ id: 1011, name: 'Mannheim', country: 'de' },
	{ id: 1012, name: 'Cologne', country: 'de' },
	{ id: 1013, name: 'Dresden', country: 'de' },
	{ id: 1014, name: 'Dortmund', country: 'de' },
	{ id: 1015, name: 'Düsseldorf', country: 'de' },
	{ id: 1016, name: 'Frankfurt', country: 'de' },
	{ id: 1017, name: 'Freiburg', country: 'de' },
	{ id: 1018, name: 'Stuttgart', country: 'de' },
	{ id: 1019, name: 'Leipzig', country: 'de' },
	{ id: 1020, name: 'Nuremberg', country: 'de' },
	{ id: 4821, name: 'Lisbon', country: 'pt' },
	{ id: 4822, name: 'Leiria', country: 'pt' },
	{ id: 4823, name: 'Lagos', country: 'pt' },
	{ id: 4824, name: 'Lamego', country: 'pt' },
	{ id: 4825, name: 'Porto', country: 'pt' },
	{ id: 4826, name: 'Portimão', country: 'pt' },
	{ id: 4827, name: 'Ponta Delgada', country: 'pt' },
	{ id: 4828, name: 'Braga', country: 'pt' },
	{ id: 4829, name: 'Barcelos', country: 'pt' },
	{ id: 4830, name: 'Beja', country: 'pt' },
	{ id: 4831, name: 'Coimbra', country: 'pt' },
	{ id: 4832, name: 'Cascais', country: 'pt' },
	{ id: 4833, name: 'Faro', country: 'pt' },
	{ id: 4834, name: 'Funchal', country: 'pt' },
	{ id: 4835, name: 'Guimarães', country: 'pt' },
	{ id: 4836, name: 'Setúbal', country: 'pt' },
	{ id: 4837, name: 'Sintra', country: 'pt' },
]

const COUNTRIES = [
	{ label: 'Germany', value: 'de' },
	{ label: 'Portugal', value: 'pt' },
]

/** Lisbon and Porto. Preselected so the demo starts on the case the feature exists for. */
const INITIAL_CITY_IDS = [4821, 4825]

/** Long enough to see the pending state, short enough not to feel broken. */
const RESPONSE_DELAY_MS = 400

/**
 * The gate that keeps a one-character search from asking for half the catalogue.
 *
 * It lives **here, in the source**, not in the form package — as does debouncing, which this
 * demo skips only because a 400 ms fake request is already its own throttle.
 */
const MIN_QUERY_LENGTH = 2

type CityOption = { label: string; value: number }

const NO_OPTIONS: readonly CityOption[] = []

const SEARCH_PREFIX = 'search:'
const BY_ID_PREFIX = 'id:'

function toOption(city: City): CityOption {
	return { label: city.name, value: city.id }
}

/**
 * The whole "backend", as one pure function of a request key.
 *
 * Two endpoints, exactly as react-admin's `getList` / `getMany` split them: search returns a
 * page, lookup-by-id returns the rows a client already holds ids for. For a multi-select the
 * second one is asked for **several** ids at once — which is all the difference there is
 * between this source and the single-value one.
 */
function resolveRequest(key: string): readonly CityOption[] {
	if (key.startsWith(BY_ID_PREFIX)) {
		const ids = new Set(key.slice(BY_ID_PREFIX.length).split(','))
		return CITIES.filter((city) => ids.has(String(city.id))).map(toOption)
	}

	const [country = '', text = ''] = key.slice(SEARCH_PREFIX.length).split(':')
	return CITIES.filter((city) => city.country === country && city.name.toLowerCase().includes(text)).map(toOption)
}

/**
 * A hand-written stand-in for the query hook a real app already has (TanStack Query, SWR,
 * RTK Query — the source contract is the same shape in all three). Cached by request key, and
 * `undefined` means "there is nothing to ask for", which is how both hooks stay silent when
 * they should.
 */
function useRequest(key: string | undefined): { options: readonly CityOption[]; loading: boolean } {
	const [loaded, setLoaded] = useState<Record<string, readonly CityOption[]>>({})

	useEffect(() => {
		if (key === undefined || key in loaded) return

		const timer = setTimeout(() => {
			setLoaded((current) => ({ ...current, [key]: resolveRequest(key) }))
		}, RESPONSE_DELAY_MS)

		return () => {
			clearTimeout(timer)
		}
	}, [key, loaded])

	return {
		options: key === undefined ? NO_OPTIONS : (loaded[key] ?? NO_OPTIONS),
		loading: key !== undefined && !(key in loaded),
	}
}

/** What the user typed, narrowed to a page of the catalogue. */
function useCitySearch({ params, query }: { params: Record<string, unknown>; query?: string }) {
	const country = typeof params.country === 'string' ? params.country : ''
	const text = (query ?? '').trim().toLowerCase()
	const key = country === '' || text.length < MIN_QUERY_LENGTH ? undefined : `${SEARCH_PREFIX}${country}:${text}`

	return useRequest(key)
}

/**
 * The second question, and the reason this whole shape exists: the options behind the values
 * already in form state. `values` is the field's **whole selection** here, where a searchable
 * `select` would send a single-element array — the hook is written once and serves both.
 * Without it every chip would read as a bare id.
 */
function useCitiesByValue({ values }: { values: readonly (string | number)[] }) {
	const key = values.length === 0 ? undefined : `${BY_ID_PREFIX}${values.join(',')}`

	return useRequest(key)
}

/** Hoisted to a module constant: a registry rebuilt each render would swap hook identities. */
const optionSources: OptionSourceRegistry = {
	cities: { useOptions: useCitySearch, useSelectedOptions: useCitiesByValue },
}

/**
 * A multi-city picker over a catalogue the form never receives whole.
 *
 * It **starts with Lisbon and Porto already chosen** — that is the point of the demo. Nothing
 * has been typed, so the search has returned nothing at all, and both chips still read as
 * names rather than as `4821` and `4825`, because the source's second hook resolved them.
 *
 * Then: type two or more characters to search (the minimum is the *source's* rule, not the
 * package's), pick a result and watch the query clear itself, drop a chip to remove one city,
 * and change the country to watch the whole selection clear to `[]`.
 */
export function SearchableMultiSelectExample() {
	return (
		<FormOptionSources value={optionSources}>
			<Form defaultValues={{ country: 'pt', cities: INITIAL_CITY_IDS }}>
				{(form) => (
					<>
						<form.SelectField
							name='country'
							label='Country'
							placeholder='Pick a country'
							options={COUNTRIES}
						/>
						<form.Subscribe selector={(state) => state.values.country}>
							{(country) => (
								<form.MultiSelectField
									name='cities'
									label='Cities'
									description='Type at least two letters. The list is a page of results, never the whole catalogue.'
									placeholder='Search cities'
									searchable
									optionsFrom='cities'
									optionsParams={{ country }}
								/>
							)}
						</form.Subscribe>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>
		</FormOptionSources>
	)
}
