import { type ReactNode } from 'react'

import { useGridComponents } from '../components-context'

import { useTableContext } from './table-context'

interface CreateTriggerProps {
	children?: ReactNode
}

/**
 * Button that opens the create form.
 * With `asChild`, injects onClick into the child element (Radix-style).
 */
export function CreateTrigger({ children }: CreateTriggerProps) {
	const table = useTableContext()
	const { Button } = useGridComponents()
	const handleClick = (): void => {
		table.startCreating()
	}

	return (
		<Button
			data-slot='create-trigger'
			onClick={handleClick}
		>
			{children ?? '+ Add'}
		</Button>
	)
}
