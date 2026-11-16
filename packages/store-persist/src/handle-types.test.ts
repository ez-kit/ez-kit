import { describe, expect, it } from 'vitest'

import { persistHandle, urlHandle } from './handle'

import type { PersistFieldPath, PersistHandles } from './handle'

type State = {
	layout: { width: number }
	visible: boolean
	columns: string[]
	items: { width: number }[]
	optional?: { width: number }
	date: Date
	setWidth(width: number): void
}

type StoreHandle = {
	getState(): State
	getInitialState(): State
	setState(state: Partial<State>): void
	subscribe(listener: () => void): () => void
}

// State paths are checked for plain proxies and complete structural store handles.
function consumerTypes(proxy: State & PersistHandles<State>, store: StoreHandle) {
	void persistHandle(proxy).restore({ timeoutMs: null })
	// @ts-expect-error Per-call restoration does not silently accept lifecycle policies.
	void persistHandle(proxy).restore({ externalChanges: 'apply' })
	void persistHandle(proxy).reset({ fields: [['layout'], ['layout', 'width'], ['columns'], ['date']] })
	void persistHandle(store).reset({ fields: [['visible'], ['items', '0', 'width'], ['optional', 'width']] })
	void proxy.$persist.reset({ fields: [['layout', 'width']] })
	void urlHandle(store, 'router').reset({ fields: [['visible'], ['items', '0', 'width'], ['optional', 'width']] })
	// @ts-expect-error Unknown root fields are rejected.
	void persistHandle(proxy).reset({ fields: [['layuot']] })
	// @ts-expect-error Unknown nested fields are rejected.
	void persistHandle(store).reset({ fields: [['layout', 'height']] })
	// @ts-expect-error Mutation methods are not persisted state paths.
	void proxy.$persist.reset({ fields: [['setWidth']] })
	// @ts-expect-error Control handles are off-band rather than persisted fields.
	void persistHandle(proxy).reset({ fields: [['$persist']] })
}
void consumerTypes

function businessMethodTypes(proxy: State & { getState(): string }) {
	void persistHandle(proxy).reset({ fields: [['layout'], ['layout', 'width']] })
	void urlHandle(proxy).reset({ fields: [['visible']] })
	// @ts-expect-error Business methods are not persisted state fields.
	void persistHandle(proxy).reset({ fields: [['getState']] })
	// @ts-expect-error Business getState cannot erase the actual state into a broad fallback.
	void persistHandle(proxy).reset({ fields: [['missing']] })
}
void businessMethodTypes

describe('typed persistence control paths', () => {
	it('retains string-path fallback for intentionally widened stores', () => {
		const path: PersistFieldPath<object> = ['dynamic', 'field']
		expect(path).toEqual(['dynamic', 'field'])
	})
})
