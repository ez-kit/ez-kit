import { createDataGridSource } from '../../src/data-grid'

import { createUser, deleteUser, deleteUsers, getUsers, getUsersFeed, updateUser } from './generated/users'

import type { User, UserValues } from './generated/users'

function prepareValues(values: Partial<User>): UserValues {
	if (!values.name?.trim()) throw new Error('Name is required')
	return { name: values.name }
}

type Criteria = { search: string; sort: string; limit: number }
type Request = Criteria & ({ mode: 'pages'; offset: number } | { mode: 'infinite'; cursor?: string })
type Page = { items: User[]; total?: number; next?: string }

export const usersSource = createDataGridSource({
	key: ['users'],
	collection: {
		fetcher: async (args: Request, { signal }): Promise<Page> => {
			const { mode, ...criteria } = args
			return mode === 'pages'
				? getUsers({ ...criteria, offset: args.offset }, { signal })
				: getUsersFeed({ ...criteria, ...(args.cursor === undefined ? {} : { cursor: args.cursor }) }, { signal })
		},
		prepareArgs: (input) => ({
			search: typeof input.params.globalFilter === 'string' ? input.params.globalFilter : '',
			sort: input.params.sorting.map(({ id, desc }) => `${id}:${desc ? 'desc' : 'asc'}`).join(','),
			limit: input.pageSize,
			...(input.mode === 'pages'
				? { mode: input.mode, offset: input.pageIndex * input.pageSize }
				: { mode: input.mode, ...(input.pageParam === undefined ? {} : { cursor: input.pageParam }) }),
		}),
		getItems: (page) => page.items,
		getTotal: (page) => page.total,
		infinite: {
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (page) => page.next,
		},
	},
	create: { fetcher: createUser, prepareArgs: ({ values }) => prepareValues(values) },
	update: {
		prepareArgs: ({ row, values }) => {
			if (!row) throw new Error('The edited row is no longer available')
			return { id: row.id, body: prepareValues(values) }
		},
		fetcher: ({ id, body }: { id: string; body: UserValues }) => updateUser(id, body),
	},
	delete: { prepareArgs: ({ row }) => row.id, fetcher: deleteUser },
	deleteMany: { prepareArgs: ({ rows }) => ({ ids: rows.map((row) => row.id) }), fetcher: deleteUsers },
})
