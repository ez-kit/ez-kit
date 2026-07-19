import { cva } from 'class-variance-authority'
import { createElement, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

import { getRuntimeConfig } from './configure'

import type { AnyTwcConfig, CompoundVariant, TwcConfig, VariantPropsOf, VariantSelection, VariantShape } from './types'
import type { ComponentPropsWithoutRef, ComponentRef, ComponentType, JSX, Ref } from 'react'

/** Separator used when `twMerge` is disabled and classes are plain-joined. */
const CLASS_SEPARATOR = ' '

/** Stand-in name for a wrapped target that exposes neither `displayName` nor `name`. */
const ANONYMOUS_TARGET = 'Component'

/**
 * `then` makes any object a thenable: `await`-ing or resolving a promise with
 * `twc` would call it and hang forever. It is not an intrinsic tag, and it is
 * not on `Function.prototype`, so it has to be excluded by name.
 */
const THENABLE_KEY = 'then'

/** An empty variants map — the inferred default when a config declares none. */
type NoVariants = Record<never, never>

/**
 * The minimum a wrapped component's props must declare. Note this constrains
 * the component's **own props**, not the component itself — a component with
 * required props (`next/link` needs `href`) is perfectly wrappable.
 */
type StyleableProps = { className?: string | undefined }

/** The element a built component renders: an intrinsic tag or another component. */
type RenderTarget = string | ComponentType<StyleableProps>

/** Props of a built component: the target's own props, with variant props layered on top. */
type TwcProps<TTargetProps, TVariants extends VariantShape, TDefaults> = Omit<TTargetProps, keyof TVariants> &
	VariantPropsOf<TVariants, TDefaults>

type IntrinsicComponent<
	TTag extends keyof JSX.IntrinsicElements,
	TVariants extends VariantShape,
	TDefaults,
> = TwcComponent<TwcProps<ComponentPropsWithoutRef<TTag>, TVariants, TDefaults>, ComponentRef<TTag>>

/**
 * A wrapped component keeps the props of what it wraps, so `ref` support is
 * inherited: it is present exactly when the wrapped component declares it.
 */
type WrappedComponent<TProps, TVariants extends VariantShape, TDefaults> = ((
	props: TwcProps<TProps, TVariants, TDefaults>,
) => JSX.Element | null) & {
	displayName?: string | undefined
}

/**
 * A component built by `twc`. Declared as a plain call signature (plus the
 * `ref` prop) so it stays assignable in both React 18 and React 19 typings.
 */
type TwcComponent<TProps, TRef> = ((props: TProps & { ref?: Ref<TRef> }) => JSX.Element | null) & {
	displayName?: string | undefined
}

/** The builder returned by `twc.<tag>` — and the shape of the `twc(Component, …)` call. */
type IntrinsicBuilder<TTag extends keyof JSX.IntrinsicElements> = <
	TVariants extends VariantShape = NoVariants,
	TDefaults extends VariantSelection<TVariants> = NoVariants,
>(
	config: TwcConfig<TVariants, TDefaults>,
	name?: string,
) => IntrinsicComponent<TTag, TVariants, TDefaults>

/** `twc(Component, config, name?)` — wraps any component that accepts `className`. */
type WrapComponent = <
	TProps extends StyleableProps,
	TVariants extends VariantShape = NoVariants,
	TDefaults extends VariantSelection<TVariants> = NoVariants,
>(
	component: ComponentType<TProps>,
	config: TwcConfig<TVariants, TDefaults>,
	name?: string,
) => WrappedComponent<TProps, TVariants, TDefaults>

/**
 * The `twc` instance: callable to wrap a component, and indexable by any
 * intrinsic tag (`twc.button`, `twc.div`, …) to build one from scratch.
 */
export type Twc = WrapComponent & {
	[TTag in keyof JSX.IntrinsicElements]: IntrinsicBuilder<TTag>
}

function joinClasses(generated: string, incoming: string | undefined): string {
	return incoming ? `${generated}${CLASS_SEPARATOR}${incoming}` : generated
}

/**
 * Split incoming props into the variant selection cva consumes and the rest,
 * which is forwarded untouched to the render target.
 */
function splitProps(
	props: Record<string, unknown>,
	variantKeys: readonly string[],
): { variantProps: Record<string, unknown>; rest: Record<string, unknown> } {
	const variantProps: Record<string, unknown> = {}
	const rest: Record<string, unknown> = {}

	for (const key of Object.keys(props)) {
		if (variantKeys.includes(key)) {
			variantProps[key] = props[key]
		} else {
			rest[key] = props[key]
		}
	}

	return { variantProps, rest }
}

function resolveDisplayName(target: RenderTarget, name: string | undefined): string {
	if (name) {
		return name
	}

	if (typeof target === 'string') {
		return `twc.${target}`
	}

	// A `forwardRef` target is a plain object, so it carries no function `name`.
	const targetName = target.displayName ?? target.name
	return `twc(${targetName || ANONYMOUS_TARGET})`
}

function createTwcComponent(target: RenderTarget, config: AnyTwcConfig, name: string | undefined): unknown {
	const variants: VariantShape = config.variants ?? {}
	const compoundVariants: CompoundVariant<VariantShape>[] = config.compoundVariants ?? []
	const defaultVariants: VariantSelection<VariantShape> = config.defaultVariants ?? {}
	const variantKeys = Object.keys(variants)

	// cva owns the class-composition logic; `twc` only feeds it and merges the result.
	const variantFn = cva(config.base, { variants, compoundVariants, defaultVariants })

	const Component = forwardRef<unknown, Record<string, unknown>>((props, ref) => {
		const { attribute, enabled, twMerge: mergeEnabled } = getRuntimeConfig()
		const { variantProps, rest } = splitProps(props, variantKeys)

		// The keys were taken from `variants`, so this is exactly cva's selection shape.
		const generated = variantFn(variantProps as Parameters<typeof variantFn>[0])
		const incoming = typeof props.className === 'string' ? props.className : undefined
		const className = mergeEnabled ? twMerge(generated, incoming) : joinClasses(generated, incoming)

		const nameAttribute = enabled && name ? { [attribute]: name } : undefined
		const targetProps: Record<string, unknown> = { ...rest, ...nameAttribute, className, ref }

		return createElement(target as ComponentType<Record<string, unknown>>, targetProps)
	})

	Component.displayName = resolveDisplayName(target, name)

	return Component
}

const wrapComponent: WrapComponent = ((component: ComponentType<StyleableProps>, config: AnyTwcConfig, name?: string) =>
	createTwcComponent(component, config, name)) as WrapComponent

/**
 * styled-components-flavored factory over Tailwind + cva.
 *
 * ```ts
 * const Button = twc.button({ base: 'px-4', variants: { intent: { primary: 'bg-blue-500' } } }, 'Button')
 * const Link = twc(NextLink, { base: 'underline' }, 'Link')
 * ```
 */
export const twc: Twc = new Proxy(wrapComponent, {
	get(target, property, receiver) {
		// Anything the target already answers for — `toString`, `valueOf`, `name`,
		// `bind`, … — must keep its normal meaning, or generic object protocols
		// break on `twc`. No intrinsic tag collides with those names.
		if (typeof property !== 'string' || property === THENABLE_KEY || Reflect.has(target, property)) {
			return Reflect.get(target, property, receiver) as unknown
		}

		return (config: AnyTwcConfig, name?: string) => createTwcComponent(property, config, name)
	},
}) as Twc
