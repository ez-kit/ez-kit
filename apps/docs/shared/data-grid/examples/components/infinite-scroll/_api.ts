import { makeUsers, type User } from '../_data'

/** Simulated server dataset. */
const ALL_USERS: User[] = makeUsers(200)

export const PAGE_SIZE = 20
const NETWORK_DELAY_MS = 600

export type SortSpec = { id: string; desc: boolean }
export type UsersPage = { rows: User[]; nextCursor: number | null }

function sortUsers(rows: User[], sort: SortSpec | undefined): User[] {
	if (!sort) return rows
	const sorted = [...rows].sort((a, b) => {
		const av = a[sort.id as keyof User]
		const bv = b[sort.id as keyof User]
		if (av < bv) return -1
		if (av > bv) return 1
		return 0
	})
	return sort.desc ? sorted.reverse() : sorted
}

/**
 * Simulates a cursor-paginated, optionally-sorted users API with network latency.
 * `cursor` is the offset of the first row to return.
 */
export function fetchUsersPage(cursor: number, sort?: SortSpec): Promise<UsersPage> {
	return new Promise((resolve) => {
		setTimeout(() => {
			const source = sortUsers(ALL_USERS, sort)
			const rows = source.slice(cursor, cursor + PAGE_SIZE)
			const nextOffset = cursor + rows.length
			resolve({ rows, nextCursor: nextOffset < source.length ? nextOffset : null })
		}, NETWORK_DELAY_MS)
	})
}
