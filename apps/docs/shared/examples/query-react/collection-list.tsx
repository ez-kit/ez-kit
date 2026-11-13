'use client'

import { createCollectionSource, useCollectionQuery } from '@ez-kit/query-react/collection'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Item, ItemGroup } from '@/components/ui/item'

type User = { id: string; name: string }
type Params = { search: string; offset: number; limit: number }

function createDemo() {
	let users: User[] = ['Ada', 'Grace', 'Linus', 'Margaret', 'Ken'].map((name, index) => ({ id: String(index), name }))
	let nextId = users.length
	const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 250))
	const name = (value: string) => {
		if (!value.trim()) throw new Error('Name is required')
		return value.trim()
	}
	const source = createCollectionSource({
		key: ['collection-demo'],
		getAll: {
			prepareArgs: (params: Params) => params,
			fetcher: async (params: Params, { signal }) => {
				await delay()
				signal.throwIfAborted()
				const matches = users.filter((user) => user.name.toLowerCase().includes(params.search.toLowerCase()))
				return { items: matches.slice(params.offset, params.offset + params.limit), total: matches.length }
			},
			getItems: (response) => response.items,
			getTotal: (response) => response.total,
		},
		create: {
			prepareArgs: (input: { name: string }) => ({ name: name(input.name) }),
			fetcher: async (input: { name: string }) => {
				await delay()
				const user = { id: String(nextId++), name: input.name }
				users = [...users, user]
				return user
			},
		},
		update: {
			prepareArgs: (input: User) => ({ ...input, name: name(input.name) }),
			fetcher: async (input: User) => {
				await delay()
				users = users.map((user) => (user.id === input.id ? input : user))
				return input
			},
		},
		delete: {
			prepareArgs: (input: { id: string }) => input.id,
			fetcher: async (id: string) => {
				await delay()
				users = users.filter((user) => user.id !== id)
			},
		},
		deleteMany: {
			prepareArgs: (input: { ids: string[] }) => input.ids,
			fetcher: async (ids: string[]) => {
				await delay()
				users = users.filter((user) => !ids.includes(user.id))
			},
		},
	})
	return {
		source,
		client: new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }),
	}
}

function CollectionList({ source }: { source: ReturnType<typeof createDemo>['source'] }) {
	const [params, setParams] = useState<Params>({ search: '', offset: 0, limit: 2 })
	const [selected, setSelected] = useState<string[]>([])
	const users = useCollectionQuery({ source, params, mode: 'pages' })
	const pending =
		users.create.isPending || users.update.isPending || users.delete.isPending || users.deleteMany.isPending
	const error =
		users.create.error ?? users.update.error ?? users.delete.error ?? users.deleteMany.error ?? users.query.error
	// This list owns its offset convention. Only a fresh authoritative total can clamp it.
	if (users.query.isSuccess && !users.query.isFetching && !users.query.isPlaceholderData && users.total !== undefined) {
		const lastOffset = Math.max(0, Math.ceil(users.total / params.limit) - 1) * params.limit
		if (params.offset > lastOffset) setParams({ ...params, offset: lastOffset })
	}

	return (
		<section
			aria-label='Collection users'
			className='not-prose space-y-4'
		>
			<Input
				aria-label='Search users'
				value={params.search}
				onChange={(event) => {
					const search = event.target.value
					setParams((previous) => ({ ...previous, search, offset: 0 }))
					setSelected([])
				}}
			/>
			<form
				className='flex gap-2'
				onSubmit={(event) => {
					event.preventDefault()
					const form = event.currentTarget
					users.create.mutate(
						{ name: String(new FormData(form).get('name') ?? '') },
						{
							onSuccess: () => {
								form.reset()
							},
						},
					)
				}}
			>
				<Input
					aria-label='New user name'
					name='name'
				/>
				<Button
					type='submit'
					disabled={pending}
				>
					Create
				</Button>
			</form>
			{error && <p role='alert'>{error.message}</p>}
			<p role='status'>{users.query.isFetching ? 'Refreshing users…' : `${String(users.total ?? 0)} users`}</p>
			<ItemGroup aria-label='Users'>
				{users.items.map((user) => (
					<Item
						key={user.id}
						role='listitem'
						variant='outline'
					>
						<input
							type='checkbox'
							aria-label={`Select ${user.name}`}
							checked={selected.includes(user.id)}
							onChange={(event) => {
								const checked = event.target.checked
								setSelected((ids) => (checked ? [...ids, user.id] : ids.filter((id) => id !== user.id)))
							}}
						/>
						<form
							className='flex flex-1 gap-2'
							onSubmit={(event) => {
								event.preventDefault()
								users.update.mutate({ id: user.id, name: String(new FormData(event.currentTarget).get('name') ?? '') })
							}}
						>
							<Input
								key={user.name}
								aria-label={`Name for ${user.name}`}
								name='name'
								defaultValue={user.name}
							/>
							<Button
								type='submit'
								disabled={pending}
							>
								Save
							</Button>
							<Button
								type='button'
								disabled={pending}
								onClick={() => {
									users.delete.mutate({ id: user.id })
								}}
							>
								Delete
							</Button>
						</form>
					</Item>
				))}
			</ItemGroup>
			<div className='flex flex-wrap items-center gap-2'>
				<Button
					disabled={pending || selected.length === 0}
					onClick={() => {
						users.deleteMany.mutate(
							{ ids: selected },
							{
								onSuccess: () => {
									setSelected([])
								},
							},
						)
					}}
				>
					Delete selected
				</Button>
				<Button
					disabled={params.offset === 0 || users.query.isFetching}
					onClick={() => {
						setParams((previous) => ({ ...previous, offset: Math.max(0, previous.offset - previous.limit) }))
					}}
				>
					Previous
				</Button>
				<span>Page {params.offset / params.limit + 1}</span>
				<Button
					disabled={users.query.isFetching || users.total === undefined || params.offset + params.limit >= users.total}
					onClick={() => {
						setParams((previous) => ({ ...previous, offset: previous.offset + previous.limit }))
					}}
				>
					Next
				</Button>
			</div>
		</section>
	)
}
export default function CollectionListExample() {
	const [demo] = useState(createDemo)
	return (
		<QueryClientProvider client={demo.client}>
			<CollectionList source={demo.source} />
		</QueryClientProvider>
	)
}
