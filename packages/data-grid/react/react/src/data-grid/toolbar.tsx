import { useGridComponents } from '../components-context'
import { COLUMN_VISIBILITY_KEY } from '../use-data-grid'

import { ColumnVisibilityTrigger } from './column-visibility-trigger'
import { CreateTrigger } from './create-trigger'
import { useTableContext } from './table-context'

import type { ColumnVisibilityUIConfig } from '../use-data-grid'
import type { ReactNode } from 'react'

interface ToolbarProps {
	children?: ReactNode
}

/**
 * Toolbar area above the table.
 * Renders default content when no children are provided:
 * - "+ Add" create trigger when `creating` is configured
 * - Column visibility toggle when `columnVisibility.toolbar` is true
 */
export function Toolbar({ children }: ToolbarProps) {
	const { Toolbar: ToolbarComponent } = useGridComponents()
	const table = useTableContext()
	const hasCreating = Boolean(table.options.creating) && table.options.creating?.mode !== 'pin-row'

	const colVisConfig = (table as unknown as Record<symbol, unknown>)[COLUMN_VISIBILITY_KEY] as
		| boolean
		| ColumnVisibilityUIConfig
		| undefined
	const hasVisibilityToolbar =
		colVisConfig === true || (typeof colVisConfig === 'object' && Boolean(colVisConfig.toolbar))

	const defaultContent =
		hasCreating || hasVisibilityToolbar ? (
			<>
				{hasCreating && <CreateTrigger />}
				{hasVisibilityToolbar && <ColumnVisibilityTrigger />}
			</>
		) : null

	const content = children ?? defaultContent
	if (!content) return null

	return <ToolbarComponent data-slot='toolbar'>{content}</ToolbarComponent>
}
