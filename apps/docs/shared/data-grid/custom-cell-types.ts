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
	UserCellInput,
	UserCellView,
} from './custom-cell-renderers'

import type { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'

/**
 * The custom cell types the docs register, in one place — both kit bundles extend from this
 * object rather than restating it, so the two can no longer disagree.
 *
 * Each goes through `defineCellType`, which is what records the config the type accepts. None
 * of these take one, so `cell: { type: 'rating', config: … }` is a compile error rather than
 * an unchecked bag.
 */
export const customCellTypes = {
	rating: defineCellType()({ view: RatingCellView, edit: RatingCellInput }),
	color: defineCellType()({ view: ColorCellView, edit: ColorCellInput }),
	completion: defineCellType()({ view: CompletionCellView, edit: CompletionCellInput }),
	currency: defineCellType()({ view: CurrencyCellView, edit: CurrencyCellInput }),
	user: defineCellType()({ view: UserCellView, edit: UserCellInput }),
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
