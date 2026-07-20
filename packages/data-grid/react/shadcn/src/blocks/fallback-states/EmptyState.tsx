import type { EmptyStateProps } from '@ez-kit/data-grid-react'

export function EmptyState(_props: EmptyStateProps) {
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
				<ellipse
					cx='12'
					cy='5'
					rx='9'
					ry='3'
				/>
				<path d='M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5' />
				<path d='M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3' />
			</svg>
			<p style={{ fontSize: '0.875rem', fontWeight: 500 }}>No data</p>
			<p style={{ fontSize: '0.75rem' }}>Add a row to get started.</p>
		</div>
	)
}
