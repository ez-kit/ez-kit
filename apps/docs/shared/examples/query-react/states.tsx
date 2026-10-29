'use client'

import { Query } from '@ez-kit/query-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'

import { ExampleQueryClient } from './_example-client'
import { fetchDevices } from './_fake-api'

const SLOW_DELAY = 2500
const FAST_DELAY = 600

function Toggle({
	id,
	label,
	checked,
	onChange,
}: {
	id: string
	label: string
	checked: boolean
	onChange: (value: boolean) => void
}) {
	return (
		<div className='flex items-center gap-2'>
			<Switch
				id={id}
				size='sm'
				checked={checked}
				onCheckedChange={onChange}
			/>
			<Label htmlFor={id}>{label}</Label>
		</div>
	)
}

function DeviceStates() {
	const client = useQueryClient()
	const [enabled, setEnabled] = useState(false)
	const [slow, setSlow] = useState(false)
	const [fail, setFail] = useState(false)

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-wrap items-center gap-4'>
				<Toggle
					id='states-enabled'
					label='enabled'
					checked={enabled}
					onChange={setEnabled}
				/>
				<Toggle
					id='states-slow'
					label='slow network'
					checked={slow}
					onChange={setSlow}
				/>
				<Toggle
					id='states-fail'
					label='fail requests'
					checked={fail}
					onChange={setFail}
				/>
				<Button
					variant='outline'
					size='sm'
					onClick={() => void client.resetQueries({ queryKey: ['devices'] })}
				>
					Clear cache
				</Button>
			</div>

			<div className='min-h-32 rounded-xl border p-4'>
				<Query
					query={{
						queryKey: ['devices'],
						queryFn: () => fetchDevices({ delay: slow ? SLOW_DELAY : FAST_DELAY, fail }),
						enabled,
					}}
					idle={
						<p className='text-sm text-muted-foreground'>
							The query is disabled. Turn on “enabled” to load the devices.
						</p>
					}
					loading={
						<div className='flex flex-col gap-2'>
							<Skeleton className='h-4 w-1/3' />
							<Skeleton className='h-4 w-1/2' />
							<Skeleton className='h-4 w-2/5' />
						</div>
					}
					error={(error, q) => (
						<Alert variant='destructive'>
							<AlertTitle>Could not load the devices</AlertTitle>
							<AlertDescription className='flex flex-col items-start gap-2'>
								<span>
									{error.message} — {q.failureCount} failed attempt(s).
								</span>
								<Button
									variant='outline'
									size='sm'
									onClick={() => void q.refetch()}
								>
									Retry
								</Button>
							</AlertDescription>
						</Alert>
					)}
				>
					{(devices, q) => (
						<div className='flex flex-col gap-3'>
							<div className='flex flex-wrap items-center gap-2'>
								<Button
									variant='outline'
									size='sm'
									disabled={q.isFetching}
									onClick={() => void q.refetch()}
								>
									Refetch
								</Button>
								{q.isFetching && <Badge variant='secondary'>refreshing…</Badge>}
								{q.isError && <Badge variant='destructive'>last refresh failed: {q.error.message}</Badge>}
							</div>
							<ul className='text-sm'>
								{devices.map((device) => (
									<li key={device.id}>
										{device.name} — {device.online ? 'online' : 'offline'}
									</li>
								))}
							</ul>
						</div>
					)}
				</Query>
			</div>
		</div>
	)
}

export default function StatesExample() {
	return (
		<ExampleQueryClient>
			<DeviceStates />
		</ExampleQueryClient>
	)
}
