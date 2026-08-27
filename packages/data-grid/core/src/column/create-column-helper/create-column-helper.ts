import { BASE_CELL_TYPE_IDS } from '../types'

import type {
	BaseCellTypes,
	CellDef,
	CellTypeRegistryShape,
	CellViewCtx,
	ColumnDef,
	ColumnRenderer,
	ConfigOf,
} from '../types'

/**
 * The view renderer slot, spelled exactly as {@link ColumnDef} spells it: `cell.component`.
 *
 * Every builder method takes it — a built-in type and a renderer of your own are not
 * alternatives, and there is deliberately no second name for this slot. `cell.type` and
 * `cell.config` are **not** here: the method owns the type, and the config is its own
 * top-level argument so it can be typed per cell type.
 */
type CellViewOptions<TRow extends object, TNode> = {
	cell?: {
		component?: ColumnRenderer<CellViewCtx<TRow, unknown>, TNode>
	}
}

type BaseOptions<TRow extends object, TCellTypes extends CellTypeRegistryShape, TNode> = Omit<
	ColumnDef<TRow, TCellTypes, TNode>,
	'cell'
> &
	CellViewOptions<TRow, TNode>

/**
 * The `config` argument a generated method takes, in the same three flavours {@link CellDef}
 * derives: required when the declared config has a required field, optional when every field
 * is optional, absent when the type declared no config.
 */
type ConfigArg<TDefinition> = [ConfigOf<TDefinition>] extends [never]
	? { config?: undefined }
	: object extends ConfigOf<TDefinition>
		? { config?: ConfigOf<TDefinition> }
		: { config: ConfigOf<TDefinition> }

/**
 * One builder method per registered cell type, each carrying that type's own config.
 *
 * Generated from the registry rather than written out. The hand-written version had a method
 * per built-in with its config spelled again beside the one in `CellDef`, and gave every
 * *custom* type a method whose `config` was an untyped `Record<string, unknown>` — so the
 * built-ins were checked and the project's own types were not, which is backwards.
 */
type TypeHelpers<TRow extends object, TCellTypes extends CellTypeRegistryShape, TNode> = {
	[TKey in keyof TCellTypes & string]: (
		opts: BaseOptions<TRow, TCellTypes, TNode> & ConfigArg<TCellTypes[TKey]>,
	) => ColumnDef<TRow, TCellTypes, TNode>
}

/**
 * The escape hatch: a column with a renderer of its own, or a cell type the helper cannot know
 * about because it was registered at render time via `<DataGrid cellTypes={…}>` rather than
 * through the factory.
 *
 * `type` and `config` are deliberately unchecked here — that is the whole point of the hatch.
 * A type the helper *does* know gets its own method, with its own config type.
 *
 * Everything else is {@link BaseOptions}: `cell.component`, `editing` and `creating` keep the
 * exact shapes {@link ColumnDef} gives them, so an editor written here is the same editor
 * written there — `editing: { component }` receiving a full `FieldState`, and `description`
 * available. The bare-function `editing` / `creating` / `view` spellings this used to add were
 * a second name for each of those slots, and the bare functions were typed against props they
 * never actually received.
 */
type CustomOptions<TRow extends object, TCellTypes extends CellTypeRegistryShape, TNode> = BaseOptions<
	TRow,
	TCellTypes,
	TNode
> & {
	type?: string
	config?: Record<string, unknown>
}

export type ColumnHelper<
	TRow extends object,
	TCellTypes extends CellTypeRegistryShape = BaseCellTypes,
	TNode = unknown,
> = TypeHelpers<TRow, TCellTypes, TNode> & {
	custom(opts: CustomOptions<TRow, TCellTypes, TNode>): ColumnDef<TRow, TCellTypes, TNode>
}

/**
 * Contributes a `config` key only when there is one to contribute.
 *
 * Under `exactOptionalPropertyTypes` an explicit `config: undefined` is **not** assignable to
 * an optional `config?:`, so an absent config has to stay absent rather than become present
 * and undefined.
 */
function withConfig<TConfig>(config: TConfig | undefined): { config?: TConfig } {
	return config !== undefined ? { config } : {}
}

/**
 * Typed column builder: `createColumn.select({ accessorKey: 'status', config: { items } })`.
 *
 * `cellTypeIds` is what the methods are generated from. Omitted, it is
 * {@link BASE_CELL_TYPE_IDS} — the ids core ships a contract for — which is why the unbound
 * `createColumnHelper<Employee>()` still answers to `.text()` / `.select()` / `.badge()`.
 * A kit's bundle passes its own registry's keys, so `createColumn.rating({ … })` exists exactly
 * when `rating` was registered, with `rating`'s own config type.
 */
export function createColumnHelper<
	TRow extends object,
	TCellTypes extends CellTypeRegistryShape = BaseCellTypes,
	TNode = unknown,
>(cellTypeIds?: readonly (keyof TCellTypes & string)[]): ColumnHelper<TRow, TCellTypes, TNode> {
	const ids: readonly string[] = cellTypeIds ?? BASE_CELL_TYPE_IDS

	const byType: Record<string, (opts: Record<string, unknown>) => ColumnDef<TRow, TCellTypes, TNode>> = {}
	for (const id of ids) {
		byType[id] = ({ config, cell, ...opts }) =>
			({
				...opts,
				cell: { type: id, ...withConfig(config), ...(cell as object | undefined) },
			}) as ColumnDef<TRow, TCellTypes, TNode>
	}

	const custom = ({ type, config, cell, ...rest }: CustomOptions<TRow, TCellTypes, TNode>) => {
		const result: ColumnDef<TRow, TCellTypes, TNode> = { ...rest }

		if (type != null || config != null || cell != null) {
			result.cell = {
				...(type != null ? { type } : {}),
				...withConfig(config),
				...cell,
			} as unknown as CellDef<TRow, unknown, TCellTypes, TNode>
		}

		return result
	}

	return { ...byType, custom } as ColumnHelper<TRow, TCellTypes, TNode>
}
