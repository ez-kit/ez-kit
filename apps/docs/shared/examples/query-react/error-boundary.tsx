'use client'

import { Query } from '@ez-kit/query-react'
import { Component, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'

import { ExampleQueryClient } from './_example-client'
import { fetchDevices } from './_fake-api'

import type { ReactNode } from 'react'

type BoundaryProps = { children: ReactNode; fallback: (error: Error, reset: () => void) => ReactNode }
type BoundaryState = { error: Error | null }

class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
	override state: BoundaryState = { error: null }

	static getDerivedStateFromError(error: Error): BoundaryState {
		return { error }
	}

	reset = () => {
		this.setState({ error: null })
	}

	override render() {
		return this.state.error ? this.props.fallback(this.state.error, this.reset) : this.props.children
	}
}

function Devices({ fail }: { fail: boolean }) {
	return (
		<Query
			query={{ queryKey: ['devices', fail], queryFn: () => fetchDevices({ delay: 900, fail }) }}
			loading={
				<div className='flex flex-col gap-2'>
					<Skeleton className='h-4 w-1/3' />
					<Skeleton className='h-4 w-1/2' />
				</div>
			}
		>
			{(devices) => (
				<ul className='text-sm'>
					{devices.map((device) => (
						<li key={device.id}>{device.name}</li>
					))}
				</ul>
			)}
		</Query>
	)
}

export default function ErrorBoundaryExample() {
	const [fail, setFail] = useState(true)

	return (
		<ExampleQueryClient>
			<div className='flex flex-col gap-4'>
				<div className='flex items-center gap-2'>
					<Switch
						id='boundary-fail'
						size='sm'
						checked={fail}
						onCheckedChange={setFail}
					/>
					<Label htmlFor='boundary-fail'>fail requests</Label>
				</div>
				<div className='min-h-24 rounded-xl border p-4'>
					<ErrorBoundary
						fallback={(error, reset) => (
							<Alert variant='destructive'>
								<AlertTitle>Caught by the error boundary</AlertTitle>
								<AlertDescription className='flex flex-col items-start gap-2'>
									<span>{error.message}</span>
									<Button
										variant='outline'
										size='sm'
										onClick={reset}
									>
										Reset boundary
									</Button>
								</AlertDescription>
							</Alert>
						)}
					>
						<Devices fail={fail} />
					</ErrorBoundary>
				</div>
			</div>
		</ExampleQueryClient>
	)
}
