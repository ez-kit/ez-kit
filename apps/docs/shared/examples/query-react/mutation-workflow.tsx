'use client'

import { Mutation, Query } from '@ez-kit/query-react'
import { QueryClient, QueryClientProvider, mutationOptions, queryOptions } from '@tanstack/react-query'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { createDemoApi, ValidationError } from './demo-api'

function createDemo() {
	const api = createDemoApi()
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const list = queryOptions({ queryKey: ['devices'], queryFn: ({ signal }) => api.list(signal), staleTime: 60_000 })
	const create = mutationOptions({
		mutationFn: api.create,
		// Returning this promise keeps isPending true until the refreshed list is ready.
		onSuccess: () => client.invalidateQueries({ queryKey: list.queryKey }),
	})
	return { client, list, create }
}

export default function MutationWorkflowExample() {
	const [demo] = useState(createDemo)
	const nameId = useId()
	return (
		<QueryClientProvider client={demo.client}>
			<section
				aria-label='Create devices'
				className='not-prose w-full max-w-md space-y-4'
			>
				<p className='text-sm text-fd-muted-foreground'>
					Try a short or duplicate name to see a server field error. Valid names refresh the list after saving.
				</p>
				<Mutation mutation={demo.create}>
					{(m) => {
						const nameError = m.error instanceof ValidationError ? m.error.fieldErrors.name : undefined
						return (
							<form
								className='space-y-2'
								onSubmit={(event) => {
									event.preventDefault()
									const form = event.currentTarget
									m.mutate(String(new FormData(form).get('name') ?? ''), {
										onSuccess: () => {
											form.reset()
										},
									})
								}}
							>
								<label
									htmlFor={nameId}
									className='text-sm font-medium'
								>
									Device name
								</label>
								<Input
									id={nameId}
									name='name'
									disabled={m.isPending}
									aria-invalid={Boolean(nameError)}
									aria-describedby={nameError ? `${nameId}-error` : undefined}
								/>
								{m.isError && (
									<p
										id={`${nameId}-error`}
										role='alert'
										className='text-sm text-red-600 dark:text-red-400'
									>
										{nameError ?? m.error.message}
									</p>
								)}
								<Button
									type='submit'
									disabled={m.isPending}
								>
									{m.isPending ? 'Saving…' : 'Add device'}
								</Button>
								{m.isSuccess && (
									<p
										role='status'
										className='text-sm'
									>
										Device added. The list is up to date.
									</p>
								)}
							</form>
						)
					}}
				</Mutation>
				<Query
					query={demo.list}
					loading={<p role='status'>Loading devices…</p>}
					error={(error) => <p role='alert'>{error.message}</p>}
				>
					{(devices, q) => (
						<div>
							<ul className='space-y-1'>
								{devices.map((device) => (
									<li key={device.id}>{device.name}</li>
								))}
							</ul>
							{q.isFetching && (
								<p
									role='status'
									className='text-sm'
								>
									Refreshing list…
								</p>
							)}
						</div>
					)}
				</Query>
			</section>
		</QueryClientProvider>
	)
}
