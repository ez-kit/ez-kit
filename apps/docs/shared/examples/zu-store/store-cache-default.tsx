'use client'

import { CacheProvider, createCachedStore } from '@ez-kit/zu-store'
import { useState } from 'react'
import { createStore } from 'zustand/vanilla'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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
	const title = draftStore.useSelector((s) => s.title)
	const body = draftStore.useSelector((s) => s.body)
	const setTitle = draftStore.useSelector((s) => s.setTitle)
	const setBody = draftStore.useSelector((s) => s.setBody)

	return (
		<Card
			size='sm'
			className='gap-2 px-4'
		>
			<Input
				value={title}
				placeholder='Subject'
				onChange={(e) => {
					setTitle(e.target.value)
				}}
			/>
			<Textarea
				value={body}
				placeholder='Write your message…'
				rows={3}
				onChange={(e) => {
					setBody(e.target.value)
				}}
			/>
		</Card>
	)
}

function Demo() {
	const [open, setOpen] = useState(true)
	// Passive cross-tree read: reflects the kept-alive draft even while the form is closed.
	const keptTitle = draftStore.useFromCache({ id: 'new-message' }, (s) => s?.title ?? '')

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-center gap-2'>
				<Button
					variant='outline'
					size='sm'
					onClick={() => {
						setOpen((on) => !on)
					}}
				>
					{open ? 'Close composer' : 'Reopen composer'}
				</Button>
				<span className='ml-auto text-xs text-muted-foreground'>
					kept draft <span className='font-mono'>{keptTitle || '—'}</span>
				</span>
			</div>

			{open ? (
				<draftStore.Provider id='new-message'>
					<DraftForm />
				</draftStore.Provider>
			) : (
				<Empty className='border'>
					<EmptyTitle>The composer is closed</EmptyTitle>
					<EmptyDescription>
						Your draft is kept alive in the default cache. Reopen it — your subject and body are still there.
					</EmptyDescription>
				</Empty>
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
