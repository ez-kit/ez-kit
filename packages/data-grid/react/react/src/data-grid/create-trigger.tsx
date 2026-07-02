import { type ReactNode } from 'react'

import { useGridComponents } from '../components-context'

import { useTable } from './table-context'

type CreateTriggerProps = {
	children?: ReactNode
}

/**
 * Button that opens the create form.
 * With `asChild`, injects onClick into the child element (Radix-style).
 */
export function CreateTrigger({ children }: CreateTriggerProps) {
	const table = useTable()
	const { Button } = useGridComponents().core
	const handleClick = (): void => {
		table.creating.start()
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
