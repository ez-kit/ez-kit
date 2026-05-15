import type { NoResultsStateProps } from '@ez-kit/data-grid-react'

export function NoResultsState(_props: NoResultsStateProps) {
	return (
		<div className='dg-no-results-state flex flex-col items-center justify-center gap-2 py-12 px-4 min-h-[300px]'>
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
				<circle cx='11' cy='11' r='8' />
				<path d='m21 21-4.35-4.35' />
				<path d='M8 11h6' />
			</svg>
			<p className='text-sm font-medium'>No results</p>
			<p className='text-xs'>Try adjusting your filters.</p>
		</div>
	)
}
