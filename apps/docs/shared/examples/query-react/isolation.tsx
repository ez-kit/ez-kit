'use client'

import { Query } from '@ez-kit/query-react'
import { queryOptions } from '@tanstack/react-query'
import { RefreshCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { ExampleQueryClient, RenderCount } from './_example-client'
import { fetchDevices, fetchStats } from './_fake-api'

const deviceQueries = {
	list: () => queryOptions({ queryKey: ['devices'], queryFn: () => fetchDevices({ delay: 1200 }) }),
}

const statsQueries = {
	summary: () => queryOptions({ queryKey: ['stats'], queryFn: () => fetchStats({ delay: 600 }) }),
}

function Dashboard() {
	return (
		<div className='flex flex-col gap-3'>
			<div className='flex items-center gap-2 text-xs text-muted-foreground'>
				Dashboard <RenderCount />
			</div>
			<div className='grid gap-3 sm:grid-cols-2'>
				<Card size='sm'>
					<Query
						query={deviceQueries.list()}
						loading={<CardSkeleton />}
					>
						{(devices, q) => (
							<>
								<CardHeader>
									<CardTitle>Devices</CardTitle>
									<CardAction>
										<RefetchButton
											isFetching={q.isFetching}
											onClick={() => void q.refetch()}
										/>
									</CardAction>
								</CardHeader>
								<CardContent className='flex flex-col gap-2'>
									<ul className='text-sm'>
										{devices.map((device) => (
											<li key={device.id}>{device.name}</li>
										))}
									</ul>
									<RenderCount />
								</CardContent>
							</>
						)}
					</Query>
				</Card>
				<Card size='sm'>
					<Query
						query={statsQueries.summary()}
						loading={<CardSkeleton />}
					>
						{(stats, q) => (
							<>
								<CardHeader>
									<CardTitle>Online</CardTitle>
									<CardAction>
										<RefetchButton
											isFetching={q.isFetching}
											onClick={() => void q.refetch()}
										/>
									</CardAction>
								</CardHeader>
								<CardContent className='flex flex-col gap-2'>
									<p className='text-2xl font-semibold tabular-nums'>
										{stats.online} / {stats.total}
									</p>
									<p className='text-xs text-muted-foreground'>checked at {stats.checkedAt}</p>
									<RenderCount />
								</CardContent>
							</>
						)}
					</Query>
				</Card>
			</div>
		</div>
	)
}

function CardSkeleton() {
	return (
		<CardContent className='flex flex-col gap-2'>
			<Skeleton className='h-4 w-24' />
			<Skeleton className='h-4 w-full' />
			<Skeleton className='h-4 w-2/3' />
		</CardContent>
	)
}

function RefetchButton({ isFetching, onClick }: { isFetching: boolean; onClick: () => void }) {
	return (
		<Button
			variant='ghost'
			size='icon-sm'
			aria-label='Refetch'
			disabled={isFetching}
			onClick={onClick}
		>
			<RefreshCwIcon className={isFetching ? 'animate-spin' : undefined} />
		</Button>
	)
}

export default function IsolationExample() {
	return (
		<ExampleQueryClient>
			<Dashboard />
		</ExampleQueryClient>
	)
}
