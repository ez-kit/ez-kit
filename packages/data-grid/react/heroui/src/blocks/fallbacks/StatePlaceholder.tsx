import type { ReactNode } from 'react'

const ICON_SIZE = 32

const CONTAINER_CLASS = 'flex flex-col items-center justify-center gap-2 py-12 px-4 min-h-[300px] w-full text-center'

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
 * `EmptyState` and `NoResultsState` differ only in those three values plus
 * `hookClass` — the `dg-*` class `global.css` colours them through.
 */
export function StatePlaceholder({
	hookClass,
	icon,
	title,
	hint,
}: {
	hookClass: string
	icon: ReactNode
	title: string
	hint: string
}) {
	return (
		<div className={`${hookClass} ${CONTAINER_CLASS}`}>
			{icon}
			<p className='text-sm font-medium'>{title}</p>
			<p className='text-xs'>{hint}</p>
		</div>
	)
}
