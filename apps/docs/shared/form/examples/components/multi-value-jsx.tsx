'use client'

import { useState } from 'react'

import { Form } from 'shared/form/FormKit'

type Profile = {
	tags: string[]
	interests: string[]
}

const TAGS = [
	{ value: 'design', label: 'Design' },
	{ value: 'engineering', label: 'Engineering' },
	{ value: 'research', label: 'Research' },
	{ value: 'support', label: 'Support' },
]

const INTERESTS = [
	{ value: 'code', label: 'Code' },
	{ value: 'writing', label: 'Writing' },
	{ value: 'speaking', label: 'Speaking', disabled: true },
]

/**
 * The same two multi-value fields as `components/multi-value.tsx`, written with `<Form>` and
 * the flat fields instead of a document.
 *
 * `required` is the flat spelling of the document's `validate.required` — there is no flat
 * equivalent of `validate.maxLength`, so the "pick up to two" limit on `tags` is not enforced
 * here. See the report for this example.
 */
export function MultiValueJsxExample() {
	const [saved, setSaved] = useState<Profile | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<Form
				defaultValues={{ tags: [] as string[], interests: ['code'] }}
				onSubmit={({ value }) => {
					setSaved(value)
				}}
			>
				{(form) => (
					<>
						<form.MultiSelectField
							name='tags'
							label='Tags'
							description='Pick up to two.'
							placeholder='Choose tags'
							options={TAGS}
							required
						/>
						<form.CheckboxGroupField
							name='interests'
							label='Interests'
							description='Every choice on screen at once.'
							options={INTERESTS}
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
