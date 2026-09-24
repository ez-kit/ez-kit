import { badgeCellType } from './cell-types/BadgeCell'
import { booleanCellType } from './cell-types/BooleanCell'
import { dateCellType } from './cell-types/DateCell'
import { imageCellType } from './cell-types/ImageCell'
import { linkCellType } from './cell-types/LinkCell'
import { numberCellType } from './cell-types/NumberCell'
import { progressCellType } from './cell-types/ProgressCell'
import { selectCellType } from './cell-types/SelectCell'
import { textCellType } from './cell-types/TextCell'

import type { BaseCellTypes, CellTypeContractOf, CellTypeRegistry } from '@ez-kit/data-grid-react'

/**
 * This kit's cell-type registry — the nine ids `createDataGrid` mounts by default.
 *
 * Composed from the per-type entries rather than written out here: each cell file exports its own
 * `<id>CellType`, so a consumer can register just the types it uses without the other eight (and
 * everything they import) coming along. What this object resolves to is unchanged by that.
 */
export const cellTypes = {
	text: textCellType,
	number: numberCellType,
	boolean: booleanCellType,
	date: dateCellType,
	select: selectCellType,
	badge: badgeCellType,
	image: imageCellType,
	link: linkCellType,
	progress: progressCellType,
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
