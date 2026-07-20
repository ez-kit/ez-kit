/**
 * Compile-time assertions. These run as a trivial vitest suite, but the real
 * check is `pnpm typecheck` — every `@ts-expect-error` below fails the build if
 * the expression it guards stops being an error.
 */
import { describe, expect, it } from 'vitest'

import { twc } from './twc'

import type { VariantProps } from './types'
import type { ComponentPropsWithoutRef, JSX } from 'react'

/** Asserts — at compile time — that `value` is assignable to `TExpected`. */
function expectType<TExpected>(value: TExpected): TExpected {
	return value
}

const buttonConfig = {
	base: 'rounded',
	variants: {
		intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
		size: { sm: 'text-sm', lg: 'text-lg' },
	},
	defaultVariants: { intent: 'primary', size: 'sm' },
} as const

describe('VariantProps', () => {
	it('makes defaulted groups optional and infers literal values', () => {
		type ButtonVariants = VariantProps<typeof buttonConfig>

		expectType<ButtonVariants>({})
		expectType<ButtonVariants>({ intent: 'ghost', size: 'lg' })
		// @ts-expect-error 'huge' is not one of the declared `size` values.
		expectType<ButtonVariants>({ size: 'huge' })

		expect(true).toBe(true)
	})

	it('keeps an undefaulted group required', () => {
		type Variants = VariantProps<{ variants: { size: { sm: 'text-sm'; lg: 'text-lg' } } }>

		expectType<Variants>({ size: 'sm' })
		// @ts-expect-error `size` has no default, so it must be chosen explicitly.
		expectType<Variants>({})

		expect(true).toBe(true)
	})
})

describe('twc.<tag>', () => {
	it('accepts variant props, intrinsic props and a matching ref', () => {
		const Button = twc.button(buttonConfig, 'Button')

		expectType<JSX.Element>(
			<Button
				intent='ghost'
				size='lg'
				type='submit'
				onClick={() => undefined}
				className='px-2'
			/>,
		)

		expect(true).toBe(true)
	})

	it('rejects unknown variant values and unknown props', () => {
		const Button = twc.button(buttonConfig)

		// @ts-expect-error 'huge' is not one of the declared `size` values.
		expectType<JSX.Element>(<Button size='huge' />)
		// @ts-expect-error `href` is not a prop of <button>.
		expectType<JSX.Element>(<Button href='/docs' />)

		expect(true).toBe(true)
	})

	it('rejects a variant value that is not part of the config', () => {
		// @ts-expect-error `defaultVariants` may only name declared variant values.
		twc.button({ variants: { size: { sm: 'text-sm' } }, defaultVariants: { size: 'lg' } })

		expect(true).toBe(true)
	})
})

describe('twc(Component, …)', () => {
	// The anchors below receive their content through the spread `props.children`.
	/* eslint-disable jsx-a11y/anchor-has-content */
	function Styled(props: ComponentPropsWithoutRef<'a'>) {
		return <a {...props} />
	}

	function Unstyled(props: { href: string }) {
		return <a {...props} />
	}

	function RequiredProps(props: ComponentPropsWithoutRef<'a'> & { count: number }) {
		return <a {...props} />
	}
	/* eslint-enable jsx-a11y/anchor-has-content */

	it('accepts a component that takes className', () => {
		const Link = twc(Styled, { base: 'underline' }, 'Link')

		expectType<JSX.Element>(<Link href='/docs' />)

		expect(true).toBe(true)
	})

	it('rejects a component that does not take className', () => {
		// @ts-expect-error the wrapped component must accept `className`.
		twc(Unstyled, { base: 'underline' })

		expect(true).toBe(true)
	})

	it('accepts a component with required props and keeps them required', () => {
		const Counted = twc(RequiredProps, { base: 'underline' }, 'Counted')

		expectType<JSX.Element>(
			<Counted
				href='/docs'
				count={3}
			/>,
		)
		// @ts-expect-error `count` is a required prop of the wrapped component.
		expectType<JSX.Element>(<Counted href='/docs' />)

		expect(true).toBe(true)
	})
})
