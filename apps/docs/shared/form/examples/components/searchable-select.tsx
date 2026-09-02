'use client'

import { FormOptionSources } from '@ez-kit/form-react'
import { useEffect, useState } from 'react'

import { Form } from 'shared/form/FormKit'

import type { OptionSourceRegistry } from '@ez-kit/form-react'

/** One row of the catalogue the "backend" owns. */
type City = { id: number; name: string; country: string }

/**
 * A catalogue that is deliberately too long to ship into the form.
 *
 * Sixty rows is not a real dictionary, but it is already more than a `<select>` should hold —
 * and, more to the point, the source below never returns all of it at once. That is the whole
 * premise of the feature: form state holds `city: 4821` while the current results are whatever
 * matched the last three characters typed, so the option carrying 4821 is usually absent.
 */
const CITIES: readonly City[] = [
	{ id: 1001, name: 'Berlin', country: 'de' },
	{ id: 1002, name: 'Bergisch Gladbach', country: 'de' },
	{ id: 1003, name: 'Bremen', country: 'de' },
	{ id: 1004, name: 'Bremerhaven', country: 'de' },
	{ id: 1005, name: 'Bonn', country: 'de' },
	{ id: 1006, name: 'Bochum', country: 'de' },
	{ id: 1007, name: 'Bielefeld', country: 'de' },
	{ id: 1008, name: 'Braunschweig', country: 'de' },
	{ id: 1009, name: 'Bamberg', country: 'de' },
	{ id: 1010, name: 'Bayreuth', country: 'de' },
	{ id: 1011, name: 'Hamburg', country: 'de' },
	{ id: 1012, name: 'Hannover', country: 'de' },
	{ id: 1013, name: 'Heidelberg', country: 'de' },
	{ id: 1014, name: 'Heilbronn', country: 'de' },
	{ id: 1015, name: 'Halle', country: 'de' },
	{ id: 1016, name: 'Hagen', country: 'de' },
	{ id: 1017, name: 'Munich', country: 'de' },
	{ id: 1018, name: 'Mainz', country: 'de' },
	{ id: 1019, name: 'Mannheim', country: 'de' },
	{ id: 1020, name: 'Magdeburg', country: 'de' },
	{ id: 1021, name: 'Münster', country: 'de' },
	{ id: 1022, name: 'Mönchengladbach', country: 'de' },
	{ id: 1023, name: 'Cologne', country: 'de' },
	{ id: 1024, name: 'Chemnitz', country: 'de' },
	{ id: 1025, name: 'Dresden', country: 'de' },
	{ id: 1026, name: 'Dortmund', country: 'de' },
	{ id: 1027, name: 'Düsseldorf', country: 'de' },
	{ id: 1028, name: 'Duisburg', country: 'de' },
	{ id: 1029, name: 'Darmstadt', country: 'de' },
	{ id: 1030, name: 'Erfurt', country: 'de' },
	{ id: 1031, name: 'Essen', country: 'de' },
	{ id: 1032, name: 'Frankfurt', country: 'de' },
	{ id: 1033, name: 'Freiburg', country: 'de' },
	{ id: 1034, name: 'Stuttgart', country: 'de' },
	{ id: 1035, name: 'Leipzig', country: 'de' },
	{ id: 1036, name: 'Nuremberg', country: 'de' },
	{ id: 1037, name: 'Wiesbaden', country: 'de' },
	{ id: 1038, name: 'Wuppertal', country: 'de' },
	{ id: 1039, name: 'Karlsruhe', country: 'de' },
	{ id: 1040, name: 'Kiel', country: 'de' },
	{ id: 4821, name: 'Lisbon', country: 'pt' },
	{ id: 4822, name: 'Leiria', country: 'pt' },
	{ id: 4823, name: 'Lagos', country: 'pt' },
	{ id: 4824, name: 'Lamego', country: 'pt' },
	{ id: 4825, name: 'Porto', country: 'pt' },
	{ id: 4826, name: 'Portimão', country: 'pt' },
	{ id: 4827, name: 'Ponta Delgada', country: 'pt' },
	{ id: 4828, name: 'Póvoa de Varzim', country: 'pt' },
	{ id: 4829, name: 'Braga', country: 'pt' },
	{ id: 4830, name: 'Bragança', country: 'pt' },
	{ id: 4831, name: 'Barcelos', country: 'pt' },
	{ id: 4832, name: 'Beja', country: 'pt' },
	{ id: 4833, name: 'Coimbra', country: 'pt' },
	{ id: 4834, name: 'Cascais', country: 'pt' },
	{ id: 4835, name: 'Chaves', country: 'pt' },
	{ id: 4836, name: 'Faro', country: 'pt' },
	{ id: 4837, name: 'Funchal', country: 'pt' },
	{ id: 4838, name: 'Guimarães', country: 'pt' },
	{ id: 4839, name: 'Setúbal', country: 'pt' },
	{ id: 4840, name: 'Sintra', country: 'pt' },
]

const COUNTRIES = [
	{ label: 'Germany', value: 'de' },
	{ label: 'Portugal', value: 'pt' },
]

/** Lisbon. Preselected so the demo starts on the case the feature exists for. */
const INITIAL_CITY_ID = 4821

/** Long enough to see the pending state, short enough not to feel broken. */
const RESPONSE_DELAY_MS = 400

/**
 * The gate that keeps a one-character search from asking for half the catalogue.
 *
 * It lives **here, in the source**, not in the form package — as does debouncing, which this
 * demo skips only because a 400 ms fake request is already its own throttle. A real source
 * would wrap `query` in a `useDebouncedValue` before building the key below.
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
 * page, lookup-by-id returns the rows a client already holds ids for. Keeping them behind one
 * key is what lets a single cache below serve both.
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
 * RTK Query — the source contract is the same shape in all three). Cached by request key, so
 * re-typing a query the user already ran answers instantly, and `undefined` means "there is
 * nothing to ask for", which is how both hooks stay silent when they should.
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
 * The second question, and the reason this whole shape exists: the option behind the value
 * already in form state. Without it the trigger opposite a stored `4821` would be blank until
 * the user happened to search for "Lisbon" themselves.
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
 * A city search over a catalogue the form never receives whole.
 *
 * It **starts with Lisbon already chosen** — that is the point of the demo. Nothing has been
 * typed, so the search has returned nothing at all, and the field still shows "Lisbon" rather
 * than `4821` or an empty box, because the source's second hook resolved that one value.
 *
 * Then: type two or more characters to search (the minimum is the *source's* rule, not the
 * package's), and change the country to watch the city clear — the same `optionsFrom`
 * behaviour a non-searchable dependent field has.
 */
export function SearchableSelectExample() {
	return (
		<FormOptionSources value={optionSources}>
			<Form defaultValues={{ country: 'pt', city: INITIAL_CITY_ID }}>
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
								<form.SelectField
									name='city'
									label='City'
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
