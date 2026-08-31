'use client'

import { useState } from 'react'

import { defineFormSchema, FormFieldType, FormRenderer } from 'shared/form/FormKit'

type Booking = {
	arriveOn: string
	stay: { start: string; end: string }
}

/**
 * Both date fields, described as data.
 *
 * Every date here is a `YYYY-MM-DD` string — the picker's own representation
 * (`CalendarDate` for HeroUI, `Date` for shadcn's react-day-picker) never leaves the kit, so
 * this document is as deliverable over the wire as any other. Submit and read the payload:
 * a single date is one string, a range is one `{ start, end }` object under one `name`.
 *
 * `min` bounds what the calendar offers; `validate.required` is what actually rejects an
 * empty field. The two are deliberately separate — see the docs on `date`.
 */
const schema = defineFormSchema<Booking>()({
	version: 1,
	children: [
		{
			type: 'section',
			title: 'Booking',
			columns: 2,
			children: [
				{
					type: FormFieldType.Date,
					name: 'arriveOn',
					label: 'Arrival',
					description: 'Any day in 2026.',
					min: '2026-01-01',
					max: '2026-12-31',
					defaultValue: '2026-08-31',
					validate: { required: true },
				},
				{
					type: FormFieldType.DateRange,
					name: 'stay',
					label: 'Stay',
					description: 'The value appears once both ends are picked.',
					min: '2026-01-01',
					max: '2026-12-31',
				},
			],
		},
		{ type: 'submit', label: 'Book' },
	],
})

export function DatesExample() {
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
