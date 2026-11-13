import { createCollectionSourceFactory } from '@ez-kit/query-react/collection'

import { adaptCollectionToGrid } from '../../src/data-grid'

import { createUser, deleteUser, deleteUsers, getUsers, updateUser } from './generated/users'

import type { User, UserValues } from './generated/users'

type Params = { offset: number; limit: number; search: string }

// Application convention: independent of table state and reusable for any entity.
function makeCollection<Row>() {
	return createCollectionSourceFactory({
		list: {
			prepareArgs: (params: Params) => params,
			getItems: (response: { items: Row[]; total: number }) => response.items,
			getTotal: (response) => response.total,
		},
	})
}
export const usersCollection = makeCollection<User>()({
	key: ['orval-collection-users'],
	getAll: (params, { signal }) => getUsers(params, { signal }),
	create: {
		prepareArgs: (input: UserValues) => input,
		fetcher: createUser,
	},
	update: {
		prepareArgs: (input: { id: string; values: UserValues }) => input,
		fetcher: ({ id, values }: { id: string; values: UserValues }) => updateUser(id, values),
	},
	delete: { prepareArgs: (input: { id: string }) => input.id, fetcher: deleteUser },
	deleteMany: { prepareArgs: (input: { ids: string[] }) => input, fetcher: deleteUsers },
})
function prepareValues(values: Partial<User>): UserValues {
	if (!values.name?.trim()) throw new Error('Name is required')
	return { name: values.name }
}
export const collectionGridSource = adaptCollectionToGrid(usersCollection, {
	params: ({ pagination, globalFilter }) => ({
		offset: pagination.pageIndex * pagination.pageSize,
		limit: pagination.pageSize,
		search: typeof globalFilter === 'string' ? globalFilter : '',
	}),
	create: ({ values }) => prepareValues(values),
	update: ({ row, values }) => {
		if (!row) throw new Error('User is no longer available')
		return { id: row.id, values: prepareValues(values) }
	},
	delete: ({ row }) => ({ id: row.id }),
	deleteMany: ({ rows }) => ({ ids: rows.map((row) => row.id) }),
})
