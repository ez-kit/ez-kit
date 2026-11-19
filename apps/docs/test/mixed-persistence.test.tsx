import { createContextStore as createValtioContext, pipe as vaPipe } from '@ez-kit/va-store'
import { withPersist as vaPersist } from '@ez-kit/va-store/persist'
import { createContextStore as createZustandContext, pipe as zuPipe } from '@ez-kit/zu-store'
import {
	decodeRecord,
	persistHandle,
	PersistProvider,
	serializePersistAddress,
	withPersist as zuPersist,
} from '@ez-kit/zu-store/persist'
import { patchKeyed, removeKeyedScope } from '@ez-kit/zu-store/persist/storage'
import { act, render } from '@testing-library/react'
import { proxy } from 'valtio'
import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import type { CommitCtx, Keyed, SourcePort } from '@ez-kit/zu-store/persist'

describe('one persistence writer across Zustand and Valtio', () => {
	it('patches both managers independently and keeps a shared source queue', async () => {
		let saved: Keyed = new Map([['legacy', 'untouched']])
		let active = 0
		let maximum = 0
		const port: SourcePort = {
			capabilities: { recordVersions: true },
			get: () => new Map(saved),
			set: vi.fn(async (desired: Keyed, context: CommitCtx) => {
				maximum = Math.max(maximum, ++active)
				await Promise.resolve()
				saved = patchKeyed(saved, desired, context)
				active--
			}),
			removeScope: (path) => {
				saved = removeKeyedScope(saved, path)
			},
		}
		const zu = createZustandContext(() =>
			zuPipe(
				createStore(() => ({ width: 320 })),
				zuPersist({ fields: (field) => [field((state) => state.width, {})] }),
			),
		)
		const va = createValtioContext(() =>
			vaPipe(proxy({ width: 400 }), vaPersist({ fields: (field) => [field((state) => state.width, {})] })),
		)
		let z: ReturnType<typeof zu.useStore> | undefined
		let v: ReturnType<typeof va.useStore> | undefined
		function Zu() {
			z = zu.useStore()
			return null
		}
		function Va() {
			v = va.useStore()
			return null
		}
		render(
			<PersistProvider
				adapters={{ shared: { port } }}
				defaultSource='shared'
			>
				<zu.Provider address={{ path: ['mixed'], name: 'zu', id: 'one' }}>
					<Zu />
				</zu.Provider>
				<va.Provider address={{ path: ['mixed'], name: 'va', id: 'one' }}>
					<Va />
				</va.Provider>
			</PersistProvider>,
		)
		await act(async () => {
			z?.setState({ width: 500 })
			if (v) v.width = 600
			if (z && v) await Promise.all([persistHandle(z).flush(), persistHandle(v).flush()])
		})
		const width = (name: string) =>
			decodeRecord(
				saved.get(serializePersistAddress({ store: { path: ['mixed'], name, id: 'one' }, field: ['width'] })) ?? '',
			).value
		expect(width('zu')).toBe('500')
		expect(width('va')).toBe('600')
		expect(saved.get('legacy')).toBe('untouched')
		expect(maximum).toBe(1)
		await act(async () => {
			if (v) {
				v.width = 700
				await persistHandle(v).flush()
			}
		})
		expect(width('zu')).toBe('500')
		expect(width('va')).toBe('700')
	})
})
