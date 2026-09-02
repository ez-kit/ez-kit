'use client'

import { FormOptionSources } from '@ez-kit/form-react'
import { useEffect, useState } from 'react'

import { defineFormSchema, FormFieldType, FormRenderer } from 'shared/form/FormKit'

import type { OptionSourceRegistry } from '@ez-kit/form-react'

/** One row of the catalogue the "backend" owns. */
type City = { id: number; name: string; country: string }

type Trip = {
	country: string
	cities: number[]
}

/**
 * A catalogue the form never receives whole — see `components/searchable-multiselect.tsx`
 * for the full explanation. Kept identical here: the two examples are twins.
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

/** The gate that keeps a one-character search from asking for half the catalogue. */
const MIN_QUERY_LENGTH = 2

type CityOption = { label: string; value: number }

const NO_OPTIONS: readonly CityOption[] = []

const SEARCH_PREFIX = 'search:'
const BY_ID_PREFIX = 'id:'

function toOption(city: City): CityOption {
	return { label: city.name, value: city.id }
}

/**
 * The whole "backend", as one pure function of a request key. For a multi-select the
 * by-id lookup is asked for **several** ids at once.
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
 * already in form state. `values` is the field's **whole selection** here. Without it every
 * chip would read as a bare id.
 */
function useCitiesByValue({ values }: { values: readonly (string | number)[] }) {
	const key = values.length === 0 ? undefined : `${BY_ID_PREFIX}${values.join(',')}`

	return useRequest(key)
}

/** Hoisted to a module constant: a registry rebuilt each render would swap hook identities. */
const optionSources: OptionSourceRegistry = {
	cities: { useOptions: useCitySearch, useSelectedOptions: useCitiesByValue },
}

const schema = defineFormSchema<Trip>()({
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
			type: FormFieldType.MultiSelect,
			name: 'cities',
			label: 'Cities',
			description: 'Type at least two letters. The list is a page of results, never the whole catalogue.',
			placeholder: 'Search cities',
			searchable: true,
			optionsFrom: { source: 'cities', dependsOn: { country: 'country' } },
			defaultValue: INITIAL_CITY_IDS,
		},
		{ type: 'submit', label: 'Save' },
	],
})

/**
 * The document twin of `components/searchable-multiselect.tsx` — the identical multi-city
 * picker over the same catalogue and registry. It **starts with Lisbon and Porto already
 * chosen**, both resolved by name before anything is typed, exactly as the JSX version does.
 */
export function SearchableMultiSelectSchemaExample() {
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
