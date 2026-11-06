'use client'

import { Mutation, Query } from '@ez-kit/query-react'
import { QueryClient, QueryClientProvider, mutationOptions, queryOptions } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { createDemoApi } from './demo-api'

function createDemo() {
	const api = createDemoApi()
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const list = queryOptions({ queryKey: ['devices'], queryFn: ({ signal }) => api.list(signal), staleTime: 60_000 })
	const update = mutationOptions({
		mutationFn: api.setFavorite,
		onMutate: async ({ id, favorite }) => {
			await client.cancelQueries({ queryKey: list.queryKey })
			const previous = client.getQueryData(list.queryKey)
			client.setQueryData(list.queryKey, (devices) =>
				devices?.map((device) => (device.id === id ? { ...device, favorite } : device)),
			)
			return { previous }
		},
		onError: (_error, _variables, snapshot) => {
			if (snapshot?.previous !== undefined) client.setQueryData(list.queryKey, snapshot.previous)
		},
		onSettled: () => client.invalidateQueries({ queryKey: list.queryKey }),
	})
	return { client, list, update }
}

export default function OptimisticUpdateExample() {
	const [demo] = useState(createDemo)
	const [fail, setFail] = useState(false)
	return (
		<QueryClientProvider client={demo.client}>
			<section
				aria-label='Optimistic favorites'
				className='not-prose w-full max-w-md space-y-4'
			>
				<p className='text-sm text-fd-muted-foreground'>
					Favorites change immediately. Simulate a failure to see the cached list roll back.
				</p>
				<label className='flex items-center gap-2 text-sm'>
					<input
						type='checkbox'
						checked={fail}
						onChange={(event) => {
							setFail(event.target.checked)
						}}
					/>
					Reject changes on the server
				</label>
				<Mutation mutation={demo.update}>
					{(m) => (
						<>
							<Query
								query={demo.list}
								loading={<p role='status'>Loading devices…</p>}
								error={(error) => <p role='alert'>{error.message}</p>}
							>
								{(devices) => (
									<ul className='space-y-2'>
										{devices.map((device) => (
											<li
												key={device.id}
												className='flex items-center justify-between gap-3'
											>
												<span>{device.name}</span>
												<Button
													variant='outline'
													size='sm'
													aria-label={`Favorite ${device.name}`}
													aria-pressed={device.favorite}
													disabled={m.isPending}
													onClick={() => {
														m.mutate({ id: device.id, favorite: !device.favorite, fail })
													}}
												>
													{device.favorite ? 'Favorited' : 'Favorite'}
												</Button>
											</li>
										))}
									</ul>
								)}
							</Query>
							{m.isPending && (
								<p
									role='status'
									className='text-sm'
								>
									Saving and syncing…
								</p>
							)}
							{m.isError && (
								<p
									role='alert'
									className='text-sm text-red-600 dark:text-red-400'
								>
									{m.error.message}
								</p>
							)}
						</>
					)}
				</Mutation>
			</section>
		</QueryClientProvider>
	)
}
