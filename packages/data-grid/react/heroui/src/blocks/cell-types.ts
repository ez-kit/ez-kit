import { baseCellTypes } from '@ez-kit/data-grid-react'

import { BadgeCellInput, BadgeCellView } from './cell-types/BadgeCell'
import { BooleanCellInput, BooleanCellView, BooleanFilterInput } from './cell-types/BooleanCell'
import { DateCellInput, DateCellView } from './cell-types/DateCell'
import { ImageCellInput, ImageCellView } from './cell-types/ImageCell'
import { LinkCellInput, LinkCellView } from './cell-types/LinkCell'
import { NumberCellInput, NumberFilterInput } from './cell-types/NumberCell'
import { ProgressCellInput, ProgressCellView } from './cell-types/ProgressCell'
import { SelectCellInput, SelectCellView } from './cell-types/SelectCell'
import { TextCellInput } from './cell-types/TextCell'

import type { BaseCellTypes, CellTypeContractOf, CellTypeRegistry } from '@ez-kit/data-grid-react'

export const cellTypes = {
	text: {
		...baseCellTypes.text,
		editing: TextCellInput,
		filtering: TextCellInput,
	},
	number: {
		...baseCellTypes.number,
		editing: NumberCellInput,
		filtering: NumberFilterInput,
	},
	boolean: {
		...baseCellTypes.boolean,
		view: BooleanCellView,
		editing: BooleanCellInput,
		filtering: BooleanFilterInput,
	},
	date: {
		...baseCellTypes.date,
		view: DateCellView,
		editing: DateCellInput,
		filtering: DateCellInput,
	},
	select: { ...baseCellTypes.select, view: SelectCellView, editing: SelectCellInput, filtering: SelectCellInput },
	badge: { ...baseCellTypes.badge, view: BadgeCellView, editing: BadgeCellInput, filtering: BadgeCellInput },
	image: { ...baseCellTypes.image, view: ImageCellView, editing: ImageCellInput },
	link: { ...baseCellTypes.link, view: LinkCellView, editing: LinkCellInput },
	progress: { ...baseCellTypes.progress, view: ProgressCellView, editing: ProgressCellInput },
} satisfies CellTypeRegistry

/**
 * What a column written through this kit's `createColumns` / `createColumnHelper` is checked
 * against: the ids this kit registers, and the `config` each of them declares.
 *
 * **Declared, not `typeof cellTypes`.** The runtime object carries nine `ComponentType` slots,
 * and the declaration emitter re-prints all of that structurally into the bundled `.d.ts`
 * rather than naming it. Over that blob `CellDef` degenerates to an error type, so a consumer
 * importing from the built package got no checking at all — an unknown `type`, a missing
 * required `config` and a typo inside a known config all compiled, and `cell.component`'s
 * parameter came back as an implicit `any` — while this package's own source tree kept checking
 * correctly. That is why every earlier audit missed it. See `_kitCellTypesMatchRegistry` below
 * for what keeps the declaration honest.
 *
 * This kit registers exactly the contract's nine ids with their configs, so it *is*
 * `BaseCellTypes`. A kit that adds a type intersects (`BaseCellTypes & { rating: { __config?:
 * RatingConfig } }`); one that drops a type omits it (`Omit<BaseCellTypes, 'progress'>`).
 */
export type KitCellTypes = BaseCellTypes

/**
 * Compile-time proof that {@link KitCellTypes} still describes {@link cellTypes} — the same ids,
 * each declaring the same config. Checked in **both** directions, because one alone passes for a
 * type that has drifted: a registry with an extra id still extends the contract, and a contract
 * with an extra id still extends a registry that dropped one.
 *
 * This runs against the source tree, where the registry's type is intact — which is exactly the
 * place the declaration can be verified at all.
 */
type _KitCellTypesMatchRegistry =
	CellTypeContractOf<typeof cellTypes> extends CellTypeContractOf<KitCellTypes>
		? CellTypeContractOf<KitCellTypes> extends CellTypeContractOf<typeof cellTypes>
			? true
			: never
		: never
const _kitCellTypesMatchRegistry: _KitCellTypesMatchRegistry = true
void _kitCellTypesMatchRegistry
