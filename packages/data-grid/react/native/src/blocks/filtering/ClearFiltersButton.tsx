import type { ClearFiltersButtonComponentProps } from '@ez-kit/data-grid-react'

export function ClearFiltersButton({ disabled, onPress, children, ariaLabel }: ClearFiltersButtonComponentProps) {
	return (
		<button
			type='button'
			data-slot='clear-filters-button'
			aria-label={ariaLabel}
			disabled={disabled}
			onClick={onPress}
			style={{
				border: 'none',
				background: 'transparent',
				cursor: disabled ? 'not-allowed' : 'pointer',
				opacity: disabled ? 0.5 : 1,
				padding: '0.25rem 0.5rem',
			}}
		>
			{children ?? '×'}
		</button>
	)
}
