import { useGridComponents } from '../components-context'
import { COLUMN_VISIBILITY_KEY, PAGE_SIZER_KEY } from '../use-data-grid'

import { ColumnVisibilityTrigger } from './column-visibility-trigger'
import { CreateTrigger } from './create-trigger'
import { PageSizer } from './page-sizer'
import { useTableContext } from './table-context'

import type { ColumnVisibilityUIConfig, PageSizerConfig } from '../use-data-grid'
import type { ReactNode } from 'react'

type ToolbarProps = {
	children?: ReactNode
}

/**
 * Toolbar area above the table.
 * Renders default content when no children are provided:
 * - PageSizer on the left when `pageSizer` is configured
 * - "+ Add" create trigger and column visibility toggle on the right
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

	const pageSizerConfig = (table as unknown as Record<symbol, unknown>)[PAGE_SIZER_KEY] as
		| PageSizerConfig
		| undefined

	if (children) {
		return <ToolbarComponent data-slot='toolbar'>{children}</ToolbarComponent>
	}

	const left = pageSizerConfig ? <PageSizer /> : null
	const right =
		hasCreating || hasVisibilityToolbar ? (
			<>
				{hasCreating && <CreateTrigger />}
				{hasVisibilityToolbar && <ColumnVisibilityTrigger />}
			</>
		) : null

	if (!left && !right) return null

	return (
		<ToolbarComponent
			data-slot='toolbar'
			left={left}
			right={right}
		/>
	)
}
