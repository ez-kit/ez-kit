import { makeSource } from './convention'
import { createUser, deleteUser, deleteUsers, getUsers, getUsersFeed, updateUser } from './generated/users'

import type { User, UserValues } from './generated/users'

function prepareValues(values: Partial<User>): UserValues {
	if (!values.name?.trim()) throw new Error('Name is required')
	return { name: values.name }
}
export const usersSource = makeSource<User>()({
	key: ['users'],
	getAll: (args, { signal }) => getUsers(args, { signal }),
	getInfinite: (args, { signal }) => getUsersFeed(args, { signal }),
	create: { fetcher: createUser, prepareArgs: ({ values }) => prepareValues(values) },
	update: {
		fetcher: ({ id, body }: { id: string; body: UserValues }) => updateUser(id, body),
		prepareArgs: ({ row, values }) => {
			if (!row) throw new Error('The edited user is no longer available')
			return { id: row.id, body: prepareValues(values) }
		},
	},
	delete: deleteUser,
	deleteMany: deleteUsers,
})
