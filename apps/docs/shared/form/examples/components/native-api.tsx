'use client'

import { Form } from 'shared/form/FormKit'

const SEAT_CHOICES = [1, 2, 3, 4]

export function NativeApiExample() {
	return (
		<Form defaultValues={{ guest: '', seats: 1, notes: '' }}>
			{(form) => (
				<>
					<form.TextField
						name='guest'
						label='Guest name'
					/>

					<form.Field
						name='seats'
						validate={{ min: 1, messages: { min: 'Pick at least one seat' } }}
					>
						{({ value, onChange, errors, invalid, id }) => (
							<div
								id={id}
								className='flex items-center gap-2'
							>
								<span className='text-sm'>Seats</span>
								{SEAT_CHOICES.map((count) => (
									<button
										key={count}
										type='button'
										aria-pressed={value === count}
										onClick={() => {
											onChange(count)
										}}
										className={
											value === count
												? 'rounded-md bg-black px-3 py-1 text-sm text-white dark:bg-white dark:text-black'
												: 'rounded-md border border-black/20 px-3 py-1 text-sm dark:border-white/25'
										}
									>
										{count}
									</button>
								))}
								{invalid && <p role='alert'>{errors.join(', ')}</p>}
							</div>
						)}
					</form.Field>

					<form.NativeField name='notes'>
						{(field) => (
							<textarea
								aria-label='Notes'
								value={field.state.value}
								onChange={(event) => {
									field.handleChange(event.target.value)
								}}
								onBlur={field.handleBlur}
								className='rounded-md border border-black/20 p-2 text-sm dark:border-white/25'
							/>
						)}
					</form.NativeField>

					<form.Subscribe selector={(state) => `${state.values.guest || '—'} · ${String(state.values.seats)} seat(s)`}>
						{(summary) => <p className='text-sm opacity-70'>{summary}</p>}
					</form.Subscribe>
				</>
			)}
		</Form>
	)
}
