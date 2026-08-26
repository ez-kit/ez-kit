'use client'

import { Form } from 'shared/form/FormKit'

const SEAT_CHOICES = [1, 2, 3, 4]

export function NativeApiExample() {
	return (
		<Form defaultValues={{ guest: '', seats: 1 }}>
			{(form) => (
				<>
					{/* A flat field: label, input and error all rendered for you. */}
					<form.TextField
						name='guest'
						label='Guest name'
					/>

					{/* The native render-prop Field, for markup the flat fields do not cover.
			    It is the untouched TanStack Form API on the same instance. */}
					<form.Field name='seats'>
						{(field) => (
							<div className='flex items-center gap-2'>
								<span className='text-sm'>Seats</span>
								{SEAT_CHOICES.map((count) => (
									<button
										key={count}
										type='button'
										onClick={() => {
											field.handleChange(count)
										}}
										className={
											field.state.value === count
												? 'rounded-md bg-black px-3 py-1 text-sm text-white dark:bg-white dark:text-black'
												: 'rounded-md border border-black/20 px-3 py-1 text-sm dark:border-white/25'
										}
									>
										{count}
									</button>
								))}
							</div>
						)}
					</form.Field>

					<form.Subscribe selector={(state) => `${state.values.guest || '—'} · ${String(state.values.seats)} seat(s)`}>
						{(summary) => <p className='text-sm opacity-70'>{summary}</p>}
					</form.Subscribe>
				</>
			)}
		</Form>
	)
}
