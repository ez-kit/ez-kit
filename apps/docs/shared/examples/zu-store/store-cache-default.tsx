'use client'

import { CacheProvider, createCachedStore } from '@ez-kit/zu-store'
import { useState } from 'react'
import { createStore } from 'zustand/vanilla'

type DraftState = {
	title: string
	body: string
	setTitle: (title: string) => void
	setBody: (body: string) => void
}

// Zero-config: import the default cache's exports directly — no `createStoreCache` call,
// no instance to thread through your app.
const draftStore = createCachedStore(
	() =>
		createStore<DraftState>((set) => ({
			title: '',
			body: '',
			setTitle: (title) => {
				set({ title })
			},
			setBody: (body) => {
				set({ body })
			},
		})),
	{ name: 'compose-draft' },
)

function DraftForm() {
	const title = draftStore.useStore((s) => s.title)
	const body = draftStore.useStore((s) => s.body)
	const setTitle = draftStore.useStore((s) => s.setTitle)
	const setBody = draftStore.useStore((s) => s.setBody)

	return (
		<div className='flex flex-col gap-2 rounded-lg border border-fd-border bg-fd-card p-4'>
			<input
				value={title}
				onChange={(e) => {
					setTitle(e.target.value)
				}}
				placeholder='Subject'
				className='rounded-md border border-fd-border bg-fd-background px-3 py-1.5 text-sm'
			/>
			<textarea
				value={body}
				onChange={(e) => {
					setBody(e.target.value)
				}}
				placeholder='Write your message…'
				rows={3}
				className='resize-none rounded-md border border-fd-border bg-fd-background px-3 py-1.5 text-sm'
			/>
		</div>
	)
}

function Demo() {
	const [open, setOpen] = useState(true)
	// Passive cross-tree read: reflects the kept-alive draft even while the form is closed.
	const keptTitle = draftStore.useFromCache({ id: 'new-message' }, (s) => s?.title ?? '')

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-center gap-2'>
				<button
					type='button'
					onClick={() => {
						setOpen((on) => !on)
					}}
					className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted'
				>
					{open ? 'Close composer' : 'Reopen composer'}
				</button>
				<span className='ml-auto text-xs text-fd-muted-foreground'>
					kept draft: <span className='font-mono'>{keptTitle || '—'}</span>
				</span>
			</div>

			{open ? (
				<draftStore.Provider id='new-message'>
					<DraftForm />
				</draftStore.Provider>
			) : (
				<p className='rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground'>
					The composer is closed, but your draft is kept alive in the default cache. Reopen it — your subject and body
					are still there.
				</p>
			)}
		</div>
	)
}

export default function StoreCacheDefaultExample() {
	// Mount the default cache boundary once. No `createStoreCache` instance to create.
	return (
		<CacheProvider>
			<Demo />
		</CacheProvider>
	)
}
