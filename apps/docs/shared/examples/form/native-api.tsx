'use client'

import { useForm } from '@ez-kit/form-shadcn'

export default function NativeApiExample() {
	const form = useForm({
		defaultValues: { guest: '', seats: 1 },
	})

	return (
		<form.Form>
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
						{[1, 2, 3, 4].map((count) => (
							<button
								key={count}
								type='button'
								onClick={() => {
									field.handleChange(count)
								}}
								className={
									field.state.value === count
										? 'rounded-md bg-fd-primary px-3 py-1 text-sm text-fd-primary-foreground'
										: 'rounded-md border border-fd-border px-3 py-1 text-sm'
								}
							>
								{count}
							</button>
						))}
					</div>
				)}
			</form.Field>

			<form.Subscribe selector={(state) => `${state.values.guest || '—'} · ${String(state.values.seats)} seat(s)`}>
				{(summary) => <p className='text-sm text-fd-muted-foreground'>{summary}</p>}
			</form.Subscribe>
		</form.Form>
	)
}
