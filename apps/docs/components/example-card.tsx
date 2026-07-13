import type { ReactNode } from 'react'

export function ExampleShell({ children }: { children: ReactNode }) {
	return <div className='not-prose flex flex-col gap-3'>{children}</div>
}

export function ExampleCard({ view, source }: { view: ReactNode; source: ReactNode }) {
	return (
		<div className='flex flex-col flex-1 border border-fd-border rounded-lg overflow-hidden'>
			<div className='border-b border-fd-border p-2'>{view}</div>
			{source ? <div>{source}</div> : null}
		</div>
	)
}
