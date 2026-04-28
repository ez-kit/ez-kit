import type {
  BadgeCellConfig,
  CellDef,
  CellType,
  CellViewCtx,
  ColumnDef,
  ImageCellConfig,
  InputComponentProps,
  ProgressCellConfig,
  SelectCellConfig,
} from './types'

type FlexRenderable<TProps> = ((props: TProps) => unknown) | (new (props: TProps) => unknown)

type BaseOptions<TRow extends object, TCustom extends string> = Omit<ColumnDef<TRow, TCustom>, 'cell'>

type CustomOptions<TRow extends object, TCustom extends string> =
  Omit<ColumnDef<TRow, TCustom>, 'cell' | 'editing' | 'creating'> & {
    type?: CellType | TCustom
    config?: Record<string, unknown>
    view?: FlexRenderable<CellViewCtx<TRow, unknown>>
    editing?: false | FlexRenderable<InputComponentProps>
    creating?: false | FlexRenderable<InputComponentProps>
  }

type BaseColumnHelper<TRow extends object, TCustom extends string> = {
  text(opts: BaseOptions<TRow, TCustom>): ColumnDef<TRow, TCustom>
  number(opts: BaseOptions<TRow, TCustom>): ColumnDef<TRow, TCustom>
  date(opts: BaseOptions<TRow, TCustom>): ColumnDef<TRow, TCustom>
  boolean(opts: BaseOptions<TRow, TCustom>): ColumnDef<TRow, TCustom>
  link(opts: BaseOptions<TRow, TCustom>): ColumnDef<TRow, TCustom>
  select(opts: BaseOptions<TRow, TCustom> & { config: SelectCellConfig }): ColumnDef<TRow, TCustom>
  badge(opts: BaseOptions<TRow, TCustom> & { config: BadgeCellConfig }): ColumnDef<TRow, TCustom>
  image(opts: BaseOptions<TRow, TCustom> & { config?: ImageCellConfig }): ColumnDef<TRow, TCustom>
  progress(opts: BaseOptions<TRow, TCustom> & { config?: ProgressCellConfig }): ColumnDef<TRow, TCustom>
  custom(opts: CustomOptions<TRow, TCustom>): ColumnDef<TRow, TCustom>
}

type RegisteredTypeHelpers<TRow extends object, TCustom extends string> = {
  [K in TCustom]: (
    opts: Omit<ColumnDef<TRow, TCustom>, 'cell'> & { config?: Record<string, unknown> }
  ) => ColumnDef<TRow, TCustom>
}

export type ColumnHelper<TRow extends object, TCustom extends string = never> =
  BaseColumnHelper<TRow, TCustom> &
  ([TCustom] extends [never] ? object : RegisteredTypeHelpers<TRow, TCustom>)

export function createColumnHelper<TRow extends object, TCustom extends string = never>(
  customTypes?: TCustom[],
): ColumnHelper<TRow, TCustom> {
  const base: BaseColumnHelper<TRow, TCustom> = {
    text:     (opts) => ({ ...opts, cell: { type: 'text' } }),
    number:   (opts) => ({ ...opts, cell: { type: 'number' } }),
    date:     (opts) => ({ ...opts, cell: { type: 'date' } }),
    boolean:  (opts) => ({ ...opts, cell: { type: 'boolean' } }),
    link:     (opts) => ({ ...opts, cell: { type: 'link' } }),
    select:   ({ config, ...opts }) => ({ ...opts, cell: { type: 'select', config } }),
    badge:    ({ config, ...opts }) => ({ ...opts, cell: { type: 'badge', config } }),
    image:    ({ config, ...opts }) => ({ ...opts, cell: { type: 'image', config } }),
    progress: ({ config, ...opts }) => ({ ...opts, cell: { type: 'progress', config } }),

    custom: ({ type, config, view, editing, creating, ...rest }) => {
      const result: ColumnDef<TRow, TCustom> = { ...rest }

      if (type != null || view != null || config != null) {
        // CellDef is a discriminated union; custom() is the intentionally loose escape hatch
        result.cell = {
          type,
          config,
          component: view as ((ctx: CellViewCtx<TRow, unknown>) => unknown) | undefined,
        } as CellDef<TRow, unknown, TCustom>
      }

      if (editing === false) {
        result.editing = false
      } else if (editing != null) {
        result.editing = { component: editing as (props: InputComponentProps) => unknown }
      }

      if (creating === false) {
        result.creating = false
      } else if (creating != null) {
        result.creating = { component: creating as (props: InputComponentProps) => unknown }
      }

      return result
    },
  }

  const registered: Record<string, (opts: { config?: Record<string, unknown> } & Omit<ColumnDef<TRow, TCustom>, 'cell'>) => ColumnDef<TRow, TCustom>> = {}
  for (const typeName of customTypes ?? []) {
    registered[typeName] = ({ config, ...opts }) => ({
      ...opts,
      cell: { type: typeName, config } as CellDef<TRow, unknown, TCustom>,
    })
  }

  return { ...base, ...registered } as ColumnHelper<TRow, TCustom>
}
