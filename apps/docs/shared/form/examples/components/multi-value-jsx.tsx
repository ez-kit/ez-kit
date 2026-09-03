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
 * The `validate` prop takes the same object the document's field node does, so the "pick up to
 * two" limit is the identical `{ required: true, maxLength: 2 }` on both sides — and
 * `validate.required` draws the asterisk, so the bare `required` prop is not needed alongside
 * it. `maxLength` counts items here rather than characters.
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
							validate={{ required: true, maxLength: 2 }}
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
