/**
 * Shape of the `variants` map: variant group → variant value → Tailwind classes.
 *
 * ```ts
 * { intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' } }
 * ```
 */
export type VariantShape = Record<string, Record<string, string>>

/**
 * The values a caller may pick for each variant group of `TVariants`.
 * Used both for `defaultVariants` and for the generated component props.
 */
export type VariantSelection<TVariants extends VariantShape> = {
	[TGroup in keyof TVariants]?: keyof TVariants[TGroup] & string
}

/**
 * One `compoundVariants` entry: a partial variant selection plus the classes to
 * apply when every listed variant matches. Either `class` or `className` may be
 * used — matching cva, which accepts one spelling or the other, never both.
 */
export type CompoundVariant<TVariants extends VariantShape> = VariantSelection<TVariants> &
	({ class: string; className?: never } | { className: string; class?: never })

/**
 * The single configuration object accepted by every `twc` call form.
 *
 * `base` maps to cva's first argument; the rest is forwarded to cva verbatim.
 */
export type TwcConfig<
	TVariants extends VariantShape = VariantShape,
	TDefaults extends VariantSelection<TVariants> = VariantSelection<TVariants>,
> = {
	base?: string
	variants?: TVariants
	compoundVariants?: CompoundVariant<TVariants>[]
	defaultVariants?: TDefaults
}

/** A `TwcConfig` with its generics erased — for positions that accept any config. */
export type AnyTwcConfig = TwcConfig<VariantShape, VariantSelection<VariantShape>>

/**
 * Props generated from a `variants` map: a variant group is **optional** when
 * `defaultVariants` provides a fallback for it, and **required** otherwise —
 * an undefaulted group has no class to fall back to, so the caller must choose.
 */
export type VariantPropsOf<TVariants extends VariantShape, TDefaults> = {
	[TGroup in keyof TVariants as TGroup extends keyof TDefaults ? TGroup : never]?: keyof TVariants[TGroup] & string
} & {
	[TGroup in keyof TVariants as TGroup extends keyof TDefaults ? never : TGroup]: keyof TVariants[TGroup] & string
}

/**
 * Public helper: the variant props a config object produces.
 *
 * Left unconstrained on purpose so a `const`-asserted config (readonly, with
 * readonly `compoundVariants` arrays) is accepted as-is. `variants` and
 * `defaultVariants` are matched structurally: a config without `variants`
 * produces no props, and a group missing from `defaultVariants` stays required.
 *
 * ```ts
 * const buttonConfig = { variants: { intent: { primary: '…' } }, defaultVariants: { intent: 'primary' } } as const
 * type ButtonVariants = VariantProps<typeof buttonConfig> // { intent?: 'primary' }
 * ```
 */
export type VariantProps<TConfig> = TConfig extends { variants: infer TVariants extends VariantShape }
	? VariantPropsOf<TVariants, TConfig extends { defaultVariants: infer TDefaults } ? TDefaults : NoDefaults>
	: NoDefaults

/** An empty variant selection — no group has a default. */
type NoDefaults = Record<never, never>

/** Global options read lazily at render time. See {@link configure}. */
export type TwcRuntimeConfig = {
	/** Attribute the component name is rendered into. Default: `data-component`. */
	attribute: string
	/** Whether the name attribute reaches the DOM at all. Default: not in production. */
	enabled: boolean
	/** Whether `tailwind-merge` resolves conflicts between generated and incoming classes. Default: `true`. */
	twMerge: boolean
}

/** Partial override accepted by {@link configure}. */
export type TwcConfigureOptions = Partial<TwcRuntimeConfig>
