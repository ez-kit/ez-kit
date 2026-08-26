import type { FieldState } from '../../features/validation'
import type {
	BadgeCellConfig,
	ColumnRenderer,
	CellDef,
	CellType,
	CellViewCtx,
	ColumnDef,
	DateCellConfig,
	ImageCellConfig,
	InputComponentProps,
	ProgressCellConfig,
	SelectCellConfig,
} from '../types'

type FlexRenderable<TProps, TNode> = ColumnRenderer<TProps, TNode> | (new (props: TProps) => unknown)

type BaseOptions<TRow extends object, TCustom extends string, TNode> = Omit<ColumnDef<TRow, TCustom, TNode>, 'cell'>

type CustomOptions<TRow extends object, TCustom extends string, TNode> = Omit<
	ColumnDef<TRow, TCustom, TNode>,
	'cell' | 'editing' | 'creating'
> & {
	type?: CellType | TCustom
	config?: Record<string, unknown>
	view?: FlexRenderable<CellViewCtx<TRow, unknown>, TNode>
	editing?: false | FlexRenderable<InputComponentProps, TNode>
	creating?: false | FlexRenderable<InputComponentProps, TNode>
}

type BaseColumnHelper<TRow extends object, TCustom extends string, TNode> = {
	text(opts: BaseOptions<TRow, TCustom, TNode>): ColumnDef<TRow, TCustom, TNode>
	number(opts: BaseOptions<TRow, TCustom, TNode>): ColumnDef<TRow, TCustom, TNode>
	date(opts: BaseOptions<TRow, TCustom, TNode> & { config?: DateCellConfig }): ColumnDef<TRow, TCustom, TNode>
	boolean(opts: BaseOptions<TRow, TCustom, TNode>): ColumnDef<TRow, TCustom, TNode>
	link(opts: BaseOptions<TRow, TCustom, TNode>): ColumnDef<TRow, TCustom, TNode>
	select(opts: BaseOptions<TRow, TCustom, TNode> & { config: SelectCellConfig }): ColumnDef<TRow, TCustom, TNode>
	badge(opts: BaseOptions<TRow, TCustom, TNode> & { config: BadgeCellConfig }): ColumnDef<TRow, TCustom, TNode>
	image(opts: BaseOptions<TRow, TCustom, TNode> & { config?: ImageCellConfig }): ColumnDef<TRow, TCustom, TNode>
	progress(opts: BaseOptions<TRow, TCustom, TNode> & { config?: ProgressCellConfig }): ColumnDef<TRow, TCustom, TNode>
	custom(opts: CustomOptions<TRow, TCustom, TNode>): ColumnDef<TRow, TCustom, TNode>
}

type RegisteredTypeHelpers<TRow extends object, TCustom extends string, TNode> = {
	[K in TCustom]: (
		opts: Omit<ColumnDef<TRow, TCustom, TNode>, 'cell'> & { config?: Record<string, unknown> },
	) => ColumnDef<TRow, TCustom, TNode>
}

export type ColumnHelper<TRow extends object, TCustom extends string = never, TNode = unknown> = BaseColumnHelper<
	TRow,
	TCustom,
	TNode
> &
	([TCustom] extends [never] ? object : RegisteredTypeHelpers<TRow, TCustom, TNode>)

/**
 * Contributes a `config` key only when there is one to contribute.
 *
 * Under `exactOptionalPropertyTypes` an explicit `config: undefined` is **not** assignable to
 * the optional `config?:` on `DateCellDef` / `ImageCellDef` / `ProgressCellDef`. It used to
 * compile only because `BasicCellDef` still accepted any string as `type` and absorbed the
 * shape; tightening that arm surfaced the real mismatch.
 */
function withConfig<TConfig>(config: TConfig | undefined): { config?: TConfig } {
	return config !== undefined ? { config } : {}
}

export function createColumnHelper<TRow extends object, TCustom extends string = never, TNode = unknown>(
	customTypes?: TCustom[],
): ColumnHelper<TRow, TCustom, TNode> {
	const base: BaseColumnHelper<TRow, TCustom, TNode> = {
		text: (opts) => ({ ...opts, cell: { type: 'text' } }),
		number: (opts) => ({ ...opts, cell: { type: 'number' } }),
		date: ({ config, ...opts }) => ({ ...opts, cell: { type: 'date', ...withConfig(config) } }),
		boolean: (opts) => ({ ...opts, cell: { type: 'boolean' } }),
		link: (opts) => ({ ...opts, cell: { type: 'link' } }),
		select: ({ config, ...opts }) => ({ ...opts, cell: { type: 'select', config } }),
		badge: ({ config, ...opts }) => ({ ...opts, cell: { type: 'badge', config } }),
		image: ({ config, ...opts }) => ({ ...opts, cell: { type: 'image', ...withConfig(config) } }),
		progress: ({ config, ...opts }) => ({ ...opts, cell: { type: 'progress', ...withConfig(config) } }),

		custom: ({ type, config, view, editing, creating, ...rest }) => {
			const result: ColumnDef<TRow, TCustom, TNode> = { ...rest }

			if (type != null || view != null || config != null) {
				// CellDef is a discriminated union; custom() is the intentionally loose escape hatch
				result.cell = {
					type,
					...withConfig(config),
					component: view as ColumnRenderer<CellViewCtx<TRow, unknown>, TNode> | undefined,
				} as CellDef<TRow, unknown, TCustom, TNode>
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
		},
	}

	const registered: Record<
		string,
		(
			opts: { config?: Record<string, unknown> } & Omit<ColumnDef<TRow, TCustom, TNode>, 'cell'>,
		) => ColumnDef<TRow, TCustom, TNode>
	> = {}
	for (const typeName of customTypes ?? []) {
		registered[typeName] = ({ config, ...opts }) => ({
			...opts,
			// `TCustom` is still an unresolved type parameter here, so TS defers the
			// `[TCustom] extends [never]` conditional in `CellDef` and cannot see that this
			// literal matches its `CustomCellDef` arm. The runtime shape is exactly that arm.
			cell: { type: typeName, ...withConfig(config) } as CellDef<TRow, unknown, TCustom, TNode>,
		})
	}

	return { ...base, ...registered } as ColumnHelper<TRow, TCustom, TNode>
}
