'use client'

import { useState } from 'react'

import { defineFormItem, defineFormSchema, FormFieldType, FormRenderer } from 'shared/form/FormKit'

import type { NamedRule, RuleIssue } from 'shared/form/FormKit'

type Attendee = { name: string; email: string; kind: string; company: string }
type Booking = { eventName: string; attendees: Attendee[]; waitlist: Attendee[] }

const KINDS = [
	{ label: 'Individual', value: 'individual' },
	{ label: 'Company', value: 'company' },
]

const MAX_ATTENDEES = 4

/**
 * One entry's field set, authored against `Attendee` instead of inline.
 *
 * The names in it are item-relative, which is what lets the identical block serve both
 * `attendees` and `waitlist` — and what confines it to an array item: a `section` of the form
 * proper rejects it, because there is no entry for `'./kind'` to resolve against.
 */
const attendeeFields = defineFormItem<Attendee>()([
	{ type: FormFieldType.Text, name: 'name', label: 'Name', defaultValue: '', validate: { required: true } },
	{
		type: FormFieldType.Text,
		name: 'email',
		label: 'Email',
		defaultValue: '',
		validate: { required: true, format: 'email' },
	},
	{ type: FormFieldType.Select, name: 'kind', label: 'Kind', options: KINDS, defaultValue: 'individual' },
	// `./kind` is this entry's `kind`, not the form's — the one relative spelling conditions have.
	{
		type: FormFieldType.Text,
		name: 'company',
		label: 'Company',
		defaultValue: '',
		when: { field: './kind', eq: 'company' },
	},
])

const DEFAULTS: Booking = {
	eventName: 'Kickoff',
	attendees: [{ name: 'Ada', email: 'ada@example.com', kind: 'individual', company: '' }],
	waitlist: [],
}

const schema = defineFormSchema<Booking>()({
	version: 1,
	children: [
		{ type: FormFieldType.Text, name: 'eventName', label: 'Event', defaultValue: 'Kickoff' },
		{
			type: 'array',
			name: 'attendees',
			label: 'Attendees',
			description: 'At least one, at most four, no two sharing an email.',
			reorderable: true,
			validate: { minLength: 1, maxLength: MAX_ATTENDEES, rule: 'unique-emails' },
			item: { label: 'Attendee' },
			add: { label: 'Add attendee' },
			remove: { label: 'Remove' },
			children: attendeeFields,
		},
		{
			type: 'array',
			name: 'waitlist',
			label: 'Waitlist',
			item: { label: 'On the list' },
			add: { label: 'Add to waitlist' },
			remove: { label: 'Remove' },
			children: attendeeFields,
		},
		{ type: 'submit', label: 'Book' },
	],
})

/**
 * A cross-item check: the rule receives the **whole array** as its value, so it can compare
 * entries — and returns issues that name their own place, relative to the node it is attached
 * to. `[1].email` puts the message on the second entry's email box rather than on the list.
 */
const uniqueEmails: NamedRule = (value) => {
	if (!Array.isArray(value)) return true

	const seen = new Map<string, number>()
	const issues: RuleIssue[] = []

	value.forEach((entry, index) => {
		const email = (entry as Attendee).email.trim().toLowerCase()
		if (email === '') return

		const firstIndex = seen.get(email)
		if (firstIndex === undefined) {
			seen.set(email, index)
			return
		}
		issues.push({ path: `[${String(index)}].email`, message: `Already used by attendee ${String(firstIndex + 1)}` })
	})

	return issues.length > 0 ? issues : true
}

export function ArraysSchemaExample() {
	const [saved, setSaved] = useState<Booking | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<FormRenderer
				schema={schema}
				// The value type comes from `defaultValues`: a document's own `TValues` sits too deep
				// inside `FormNode` for TypeScript to infer it back out of `schema` alone.
				defaultValues={DEFAULTS}
				rules={{ 'unique-emails': uniqueEmails }}
				onSubmit={({ value }) => {
					setSaved(value)
				}}
			/>

			{saved ? (
				<pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{JSON.stringify(saved, null, 2)}</pre>
			) : null}
		</div>
	)
}
