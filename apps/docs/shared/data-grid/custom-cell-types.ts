import { defineCellType } from '@ez-kit/data-grid-react'

import {
	ColorCellInput,
	ColorCellView,
	CompletionCellInput,
	CompletionCellView,
	CurrencyCellInput,
	CurrencyCellView,
	RatingCellInput,
	RatingCellView,
	SizedBadgeView,
	UserCellInput,
	UserCellView,
} from './custom-cell-renderers'

import type { BadgeSize } from './custom-cell-renderers'
import type { BadgeCellConfig, BadgeColumnConfig, baseCellTypes } from '@ez-kit/data-grid-react'

/**
 * The custom cell types the docs register, in one place — both kit bundles extend from this
 * object rather than restating it, so the two can no longer disagree.
 *
 * Each goes through `defineCellType`, which is what records the config the type accepts. The
 * first five take none, so `cell: { type: 'rating', config: … }` is a compile error rather than
 * an unchecked bag.
 *
 * `badge` extends the built-in type rather than adding one: its config is the kit's plus `size`,
 * and it carries only a `view`. Each kit bundle merges it over its own `badge` entry, so the
 * kit's `editing` and `filtering` stay in place.
 */
export const customCellTypes = {
	rating: defineCellType()({ view: RatingCellView, editing: RatingCellInput }),
	color: defineCellType()({ view: ColorCellView, editing: ColorCellInput }),
	completion: defineCellType()({ view: CompletionCellView, editing: CompletionCellInput }),
	currency: defineCellType()({ view: CurrencyCellView, editing: CurrencyCellInput }),
	user: defineCellType()({ view: UserCellView, editing: UserCellInput }),
	badge: defineCellType<BadgeCellConfig & BadgeSize, BadgeColumnConfig & BadgeSize>()({ view: SizedBadgeView }),
}

/**
 * The registry an example's columns are typed against: the kit's base types plus the custom
 * ones above.
 *
 * Examples build their columns with the unbound `createColumns`, because the bound one lives
 * inside a kit bundle that these pages load lazily — importing it here would pull a kit in
 * eagerly and defeat the shadcn/heroui switch. Naming the registry explicitly
 * (`createColumns<Row, CustomCellTypes>`) is the documented way to say which one a call site
 * means when the registry itself arrives at runtime.
 *
 * The **registry**, not its key union: the keys alone cannot carry each type's `cell.config`.
 */
export type CustomCellTypes = typeof baseCellTypes & typeof customCellTypes
