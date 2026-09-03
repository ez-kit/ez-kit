'use client'

import { FormOptionSources } from '@ez-kit/form-react'
import { useEffect, useState } from 'react'

import { defineFormSchema, FormFieldType, FormRenderer } from 'shared/form/FormKit'

import type { OptionSourceRegistry } from '@ez-kit/form-react'

type Address = {
	country: string
	city: string
}

/** Stands in for the backend's dictionary endpoint. Identical to the JSX example's. */
const DICTIONARY: Record<string, readonly { label: string; value: string }[]> = {
	countries: [
		{ label: 'Germany', value: 'de' },
		{ label: 'Portugal', value: 'pt' },
	],
	'cities:de': [
		{ label: 'Berlin', value: 'ber' },
		{ label: 'Hamburg', value: 'ham' },
		{ label: 'Munich', value: 'muc' },
	],
	'cities:pt': [
		{ label: 'Lisbon', value: 'lis' },
		{ label: 'Porto', value: 'opo' },
	],
}

/** Long enough to actually see the skeleton, short enough not to feel broken. */
const FETCH_DELAY_MS = 900

const NO_OPTIONS: readonly { label: string; value: string }[] = []

const CITIES_DOMAIN = 'cities'

/** `undefined` until a country is chosen — there is no city list to ask for before then. */
function cityKey(country: string | undefined): string | undefined {
	return country === undefined ? undefined : `${CITIES_DOMAIN}:${country}`
}

/**
 * A hand-written stand-in for the query hook a real app already has (TanStack Query, SWR,
 * RTK Query — the source contract is the same shape in all three). The docs deliberately add
 * no network and no query library just to show a cascade.
 */
function useDictionary(key: string | undefined): {
	options: readonly { label: string; value: string }[]
	loading: boolean
} {
	const [loaded, setLoaded] = useState<Record<string, readonly { label: string; value: string }[]>>({})

	useEffect(() => {
		if (key === undefined || key in loaded) return

		const timer = setTimeout(() => {
			setLoaded((current) => ({ ...current, [key]: DICTIONARY[key] ?? NO_OPTIONS }))
		}, FETCH_DELAY_MS)

		return () => {
			clearTimeout(timer)
		}
	}, [key, loaded])

	return {
		options: key === undefined ? NO_OPTIONS : (loaded[key] ?? NO_OPTIONS),
		loading: key !== undefined && !(key in loaded),
	}
}

/**
 * One generic source, serving both lists — see `components/option-sources.tsx` for the full
 * explanation. The document below names this same source as `"dictionary"`.
 */
function useDictionarySource({ params }: { params: Record<string, unknown> }): {
	options: readonly { label: string; value: string }[]
	loading: boolean
} {
	const domain = typeof params.domain === 'string' ? params.domain : undefined
	const country = typeof params.country === 'string' && params.country !== '' ? params.country : undefined
	const key = domain === undefined ? undefined : domain === CITIES_DOMAIN ? cityKey(country) : domain

	return useDictionary(key)
}

/** Hoisted to a module constant: a registry rebuilt each render would swap hook identities. */
const optionSources: OptionSourceRegistry = { dictionary: useDictionarySource }

const schema = defineFormSchema<Address>()({
	version: 1,
	children: [
		{
			type: FormFieldType.Select,
			name: 'country',
			label: 'Country',
			placeholder: 'Pick a country',
			optionsFrom: { source: 'dictionary', params: { domain: 'countries' } },
			defaultValue: '',
		},
		{
			type: FormFieldType.Select,
			name: 'city',
			label: 'City',
			description: 'Reloads when the country changes — and the old city is cleared.',
			placeholder: 'Pick a city',
			// `dependsOn` is keyed by the source's parameter name, not by the field it reads —
			// see `OptionsSource` in `packages/form/core/src/options-source.ts`. There is no live
			// value to pass here, unlike the JSX `optionsParams={{ domain: 'cities', country }}`:
			// a document cannot hold one, so it names the path to read instead.
			optionsFrom: { source: 'dictionary', params: { domain: 'cities' }, dependsOn: { country: 'country' } },
			defaultValue: '',
		},
		{ type: 'submit', label: 'Save' },
	],
})

/**
 * The document twin of `components/option-sources.tsx` — the identical country → city
 * cascade, driven by the same `optionSources` registry, but named from a schema instead of
 * read live from `form.Subscribe`.
 */
export function OptionSourcesSchemaExample() {
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
