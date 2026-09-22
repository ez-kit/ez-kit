import { PageSizer } from './page-sizer'
import { Pagination } from './pagination'

import type { CSSProperties, ReactNode } from 'react'

export type DataGridBottomBarProps = {
	/**
	 * Replaces the bar's contents wholesale. Omit it and the bar renders the page controls it
	 * holds in the default layout — the size selector and the pagination controls.
	 *
	 * Same contract as {@link Toolbar}'s `children`, and for the same reason: a bar asked for
	 * explicitly is a bar whose contents the caller may state.
	 */
	children?: ReactNode
	/** Class for the bar element, handed through as-is. */
	className?: string | undefined
	/** Inline style for the bar element, handed through as-is. */
	style?: CSSProperties | undefined
}

/**
 * The strip below the table — the grid's own bottom region, opposite {@link Toolbar}.
 *
 * It is a container, not a pagination control: what it holds is whatever it is given. The case
 * it exists for is a page sizer sharing one line with the page controls — `BottomBarLayout` is
 * that arrangement — and a grid composing its own layout may mount it with anything.
 *
 * Not `Footer`: that name is the `<tfoot>` counterpart of `<DataGrid.Header>`, built from each
 * column's `footer`. This element is a region of the grid's shell, outside the table.
 *
 * The element carries `data-slot='bottom-bar'` and no styling of its own, per the
 * no-styles-in-this-package rule — both kits' stylesheets lay the row out off that slot.
 */
export function BottomBar({ children, className, style }: DataGridBottomBarProps = {}) {
	return (
		<div
			data-slot='bottom-bar'
			className={className}
			style={style}
		>
			{children ?? (
				<>
					<PageSizer />
					<Pagination />
				</>
			)}
		</div>
	)
}
