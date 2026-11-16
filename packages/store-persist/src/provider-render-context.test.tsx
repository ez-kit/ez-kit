import { createServiceRegistry } from '@ez-kit/store-core'
import { ServicesProvider, useCapabilities, useServices } from '@ez-kit/store-core/react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PersistProvider, usePersistence } from './provider'
import { objectPort, observable } from './test-kit'
import { createUrlPort } from './url/adapter'
import { applyPersist } from './with-persist'

import type { PersistEngines } from './service'
import type { ServiceRegistry } from '@ez-kit/store-core'

describe('render seed context without engine replacement', () => {
	it('changes initialization services on URL navigation while preserving connected engines', () => {
		let query = 'q=boots'
		const port = createUrlPort({ read: () => new URLSearchParams(query), commit: () => undefined })
		const adapters = { url: { usePort: () => ({ port, changeKey: query }) } }
		const store = observable({ q: '' })
		applyPersist<typeof store, typeof store>(store, objectPort, { fields: (f) => [f((s) => s.q, { source: 'url' })] })
		const services: ServiceRegistry[] = []
		const engines: PersistEngines[] = []
		function Probe() {
			const registry = useServices()
			services.push(registry)
			engines.push(usePersistence())
			useCapabilities(store, registry, { path: [], name: 'panel', id: 'one' })
			return null
		}
		const outer = createServiceRegistry()
		const tree = () => (
			<ServicesProvider registry={outer}>
				<PersistProvider adapters={adapters}>
					<Probe />
				</PersistProvider>
			</ServicesProvider>
		)
		const view = render(tree())
		const initialServices = services.at(-1)
		const initialEngines = engines.at(-1)
		expect(store.q).toBe('boots')
		query = 'q=coat'
		view.rerender(tree())
		expect(services.at(-1)).not.toBe(initialServices)
		expect(engines.at(-1)).toBe(initialEngines)
		expect(store.q).toBe('coat')
	})
})
