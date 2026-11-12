import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { listInvalidation, resolveInvalidation } from './invalidation'

describe('invalidation policy', () => {
	it('invalidates both list families without touching detail or other resources', async () => {
		const client = new QueryClient()
		const keys = [
			['users', 'list', { page: 0 }],
			['users', 'list', { page: 1 }],
			['users', 'infinite', { search: 'Ada' }],
			['users', 'detail', '1'],
			['orders', 'list'],
		]
		for (const key of keys) client.setQueryData(key, [])
		await Promise.all(listInvalidation(['users']).map((filter) => client.invalidateQueries(filter)))
		expect(keys.map((key) => client.getQueryState(key)?.isInvalidated)).toEqual([true, true, true, false, false])
		client.clear()
	})

	it('composes source and operation additions, while replace and false override', () => {
		const defaults = listInvalidation(['users'])
		const source = resolveInvalidation(defaults, { additional: [{ queryKey: ['count'] }] })
		const operation = resolveInvalidation(source, { additional: [{ queryKey: ['audit'] }] })
		expect(operation).toHaveLength(4)
		expect(defaults).toHaveLength(2)
		expect(resolveInvalidation(source, undefined)).toBe(source)
		expect(resolveInvalidation(source, false)).toEqual([])
		expect(resolveInvalidation(source, { replace: [{ queryKey: ['custom'], exact: true }] })).toEqual([
			{ queryKey: ['custom'], exact: true },
		])
	})
})

it('keeps composite keys distinct from separate filters and honors native exact/predicate matching', async () => {
	const client = new QueryClient()
	const keys = [
		['users-count'],
		['dashboard'],
		['users-count', 'dashboard'],
		['users-count', 'dashboard', 'extra'],
		['audit', 1],
		['audit', 2],
	]
	for (const key of keys) client.setQueryData(key, 1)
	const filters = resolveInvalidation([], {
		additional: [
			{ queryKey: ['users-count', 'dashboard'], exact: true },
			{ queryKey: ['audit'], predicate: (query) => query.queryKey[1] === 2 },
		],
	})
	await Promise.all(filters.map((filter) => client.invalidateQueries(filter)))
	expect(keys.map((key) => client.getQueryState(key)?.isInvalidated)).toEqual([false, false, true, false, false, true])
	await Promise.all(
		resolveInvalidation([], {
			additional: [{ queryKey: ['users-count'], exact: true }, { queryKey: ['dashboard'] }],
		}).map((filter) => client.invalidateQueries(filter)),
	)
	expect(client.getQueryState(['users-count'])?.isInvalidated).toBe(true)
	expect(client.getQueryState(['dashboard'])?.isInvalidated).toBe(true)
	client.clear()
})
