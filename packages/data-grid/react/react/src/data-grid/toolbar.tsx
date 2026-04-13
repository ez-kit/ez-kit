import { useGridComponents } from '../components-context'

import { CreateTrigger } from './create-trigger'
import { useTableContext } from './table-context'

import type { ReactNode } from 'react'

interface ToolbarProps {
	children?: ReactNode
}

/**
 * Toolbar area above the table.
 * If no children are provided and `creating` is configured,
 * renders a default "+ Add" create trigger.
 */
export function Toolbar({ children }: ToolbarProps) {
	const { Toolbar: ToolbarComponent } = useGridComponents()
	const table = useTableContext()
	const hasCreating = Boolean(table.options.creating) && table.options.creating?.mode !== 'pin-row'

	const content = children ?? (hasCreating ? <CreateTrigger /> : null)
	if (!content) return null

	return <ToolbarComponent data-slot='toolbar'>{content}</ToolbarComponent>
}
