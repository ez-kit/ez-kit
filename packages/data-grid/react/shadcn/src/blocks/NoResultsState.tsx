import type { NoResultsStateProps } from '@ez-kit/data-grid-react'

export function NoResultsState(_props: NoResultsStateProps) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '0.5rem',
				padding: '3rem 1rem',
				minHeight: '300px',
				width: '100%',
				textAlign: 'center',
				color: 'var(--muted-foreground)',
			}}
		>
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
			<p style={{ fontSize: '0.875rem', fontWeight: 500 }}>No results</p>
			<p style={{ fontSize: '0.75rem' }}>Try adjusting your filters.</p>
		</div>
	)
}
