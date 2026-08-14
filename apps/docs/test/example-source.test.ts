// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { readExampleFiles } from '../components/example-source'

describe('readExampleFiles', () => {
	it('lists the entry file and every file it imports relatively', async () => {
		const files = await readExampleFiles('production-orders')

		expect(files.map((file) => file.name)).toEqual(['ProductionExample.tsx', 'data.ts', 'use-orders.ts', 'server.ts'])
	})

	it('reports each dependency by its path under the example root', async () => {
		const files = await readExampleFiles('production-orders')

		expect(files[1]?.path).toBe('components/production/data.ts')
	})

	it('slices the entry file to the example export and leaves dependencies whole', async () => {
		const files = await readExampleFiles('production-orders')

		expect(files[0]?.source).toContain('export function ProductionExample')
		expect(files[1]?.source).toContain('orderColumns')
	})

	it('throws for an unknown example id', async () => {
		await expect(readExampleFiles('nope')).rejects.toThrow(/unknown example id/u)
	})
})
