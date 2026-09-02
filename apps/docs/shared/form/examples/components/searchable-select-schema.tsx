'use client'

import { FormOptionSources } from '@ez-kit/form-react'
import { useEffect, useState } from 'react'

import { defineFormSchema, FormFieldType, FormRenderer } from 'shared/form/FormKit'

import type { OptionSourceRegistry } from '@ez-kit/form-react'

/** One row of the catalogue the "backend" owns. */
type City = { id: number; name: string; country: string }

type Address = {
	country: string
	city: number
}

/**
 * A catalogue that is deliberately too long to ship into the form — see
 * `components/searchable-select.tsx` for the full explanation. Kept identical here: the two
 * examples are twins, and a different catalogue would make them look like different forms.
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

/** The gate that keeps a one-character search from asking for half the catalogue. */
const MIN_QUERY_LENGTH = 2

type CityOption = { label: string; value: number }

const NO_OPTIONS: readonly CityOption[] = []

const SEARCH_PREFIX = 'search:'
const BY_ID_PREFIX = 'id:'

function toOption(city: City): CityOption {
	return { label: city.name, value: city.id }
}

/** The whole "backend", as one pure function of a request key. */
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

const schema = defineFormSchema<Address>()({
	version: 1,
	children: [
		{
			type: FormFieldType.Select,
			name: 'country',
			label: 'Country',
			placeholder: 'Pick a country',
			options: COUNTRIES,
			defaultValue: 'pt',
		},
		{
			type: FormFieldType.Select,
			name: 'city',
			label: 'City',
			description: 'Type at least two letters. The list is a page of results, never the whole catalogue.',
			placeholder: 'Search cities',
			searchable: true,
			optionsFrom: { source: 'cities', dependsOn: { country: 'country' } },
			defaultValue: INITIAL_CITY_ID,
		},
		{ type: 'submit', label: 'Save' },
	],
})

/**
 * The document twin of `components/searchable-select.tsx` — the identical city search, the
 * same registry, the same catalogue never sent to the form whole. It **starts with Lisbon
 * already chosen**, resolved by the source's `useSelectedOptions` before anything is typed,
 * exactly as the JSX version does.
 *
 * `searchable` and `optionsFrom` are ordinary keys on the document's `select` node
 * (`SelectMember` in `packages/form/core/src/schema.ts`) — there is no callout needed here,
 * unlike `loading` on the async-options example.
 */
export function SearchableSelectSchemaExample() {
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<FormOptionSources value={optionSources}>
			<div className='flex flex-col gap-4'>
				<FormRenderer
					schema={schema}
					onSubmit={({ value }) => {
						setSaved(JSON.stringify(value, null, 2))
					}}
				/>

				{saved === null ? null : <pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{saved}</pre>}
			</div>
		</FormOptionSources>
	)
}
