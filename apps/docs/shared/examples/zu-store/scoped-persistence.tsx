'use client'

import { createStoreCache, pipe, StoreProvider } from '@ez-kit/zu-store'
import {
	decodeRecord,
	encodeRecord,
	serializePersistAddress,
	usePersistence,
	usePersistStatus,
	withPersist,
} from '@ez-kit/zu-store/persist'
import { localStorageAdapter, patchKeyed, removeKeyedScope } from '@ez-kit/zu-store/persist/storage'
import { useState, useSyncExternalStore } from 'react'
import { createStore } from 'zustand/vanilla'

import { Button } from '@/components/ui/button'

import type { CommitCtx, Keyed, SourcePort } from '@ez-kit/zu-store/persist'

const cache = createStoreCache()
const scope = ['scoped-demo']
const serverKey = serializePersistAddress({
	store: { path: scope, name: 'server-panel', id: 'workspace' },
	field: ['width'],
})
let serverValues: Keyed = new Map([[serverKey, encodeRecord('720')]])
const deliveries = new Set<() => void>()
const readoutListeners = new Set<() => void>()
const emitReadout = (): void => {
	for (const listener of readoutListeners) listener()
}

// Deliberately cannot abort: the demo lets the reader deliver an obsolete response after timeout.
const serverPort: SourcePort = {
	capabilities: { recordVersions: true },
	get() {
		const snapshot = new Map(serverValues)
		return new Promise<Keyed>((resolve) => {
			const deliver = (): void => {
				deliveries.delete(deliver)
				resolve(snapshot)
			}
			deliveries.add(deliver)
		})
	},
	async set(desired: Keyed, context: CommitCtx) {
		await Promise.resolve()
		serverValues = patchKeyed(serverValues, desired, context)
		emitReadout()
	},
	async removeScope(path) {
		await Promise.resolve()
		serverValues = removeKeyedScope(serverValues, path)
		emitReadout()
	},
}

function createPanel(source: 'browser' | 'server') {
	return pipe(
		createStore(() => ({ width: 320 })),
		withPersist({ restore: { timeoutMs: 2000 }, fields: (field) => [field((state) => state.width, { source })] }),
	)
}

const browserPanel = cache.createCachedStore(() => createPanel('browser'), { name: 'browser-panel' })
const serverPanel = cache.createCachedStore(() => createPanel('server'), { name: 'server-panel' })
const adapters = {
	browser: localStorageAdapter({ storageKey: 'ez-kit-docs-scoped-layouts-v2' }),
	server: { port: serverPort },
}

function LayoutPanel({ group, label }: { group: typeof browserPanel; label: string }) {
	const store = group.useStore()
	const width = group.useSelector((state) => state.width)
	const status = usePersistStatus(store)
	return (
		<section
			className='space-y-3 rounded-xl border p-4'
			aria-label={`${label} layout`}
		>
			<h3 className='font-medium'>{label}</h3>
			<p role='status'>
				{label} restore: {status.restore}; write: {status.write}
			</p>
			{status.restore === 'pending' ? (
				<p>Restoring {label.toLowerCase()} layout…</p>
			) : (
				<>
					<label className='flex flex-col gap-2'>
						{label} width: {width}px
						<input
							type='range'
							min={200}
							max={800}
							step={10}
							value={width}
							aria-label={`${label} width`}
							onChange={(event) => {
								store.setState({ width: event.currentTarget.valueAsNumber })
							}}
						/>
					</label>
					<div className='overflow-hidden rounded-lg border'>
						<div
							className='h-8 bg-primary/20'
							style={{ width }}
						/>
					</div>
					<Button
						variant='outline'
						onClick={() => {
							store.setState({ width: 500 })
						}}
					>
						Set {label.toLowerCase()} width to 500
					</Button>
				</>
			)}
		</section>
	)
}

const subscribeReadout = (listener: () => void): (() => void) => {
	readoutListeners.add(listener)
	return () => {
		readoutListeners.delete(listener)
	}
}
const readSavedWidth = (): string => {
	const raw = serverValues.get(serverKey)
	return raw === undefined ? 'default' : decodeRecord(raw).value
}

function Controls() {
	const persistence = usePersistence()
	const saved = useSyncExternalStore(subscribeReadout, readSavedWidth, () => '720')
	const [error, setError] = useState('')
	const reset = (): void => {
		void persistence.resetScope({ path: scope, sources: ['browser', 'server'] }).then(
			(outcomes) => {
				setError(
					Object.values(outcomes).some((outcome) => outcome.status === 'rejected')
						? 'Some settings could not be deleted. Retry reset.'
						: '',
				)
			},
			() => {
				setError('Settings could not be deleted. Retry reset.')
			},
		)
	}
	return (
		<div className='space-y-3'>
			<p>Server starts with 720px. Wait two seconds, change the panel, then deliver the old read.</p>
			<div className='flex flex-wrap gap-2'>
				<Button
					variant='outline'
					onClick={() => {
						for (const deliver of [...deliveries]) deliver()
					}}
				>
					Deliver server read
				</Button>
				<Button
					variant='outline'
					onClick={reset}
				>
					Reset page layout
				</Button>
			</div>
			<p data-testid='saved-server-width'>Stored server width: {saved}</p>
			{error ? <p role='alert'>{error}</p> : null}
		</div>
	)
}

export default function ScopedPersistenceExample() {
	return (
		<StoreProvider
			persist={adapters}
			cache={cache}
			defaultSource='browser'
		>
			<cache.Scope path={scope}>
				<div className='space-y-4'>
					<Controls />
					<browserPanel.Provider id='workspace'>
						<LayoutPanel
							group={browserPanel}
							label='Browser'
						/>
					</browserPanel.Provider>
					<serverPanel.Provider id='workspace'>
						<LayoutPanel
							group={serverPanel}
							label='Server'
						/>
					</serverPanel.Provider>
				</div>
			</cache.Scope>
		</StoreProvider>
	)
}
