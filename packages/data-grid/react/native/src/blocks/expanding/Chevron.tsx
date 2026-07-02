import type { ChevronProps } from '@ez-kit/data-grid-react'

export function Chevron({ expanded, onClick, disabled }: ChevronProps) {
	return (
		<button type='button' onClick={onClick} disabled={disabled} aria-label={expanded ? 'Collapse row' : 'Expand row'}>
			{expanded ? '▼' : '▶'}
		</button>
	)
}
