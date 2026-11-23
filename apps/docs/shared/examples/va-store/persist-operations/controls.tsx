'use client'

/* eslint-disable react-hooks/immutability -- Valtio stores are mutable proxies. */

import { persistHandle, usePersistStatus } from '@ez-kit/va-store/persist'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { panel } from './store'

type Props = { delayRead: () => void; setFailWrites: (value: boolean) => void }

export function OperationControls({ delayRead, setFailWrites }: Props) {
	const store = panel.useStore()
	const width = panel.useSelector((state) => state.width)
	const handle = persistHandle(store, 'server')
	const status = usePersistStatus(store, 'server')
	const [message, setMessage] = useState('')
	const [busy, setBusy] = useState(false)

	async function run(action: 'save' | 'reset' | 'restore') {
		setBusy(true)
		setMessage('')
		try {
			if (action === 'save') {
				await handle.flush()
				setMessage('Saved')
			} else if (action === 'reset') {
				await handle.reset()
				setMessage('Reset saved')
			} else {
				const result = await handle.restore()
				setMessage(`Restore: ${result.status}`)
			}
		} catch (error) {
			setMessage(error instanceof Error ? error.message : String(error))
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className='space-y-3'>
			<p>
				Panel width: <output>{width}</output>
			</p>
			<div className='flex flex-wrap gap-2'>
				<Button
					type='button'
					onClick={() => {
						store.width += 40
					}}
				>
					Increase width
				</Button>
				<Button
					type='button'
					variant='outline'
					disabled={busy}
					onClick={() => void run('save')}
				>
					Save
				</Button>
				<Button
					type='button'
					variant='outline'
					disabled={busy}
					onClick={() => void run('reset')}
				>
					Reset
				</Button>
				<Button
					type='button'
					variant='outline'
					disabled={busy}
					onClick={() => {
						delayRead()
						void run('restore')
					}}
				>
					Run slow restore
				</Button>
			</div>
			<label className='flex items-center gap-2'>
				<input
					type='checkbox'
					onChange={(event) => {
						setFailWrites(event.target.checked)
					}}
				/>{' '}
				Reject writes
			</label>
			<p role='status'>{message || `Restore: ${status.restore} · Write: ${status.write}`}</p>
		</div>
	)
}
