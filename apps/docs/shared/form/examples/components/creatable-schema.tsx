'use client'

import { useState } from 'react'

import { defineFormSchema, FormFieldType, FormRenderer } from 'shared/form/FormKit'

type Issue = {
	primary: string
	tags: string[]
}

/**
 * A tag vocabulary that is a *suggestion*, not a constraint — the same list
 * `components/creatable.tsx` uses, written directly into the document.
 */
const TAGS = [
	{ label: 'Bug', value: 'bug' },
	{ label: 'Chore', value: 'chore' },
	{ label: 'Documentation', value: 'docs' },
	{ label: 'Performance', value: 'perf' },
	{ label: 'Refactor', value: 'refactor' },
	{ label: 'Regression', value: 'regression' },
]

/**
 * `creatable`: the list suggests, the user decides.
 *
 * `creatable` is only legal on a **string**-valued select or multiselect —
 * `CreatableProvision<TValue>` in `packages/form/core/src/schema.ts` narrows to
 * `{ creatable?: false }` for a numeric one, and `parseFormSchema` rejects the same thing in
 * a JSON document. It also requires `searchable`, exactly as the JSX API does: creating means
 * typing, and `searchable` is what gives the field a text input at all.
 */
const schema = defineFormSchema<Issue>()({
	version: 1,
	children: [
		{
			type: FormFieldType.Select,
			name: 'primary',
			label: 'Primary tag',
			description: 'Search the list, or type a tag of your own and pick the "Add …" row.',
			placeholder: 'Search tags',
			searchable: true,
			creatable: true,
			options: TAGS,
			defaultValue: 'bug',
		},
		{
			type: FormFieldType.MultiSelect,
			name: 'tags',
			label: 'All tags',
			description: 'The same on a multi-value field: created tags become chips labelled by their own text.',
			placeholder: 'Search tags',
			searchable: true,
			creatable: true,
			createLabel: 'Add this as a new tag',
			options: TAGS,
			defaultValue: ['docs'],
		},
		{ type: 'submit', label: 'Save' },
	],
})

/**
 * The document twin of `components/creatable.tsx` — the same tag vocabulary, the same
 * `creatable` behaviour on both a single- and a multi-value field. Type something the list
 * does not contain and pick the offered row: the value is a plain string that was never on
 * any list, and the chip labels itself with the text that was typed.
 */
export function CreatableSchemaExample() {
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<FormRenderer
				schema={schema}
				onSubmit={({ value }) => {
					setSaved(JSON.stringify(value, null, 2))
				}}
			/>

			{saved === null ? null : <pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{saved}</pre>}
		</div>
	)
}
