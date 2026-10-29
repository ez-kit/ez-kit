'use client'

import { Query, QueryProvider } from '@ez-kit/query-react'
import { queryOptions } from '@tanstack/react-query'
import { useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'

import { ExampleQueryClient } from './_example-client'
import { fetchDevices, fetchStats } from './_fake-api'

import type { QueryErrorFallback } from '@ez-kit/query-react'

const loading = (
	<div className='flex items-center gap-2 text-sm text-muted-foreground'>
		<Spinner /> Loading…
	</div>
)

const error: QueryErrorFallback = (cause, q) => (
	<Alert variant='destructive'>
		<AlertTitle>Something went wrong</AlertTitle>
		<AlertDescription className='flex flex-col items-start gap-2'>
			<span>{cause.message}</span>
			<Button
				variant='outline'
				size='sm'
				onClick={() => void q.refetch()}
			>
				Retry
			</Button>
		</AlertDescription>
	</Alert>
)

function Panels({ fail, run }: { fail: boolean; run: number }) {
	return (
		<div className='grid gap-3 sm:grid-cols-3'>
			<section className='rounded-xl border p-4'>
				<h3 className='mb-2 text-sm font-medium'>Devices</h3>
				<Query query={queryOptions({ queryKey: ['devices', run], queryFn: () => fetchDevices({ delay: 1000, fail }) })}>
					{(devices) => <p className='text-sm'>{devices.length} devices</p>}
				</Query>
			</section>
			<section className='rounded-xl border p-4'>
				<h3 className='mb-2 text-sm font-medium'>Stats</h3>
				<Query query={queryOptions({ queryKey: ['stats', run], queryFn: () => fetchStats({ delay: 1500, fail }) })}>
					{(stats) => (
						<p className='text-sm'>
							{stats.online} of {stats.total} online
						</p>
					)}
				</Query>
			</section>
			<section className='rounded-xl border p-4'>
				<h3 className='mb-2 text-sm font-medium'>Own loading</h3>
				<Query
					query={queryOptions({ queryKey: ['devices-own', run], queryFn: () => fetchDevices({ delay: 2000, fail }) })}
					loading={<Skeleton className='h-4 w-2/3' />}
				>
					{(devices) => <p className='text-sm'>{devices.filter((d) => d.online).length} online</p>}
				</Query>
			</section>
		</div>
	)
}

export default function ProviderExample() {
	const [fail, setFail] = useState(false)
	const [run, setRun] = useState(0)

	return (
		<ExampleQueryClient>
			<QueryProvider
				loading={loading}
				error={error}
			>
				<div className='flex flex-col gap-3'>
					<div className='flex flex-wrap gap-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={() => {
								setFail(false)
								setRun((n) => n + 1)
							}}
						>
							Load
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={() => {
								setFail(true)
								setRun((n) => n + 1)
							}}
						>
							Load and fail
						</Button>
					</div>
					<Panels
						fail={fail}
						run={run}
					/>
				</div>
			</QueryProvider>
		</ExampleQueryClient>
	)
}
