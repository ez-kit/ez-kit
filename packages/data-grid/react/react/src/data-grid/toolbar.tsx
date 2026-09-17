import { useGridComponents } from '../components-context'

import type { ReactNode } from 'react'

export type DataGridToolbarProps = {
	/**
	 * The toolbar's contents, rendered between the two slots. Use this when the bar is one run
	 * of controls rather than two groups at opposite ends.
	 */
	children?: ReactNode
	/**
	 * Content for the toolbar's leading slot.
	 *
	 * `start` / `end`, not `left` / `right`: the toolbar is a flex row, so its two slots swap
	 * sides under RTL. Same logical vocabulary, for the same reason, as a column's `align`.
	 * Row pinning keeps `top` / `bottom` — a vertical axis has no logical names.
	 */
	start?: ReactNode
	/** Content for the toolbar's trailing slot. */
	end?: ReactNode
	/**
	 * Class for the toolbar element, handed to the kit as-is. The kit merges it with its own, so a
	 * utility that collides with one of the kit's wins — which is what a toolbar re-used as the
	 * header bar of a framed grid needs (no bottom margin, a padding of its own).
	 */
	className?: string | undefined
}

/**
 * The bar above the table — a **container and nothing else**.
 *
 * It mounts no control of its own and reads no grid config. What goes in it is whatever a
 * layout writes: `<DataGrid.Toolbar start={<DataGrid.GlobalFilterInput/>} end={…}/>`. It used
 * to auto-mount seven controls, each gated by an option (`sorting.toolbar`,
 * `visibility.toolbar`, `filtering.toolbar`, `globalFiltering.toolbar`, `pagination.pageSizer`,
 * `filtering.panel`) whose only job was to tell this one component what to render — options
 * that described a layout rather than the grid, and that taxed every new arrangement with a new
 * enum value. The arrangements they bought are now what the JSX says at a glance; see the
 * presets in `../layouts`.
 *
 * With nothing to show — no `children` and neither slot — it renders nothing rather than an
 * empty bar, so a layout can mount it unconditionally.
 */
export function Toolbar({ children, start, end, className }: DataGridToolbarProps = {}) {
	const { Toolbar: ToolbarComponent } = useGridComponents().core

	if (children === undefined && start === undefined && end === undefined) return null

	return (
		<ToolbarComponent
			data-slot='toolbar'
			className={className}
			{...(start !== undefined ? { start } : {})}
			{...(end !== undefined ? { end } : {})}
		>
			{children}
		</ToolbarComponent>
	)
}
