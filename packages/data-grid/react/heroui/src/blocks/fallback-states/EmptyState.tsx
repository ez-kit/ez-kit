import type { EmptyStateProps } from '@ez-kit/data-grid-react'

export function EmptyState(_props: EmptyStateProps) {
	return (
		<div className='dg-empty-state flex flex-col items-center justify-center gap-2 py-12 px-4 min-h-[300px] w-full text-center'>
			<svg
				xmlns='http://www.w3.org/2000/svg'
				width='32'
				height='32'
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='1.5'
				strokeLinecap='round'
				strokeLinejoin='round'
				aria-hidden='true'
			>
				<ellipse cx='12' cy='5' rx='9' ry='3' />
				<path d='M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5' />
				<path d='M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3' />
			</svg>
			<p className='text-sm font-medium'>No data</p>
			<p className='text-xs'>Add a row to get started.</p>
		</div>
	)
}
