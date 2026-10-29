'use client'

import { Query } from '@ez-kit/query-react'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import { ExampleQueryClient } from './_example-client'
import { fetchDevices } from './_fake-api'

const deviceQueries = {
	list: () => queryOptions({ queryKey: ['devices'], queryFn: () => fetchDevices({ delay: 1000 }) }),
}

function DeviceCount() {
	const { data: devices } = useSuspenseQuery(deviceQueries.list())
	return <Badge variant='secondary'>{devices.length} devices</Badge>
}

function OfflineDevices() {
	const { data: offline } = useSuspenseQuery({
		...deviceQueries.list(),
		select: (devices) => devices.filter((d) => !d.online),
	})
	return <p className='text-sm text-muted-foreground'>Offline: {offline.map((d) => d.name).join(', ') || 'none'}</p>
}

function DeviceList() {
	const { data: devices } = useSuspenseQuery(deviceQueries.list())
	return (
		<ul className='text-sm'>
			{devices.map((device) => (
				<li key={device.id}>{device.name}</li>
			))}
		</ul>
	)
}

export default function DataUnderGateExample() {
	return (
		<ExampleQueryClient>
			<div className='rounded-xl border p-4'>
				<Query
					query={deviceQueries.list()}
					loading={<Skeleton className='h-16 w-full' />}
				>
					{() => (
						<div className='flex flex-col gap-2'>
							<DeviceCount />
							<DeviceList />
							<OfflineDevices />
						</div>
					)}
				</Query>
			</div>
		</ExampleQueryClient>
	)
}
