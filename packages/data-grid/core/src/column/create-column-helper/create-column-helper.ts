import { BASE_CELL_TYPE_IDS } from '../types'

import type { FieldState } from '../../features/validation'
import type {
	BaseCellTypes,
	CellDef,
	CellTypeRegistryShape,
	CellViewCtx,
	ColumnDef,
	ColumnRenderer,
	ConfigOf,
	InputComponentProps,
} from '../types'

type FlexRenderable<TProps, TNode> = ColumnRenderer<TProps, TNode> | (new (props: TProps) => unknown)

type BaseOptions<TRow extends object, TCellTypes extends CellTypeRegistryShape, TNode> = Omit<
	ColumnDef<TRow, TCellTypes, TNode>,
	'cell'
>

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
 */
type CustomOptions<TRow extends object, TCellTypes extends CellTypeRegistryShape, TNode> = Omit<
	ColumnDef<TRow, TCellTypes, TNode>,
	'cell' | 'editing' | 'creating'
> & {
	type?: string
	config?: Record<string, unknown>
	view?: FlexRenderable<CellViewCtx<TRow, unknown>, TNode>
	editing?: false | FlexRenderable<InputComponentProps, TNode>
	creating?: false | FlexRenderable<InputComponentProps, TNode>
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
		byType[id] = ({ config, ...opts }) =>
			({
				...opts,
				cell: { type: id, ...withConfig(config) },
			}) as ColumnDef<TRow, TCellTypes, TNode>
	}

	const custom = ({ type, config, view, editing, creating, ...rest }: CustomOptions<TRow, TCellTypes, TNode>) => {
		const result: ColumnDef<TRow, TCellTypes, TNode> = { ...rest }

		if (type != null || view != null || config != null) {
			result.cell = {
				type,
				...withConfig(config),
				component: view as ColumnRenderer<CellViewCtx<TRow, unknown>, TNode> | undefined,
			} as unknown as CellDef<TRow, unknown, TCellTypes, TNode>
		}

		if (editing === false) {
			result.editing = false
		} else if (editing != null) {
			result.editing = { component: editing as ColumnRenderer<FieldState, TNode> }
		}

		if (creating === false) {
			result.creating = false
		} else if (creating != null) {
			result.creating = { component: creating as ColumnRenderer<FieldState, TNode> }
		}

		return result
	}

	return { ...byType, custom } as ColumnHelper<TRow, TCellTypes, TNode>
}
