import type { CSSProperties, ReactNode } from 'react'

const ICON_SIZE = 32

const CONTAINER_STYLE: CSSProperties = {
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
}

const TITLE_STYLE: CSSProperties = { fontSize: '0.875rem', fontWeight: 500 }
const HINT_STYLE: CSSProperties = { fontSize: '0.75rem' }

/** The 32×32 outline shell every placeholder icon shares. Children are raw SVG shapes. */
export function PlaceholderIcon({ children }: { children: ReactNode }) {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width={ICON_SIZE}
			height={ICON_SIZE}
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			strokeWidth='1.5'
			strokeLinecap='round'
			strokeLinejoin='round'
			aria-hidden='true'
		>
			{children}
		</svg>
	)
}

/**
 * Centred icon + title + hint used by every full-height fallback state.
 * `EmptyState` and `NoResultsState` differ only in those three values.
 */
export function StatePlaceholder({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
	return (
		<div style={CONTAINER_STYLE}>
			{icon}
			<p style={TITLE_STYLE}>{title}</p>
			<p style={HINT_STYLE}>{hint}</p>
		</div>
	)
}
