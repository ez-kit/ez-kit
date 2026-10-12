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
						{({ value, onChange, onBlur, errors, invalid, id }) => (
							<div className='flex flex-wrap items-center gap-2'>
								<span
									id={`${id}-label`}
									className='text-sm'
								>
									Seats
								</span>
								<div
									role='group'
									aria-labelledby={`${id}-label`}
									aria-describedby={invalid ? `${id}-error` : undefined}
									className='flex items-center gap-2'
								>
									{SEAT_CHOICES.map((count, index) => (
										<button
											key={count}
											id={index === 0 ? id : undefined}
											type='button'
											aria-pressed={value === count}
											onClick={() => {
												onChange(count)
											}}
											onBlur={onBlur}
											className={
												value === count
													? 'rounded-md bg-black px-3 py-1 text-sm text-white dark:bg-white dark:text-black'
													: 'rounded-md border border-black/20 px-3 py-1 text-sm dark:border-white/25'
											}
										>
											{count}
										</button>
									))}
								</div>
								<button
									type='button'
									onClick={() => {
										onChange(0)
									}}
									onBlur={onBlur}
									className='px-2 py-1 text-sm underline opacity-70'
								>
									Clear
								</button>
								{invalid && (
									<p
										id={`${id}-error`}
										role='alert'
										className='w-full text-sm text-red-600 dark:text-red-400'
									>
										{errors.join(', ')}
									</p>
								)}
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
