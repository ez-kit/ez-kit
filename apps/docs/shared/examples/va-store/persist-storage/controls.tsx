'use client'

/* eslint-disable react-hooks/immutability -- Valtio stores are mutable proxies. */

import { usePersistStatus } from '@ez-kit/va-store/persist'
import { useId } from 'react'

import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

import { prefs } from './store'

export function PreferenceControls() {
	const store = prefs.useStore()
	const { theme, fontScale } = prefs.useSnapshot()
	const { restore, write } = usePersistStatus(store)
	const restoring = restore === 'idle' || restore === 'pending'
	const themeId = useId()
	const fontScaleId = useId()
	return (
		<div className='space-y-3'>
			<p role='status'>
				Restore: {restore} · Write: {write}
			</p>
			<div className='flex flex-wrap gap-4'>
				<div className='flex items-center gap-2'>
					<label htmlFor={themeId}>Theme</label>
					<NativeSelect
						id={themeId}
						disabled={restoring}
						value={theme}
						onChange={(event) => {
							store.theme = event.target.value === 'dark' ? 'dark' : 'light'
						}}
					>
						<NativeSelectOption value='light'>Light</NativeSelectOption>
						<NativeSelectOption value='dark'>Dark</NativeSelectOption>
					</NativeSelect>
				</div>
				<div className='flex items-center gap-2'>
					<label htmlFor={fontScaleId}>Font scale</label>
					<NativeSelect
						id={fontScaleId}
						disabled={restoring}
						value={fontScale}
						onChange={(event) => {
							store.fontScale = Number(event.target.value)
						}}
					>
						<NativeSelectOption value='1'>100%</NativeSelectOption>
						<NativeSelectOption value='1.25'>125%</NativeSelectOption>
						<NativeSelectOption value='1.5'>150%</NativeSelectOption>
					</NativeSelect>
				</div>
			</div>
		</div>
	)
}
