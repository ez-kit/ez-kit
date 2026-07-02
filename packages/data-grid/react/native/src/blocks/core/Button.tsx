import type { ButtonProps } from '@ez-kit/data-grid-react'

export function Button(props: ButtonProps) {
	return (
		<button
			type='button'
			{...props}
		/>
	)
}
