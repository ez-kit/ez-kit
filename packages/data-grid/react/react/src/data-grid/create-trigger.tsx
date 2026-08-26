import { type ReactNode } from 'react'

import { useGridComponents } from '../components-context'

import { useDataGridTable } from './table-context'

export type DataGridCreateTriggerProps = {
	children?: ReactNode
}

/**
 * Button that opens the create form.
 * With `asChild`, injects onClick into the child element (Radix-style).
 */
export function CreateTrigger({ children }: DataGridCreateTriggerProps = {}) {
	const table = useDataGridTable()
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
