import { FormFieldType } from '@ez-kit/form-core'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { FormOptionSources } from './options/source-context'
import { testComponents } from './test-kit'

import type { OptionSource, OptionSourceRegistry } from './options/source-types'
import type { FormSchema } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * Named option sources, from both authoring paths.
 *
 * The package owns no fetching, no cache and no abort logic, so nothing here tests any: a
 * source is a hook the app wrote. What *is* ours is the plumbing around it — the parameter
 * object both paths must produce identically, the `loading` pass-through, and the clearing of
 * a dependent field when its parameters change (and, just as load-bearing, the two cases where
 * it must *not* clear).
 */

type Values = { country: string; city: string; tags: string[] }

const DEFAULTS: Values = { country: '', city: '', tags: [] }

const CITIES: Record<string, readonly { label: string; value: string }[]> = {
	de: [
		{ label: 'Berlin', value: 'ber' },
		{ label: 'Munich', value: 'muc' },
	],
	ru: [{ label: 'Moscow', value: 'msk' }],
}

const COUNTRIES = [
	{ label: 'Germany', value: 'de' },
	{ label: 'Russia', value: 'ru' },
]

const { useForm, Form, FormRenderer } = createForm({ components: testComponents })

/** Renders `children` under a stable registry — sources are hooks, so identity must not churn. */
function withSources(sources: OptionSourceRegistry, children: ReactNode): ReactNode {
	return <FormOptionSources value={sources}>{children}</FormOptionSources>
}

/** Records every parameter object it is handed, and answers from the local city table. */
function recordingCitySource(seen: Record<string, unknown>[]): OptionSource {
	return ({ params }) => {
		seen.push(params)
		const country = typeof params.country === 'string' ? params.country : ''
		return { options: CITIES[country] ?? [], loading: false }
	}
}

const CITY_SELECT = 'city'
const COUNTRY_SELECT = 'country'

function selectFor(name: string): HTMLSelectElement {
	const element = document.querySelector(`select[name="${name}"]`)
	if (!(element instanceof HTMLSelectElement)) throw new Error(`No select named "${name}"`)
	return element
}

describe('option sources', () => {
	it('hands the JSX path its `optionsParams` verbatim', () => {
		const seen: Record<string, unknown>[] = []

		function Case() {
			const form = useForm({ defaultValues: DEFAULTS })
			return (
				<Form form={form}>
					<form.SelectField
						name='city'
						label='City'
						optionsFrom='cities'
						optionsParams={{ country: 'de', domain: 'cities' }}
					/>
				</Form>
			)
		}

		render(withSources({ cities: recordingCitySource(seen) }, <Case />))

		expect(seen.at(-1)).toEqual({ country: 'de', domain: 'cities' })
		expect(screen.getByText('Berlin')).toBeInTheDocument()
	})

	it('produces the identical params object from a schema `dependsOn` + `params`', () => {
		const seen: Record<string, unknown>[] = []
		const schema: FormSchema<Values> = {
			version: 1,
			children: [
				{
					type: FormFieldType.Select,
					name: 'city',
					label: 'City',
					optionsFrom: { source: 'cities', params: { domain: 'cities' }, dependsOn: { country: 'country' } },
				},
			],
		}

		render(
			withSources(
				{ cities: recordingCitySource(seen) },
				<FormRenderer
					schema={schema}
					defaultValues={{ ...DEFAULTS, country: 'de' }}
				/>,
			),
		)

		// Byte-for-byte the shape the JSX call site above produced — that correspondence is
		// exactly why `dependsOn` is keyed by the parameter name, not by the path it reads.
		expect(seen.at(-1)).toEqual({ country: 'de', domain: 'cities' })
		expect(screen.getByText('Berlin')).toBeInTheDocument()
	})

	it("passes the source's `loading` straight through to the kit", () => {
		const pending: OptionSource = () => ({ options: [], loading: true })

		function Case() {
			const form = useForm({ defaultValues: DEFAULTS })
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

		render(withSources({ cities: pending }, <Case />))

		expect(selectFor(CITY_SELECT)).toHaveAttribute('data-loading')
		expect(selectFor(CITY_SELECT)).toBeDisabled()
	})

	it('resolves a source label that is a translation key', () => {
		const localized: OptionSource = () => ({
			options: [{ label: { key: 'city.berlin' }, value: 'ber' }],
			loading: false,
		})
		const schema: FormSchema<Values> = {
			version: 1,
			children: [{ type: FormFieldType.Select, name: 'city', label: 'City', optionsFrom: 'cities' }],
		}

		render(
			withSources(
				{ cities: localized },
				<FormRenderer
					schema={schema}
					defaultValues={DEFAULTS}
					translate={(key) => (key === 'city.berlin' ? 'Berlin (translated)' : key)}
				/>,
			),
		)

		expect(screen.getByText('Berlin (translated)')).toBeInTheDocument()
	})

	it('throws, naming the source, when it is not registered', () => {
		const onError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		function Case() {
			const form = useForm({ defaultValues: DEFAULTS })
			return (
				<Form form={form}>
					<form.SelectField
						name='city'
						label='City'
						optionsFrom='citiez'
					/>
				</Form>
			)
		}

		expect(() => {
			render(withSources({ cities: recordingCitySource([]) }, <Case />))
		}).toThrow('No option source is registered under "citiez"')

		onError.mockRestore()
	})

	it('throws when a field is given both `options` and `optionsFrom`', () => {
		const onError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		function Case() {
			const form = useForm({ defaultValues: DEFAULTS })
			return (
				<Form form={form}>
					<form.SelectField
						name='city'
						label='City'
						options={[{ label: 'Moscow', value: 'msk' }]}
						optionsFrom='cities'
					/>
				</Form>
			)
		}

		expect(() => {
			render(withSources({ cities: recordingCitySource([]) }, <Case />))
		}).toThrow('they are mutually exclusive')

		onError.mockRestore()
	})

	it('throws when a field is given neither', () => {
		const onError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		function Case() {
			const form = useForm({ defaultValues: DEFAULTS })
			return (
				<Form form={form}>
					{/* Neither prop: legal to the compiler (see `OptionsProps`), a render-time error. */}
					<form.SelectField
						name='city'
						label='City'
					/>
				</Form>
			)
		}

		expect(() => {
			render(withSources({}, <Case />))
		}).toThrow('needs either an `options` list or an `optionsFrom` source name')

		onError.mockRestore()
	})

	describe('clearing the dependent value', () => {
		function CascadeCase({ sources }: { sources: OptionSourceRegistry }): ReactNode {
			const schema: FormSchema<Values> = {
				version: 1,
				children: [
					{ type: FormFieldType.Select, name: 'country', label: 'Country', options: COUNTRIES },
					{
						type: FormFieldType.Select,
						name: 'city',
						label: 'City',
						// A placeholder so the stand-in kit's native `<select>` has an empty option to
						// fall back to — without one the browser snaps to the first entry and "cleared"
						// would be indistinguishable from "picked the first city".
						placeholder: 'Pick a city',
						optionsFrom: { source: 'cities', dependsOn: { country: 'country' } },
					},
				],
			}

			return withSources(
				sources,
				<FormRenderer
					schema={schema}
					defaultValues={{ ...DEFAULTS, country: 'ru', city: 'msk' }}
				/>,
			)
		}

		it('leaves a loaded draft alone on mount', () => {
			render(<CascadeCase sources={{ cities: recordingCitySource([]) }} />)

			// The first computation is skipped on purpose: a value restored from the server must
			// survive the mount that first resolves its options.
			expect(selectFor(CITY_SELECT)).toHaveValue('msk')
		})

		it('clears the value the moment the params change', async () => {
			const user = userEvent.setup()
			render(<CascadeCase sources={{ cities: recordingCitySource([]) }} />)

			expect(selectFor(CITY_SELECT)).toHaveValue('msk')
			await user.selectOptions(selectFor(COUNTRY_SELECT), 'de')

			// Not "once the new list arrives", and not "only if `msk` is missing from it" — the
			// stale value goes immediately, or `{ country: 'de', city: 'msk' }` gets submitted.
			await waitFor(() => {
				expect(selectFor(CITY_SELECT)).toHaveValue('')
			})
		})

		it('does not clear when an inline params literal is re-created with equal contents', async () => {
			const seen: Record<string, unknown>[] = []
			let bump = (): void => undefined

			function InlineParamsCase() {
				const form = useForm({ defaultValues: { ...DEFAULTS, city: 'msk' } })
				const [, setTick] = useState(0)
				bump = () => {
					setTick((tick) => tick + 1)
				}

				return (
					<Form form={form}>
						<form.SelectField
							name='city'
							label='City'
							optionsFrom='cities'
							// A brand-new object on every render, with identical contents.
							optionsParams={{ country: 'ru' }}
						/>
					</Form>
				)
			}

			render(withSources({ cities: recordingCitySource(seen) }, <InlineParamsCase />))
			expect(selectFor(CITY_SELECT)).toHaveValue('msk')

			await act(async () => {
				bump()
				await Promise.resolve()
			})

			expect(selectFor(CITY_SELECT)).toHaveValue('msk')
			// The object handed to the source is stable too, so a query key built from it does
			// not churn on an unrelated re-render.
			expect(seen.at(-1)).toBe(seen[0])
		})
	})
})
