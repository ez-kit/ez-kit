'use client'

import { useState } from 'react'

import { Form } from 'shared/form/FormKit'

type Booking = {
	arriveOn: string
	stay: { start: string; end: string }
}

/**
 * The same two date fields as `components/dates.tsx`, written with `<Form>` and the flat
 * fields instead of a document.
 *
 * `min` / `max` bound what the calendar offers, same as on the document side; `required` is
 * the flat spelling of `validate.required` and is only needed on `arriveOn` — `stay` has no
 * required constraint in the document either.
 */
export function DatesJsxExample() {
	const [saved, setSaved] = useState<Booking | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<Form
				defaultValues={{ arriveOn: '2026-08-31', stay: { start: '', end: '' } }}
				onSubmit={({ value }) => {
					setSaved(value)
				}}
			>
				{(form) => (
					<>
						<form.DateField
							name='arriveOn'
							label='Arrival'
							description='Any day in 2026.'
							min='2026-01-01'
							max='2026-12-31'
							required
						/>
						<form.DateRangeField
							name='stay'
							label='Stay'
							description='The value appears once both ends are picked.'
							min='2026-01-01'
							max='2026-12-31'
						/>
						<form.SubmitButton>Book</form.SubmitButton>
					</>
				)}
			</Form>

			{saved ? (
				<pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{JSON.stringify(saved, null, 2)}</pre>
			) : null}
		</div>
	)
}
