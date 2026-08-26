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

import type { CellTypeRegistry } from '@ez-kit/data-grid-react'

/**
 * The custom cell types the docs register, in one place — both kit bundles extend from this
 * object rather than restating it, so the two can no longer disagree.
 *
 * `satisfies` rather than an annotation: an annotation would widen the keys to `string` and
 * `CustomCellType` below would stop naming anything.
 */
export const customCellTypes = {
	rating: { view: RatingCellView, edit: RatingCellInput },
	color: { view: ColorCellView, edit: ColorCellInput },
	completion: { view: CompletionCellView, edit: CompletionCellInput },
	currency: { view: CurrencyCellView, edit: CurrencyCellInput },
	user: { view: UserCellView, edit: UserCellInput },
} satisfies CellTypeRegistry

/**
 * The registered keys, as a union.
 *
 * Examples build their columns with the unbound `createColumns`, because the bound one lives
 * inside a kit bundle that these pages load lazily — importing it here would pull a kit in
 * eagerly and defeat the shadcn/heroui switch. Naming the types explicitly
 * (`createColumns<Row, CustomCellType>`) is the documented way to say which registry a call site
 * means when the registry itself arrives at runtime.
 */
export type CustomCellType = keyof typeof customCellTypes
