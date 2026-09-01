'use client'

import { FormOptionSources } from '@ez-kit/form-react'
import { useEffect, useState } from 'react'

import { Form } from 'shared/form/FormKit'

import type { OptionSourceRegistry } from '@ez-kit/form-react'

/** Stands in for the backend's dictionary endpoint. */
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
 * One generic source, serving both lists.
 *
 * Declared as a named `use…` function rather than inline in the registry: a source **is** a
 * hook, and both React and `react-hooks/rules-of-hooks` go by the name. It also calls a fixed
 * set of hooks — what varies with the parameters is the key handed to one `useDictionary`
 * call, never which hook is called.
 */
function useDictionarySource({ params }: { params: Record<string, unknown> }): {
	options: readonly { label: string; value: string }[]
	loading: boolean
} {
	const domain = typeof params.domain === 'string' ? params.domain : undefined
	const country = typeof params.country === 'string' && params.country !== '' ? params.country : undefined
	// `cities` is scoped by country, `countries` is not — one key, computed from the
	// parameters. `undefined` means "there is nothing to ask for yet", which is what keeps the
	// city list from showing a skeleton before a country has been picked.
	const key = domain === undefined ? undefined : domain === CITIES_DOMAIN ? cityKey(country) : domain

	return useDictionary(key)
}

/** Hoisted to a module constant: a registry rebuilt each render would swap hook identities. */
const optionSources: OptionSourceRegistry = { dictionary: useDictionarySource }

/**
 * A country → city cascade whose lists are named by the document, not written into it.
 *
 * `optionsFrom` names a source the app registered on `<FormOptionSources>`; `optionsParams`
 * carries the live country straight into it. (In a JSON document the same field spells this
 * `"optionsFrom": { "source": "dictionary", "params": { "domain": "cities" },
 * "dependsOn": { "country": "country" } }` — JSON cannot hold a live value, so it names the
 * path to read instead. Both produce the identical parameter object.)
 *
 * Change the country after picking a city: the city is cleared immediately, rather than
 * lingering behind an empty-looking trigger and being submitted against the wrong country.
 */
export function OptionSourcesExample() {
	return (
		<FormOptionSources value={optionSources}>
			<Form defaultValues={{ country: '', city: '' }}>
				{(form) => (
					<>
						<form.SelectField
							name='country'
							label='Country'
							placeholder='Pick a country'
							optionsFrom='dictionary'
							optionsParams={{ domain: 'countries' }}
						/>
						<form.Subscribe selector={(state) => state.values.country}>
							{(country) => (
								<form.SelectField
									name='city'
									label='City'
									description='Reloads when the country changes — and the old city is cleared.'
									placeholder='Pick a city'
									disabled={country === ''}
									optionsFrom='dictionary'
									// A fresh object every render, on purpose: the parameters are compared
									// by value, so re-creating this literal clears nothing by itself.
									optionsParams={{ domain: 'cities', country }}
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
