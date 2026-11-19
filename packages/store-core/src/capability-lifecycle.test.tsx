import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { attachCapability } from './capability'
import { useCapabilities } from './react'
import { createServiceRegistry } from './service'
const services = createServiceRegistry()
const id = { path: [], name: 'panel', id: 'one' }
function Mount({ store }: { store: object }) {
	useCapabilities(store, services, id)
	return null
}
describe('ordinary capability lifetime', () => {
	it('rolls back successful setup in reverse order when a later plugin fails', () => {
		const store = {}
		const order: string[] = []
		const failed = new Error('setup failed')
		for (const name of ['transport', 'subscription'])
			attachCapability(store, {
				name,
				setup: () => () => {
					order.push(name)
				},
			})
		attachCapability(store, {
			name: 'failed',
			setup: () => {
				throw failed
			},
		})
		expect(() => render(<Mount store={store} />)).toThrow(failed)
		expect(order).toEqual(['subscription', 'transport'])
	})
	it('reports setup and every rollback failure after releasing healthy capabilities', () => {
		const store = {}
		const failed = new Error('setup failed')
		const first = new Error('first cleanup')
		const last = new Error('last cleanup')
		const healthy = vi.fn()
		attachCapability(store, {
			name: 'first',
			setup: () => () => {
				throw first
			},
		})
		attachCapability(store, { name: 'healthy', setup: () => healthy })
		attachCapability(store, {
			name: 'last',
			setup: () => () => {
				throw last
			},
		})
		attachCapability(store, {
			name: 'failed',
			setup: () => {
				throw failed
			},
		})
		let error: unknown
		try {
			render(<Mount store={store} />)
		} catch (value) {
			error = value
		}
		expect(error).toBeInstanceOf(AggregateError)
		expect((error as AggregateError).errors).toEqual([failed, last, first])
		expect(healthy).toHaveBeenCalledOnce()
	})
	it('runs every cleanup in reverse order before reporting aggregate unmount failures', () => {
		const store = {}
		const order: string[] = []
		const first = new Error('first cleanup')
		const last = new Error('last cleanup')
		attachCapability(store, {
			name: 'first',
			setup: () => () => {
				order.push('first')
				throw first
			},
		})
		attachCapability(store, {
			name: 'healthy',
			setup: () => () => {
				order.push('healthy')
			},
		})
		attachCapability(store, {
			name: 'last',
			setup: () => () => {
				order.push('last')
				throw last
			},
		})
		const view = render(<Mount store={store} />)
		let error: unknown
		try {
			view.unmount()
		} catch (value) {
			error = value
		}
		expect(error).toBeInstanceOf(AggregateError)
		expect((error as AggregateError).errors).toEqual([last, first])
		expect(order).toEqual(['last', 'healthy', 'first'])
	})
})
