'use client'

import { useState } from 'react'

import { Form } from 'shared/form/FormKit'

type Order = {
	countryId: number
	tagIds: number[]
	note: string
}

const COUNTRIES = [
	{ value: 49, label: 'Germany' },
	{ value: 33, label: 'France' },
	{ value: 39, label: 'Italy' },
]

const TAGS = [
	{ value: 1, label: 'Design' },
	{ value: 2, label: 'Engineering' },
	{ value: 3, label: 'Research' },
]

/**
 * The JSX half of `components/numeric-options.tsx` — the same form, the same numeric option
 * values, built from flat fields instead of a document.
 *
 * `name` is checked against the option values here exactly as it is in the schema version:
 * `countryId` is a `number`, so `form.SelectField` picks the `SelectFieldPropsFor<TFormData,
 * number>` overload and `options` must carry numbers, and `tagIds: number[]` does the same for
 * `form.MultiSelectField`. Submit and look at the payload below — `countryId` and `tagIds`
 * come back as numbers (`49`, not `'49'`), because the binding layer maps the string a kit
 * reports back to the option it came from rather than coercing it. That mapping is exactly
 * what this example exists to demonstrate, and it is identical whether the option list arrived
 * as a document or as a literal passed to `options`.
 */
export function NumericOptionsJsxExample() {
	const [saved, setSaved] = useState<Order | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<Form
				defaultValues={{ countryId: 49, tagIds: [1], note: '' }}
				onSubmit={({ value }) => {
					setSaved(value)
				}}
			>
				{(form) => (
					<>
						<form.SelectField
							name='countryId'
							label='Country'
							placeholder='Pick a country'
							options={COUNTRIES}
						/>
						<form.MultiSelectField
							name='tagIds'
							label='Tags'
							placeholder='Choose tags'
							options={TAGS}
						/>
						<form.TextField
							name='note'
							label='Note'
							placeholder='Anything to add?'
						/>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>

			{saved ? (
				<pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{JSON.stringify(saved, null, 2)}</pre>
			) : null}
		</div>
	)
}
