import { render, screen } from '@testing-library/react'
import { createRef, forwardRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { configure, resetRuntimeConfig } from './configure'
import { twc } from './twc'

import type { ComponentPropsWithoutRef } from 'react'

const BUTTON_CONFIG = {
	base: 'rounded px-4',
	variants: {
		intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
		size: { sm: 'text-sm', lg: 'text-lg' },
	},
	defaultVariants: { intent: 'primary', size: 'sm' },
} as const

afterEach(() => {
	resetRuntimeConfig()
})

describe('twc.<tag>', () => {
	it('applies base classes and the default variants', () => {
		const Button = twc.button(BUTTON_CONFIG)

		render(<Button>Go</Button>)

		expect(screen.getByRole('button')).toHaveClass('rounded', 'px-4', 'bg-blue-500', 'text-sm')
	})

	it('applies the selected variant instead of the default', () => {
		const Button = twc.button(BUTTON_CONFIG)

		render(<Button intent='ghost'>Go</Button>)

		const button = screen.getByRole('button')
		expect(button).toHaveClass('bg-transparent')
		expect(button).not.toHaveClass('bg-blue-500')
	})

	it('keeps variant props off the DOM and forwards everything else', () => {
		const Button = twc.button(BUTTON_CONFIG)

		render(
			<Button
				intent='ghost'
				size='lg'
				type='submit'
				id='cta'
				data-testid='button'
				aria-label='Go'
			/>,
		)

		const button = screen.getByTestId('button')
		expect(button).toHaveAttribute('type', 'submit')
		expect(button).toHaveAttribute('id', 'cta')
		expect(button).toHaveAttribute('aria-label', 'Go')
		expect(button).not.toHaveAttribute('intent')
		expect(button).not.toHaveAttribute('size')
	})

	it('applies compound variants when every listed variant matches', () => {
		const Button = twc.button({
			base: 'rounded',
			variants: {
				intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
				size: { sm: 'text-sm', lg: 'text-lg' },
			},
			compoundVariants: [{ intent: 'ghost', size: 'lg', class: 'underline' }],
			defaultVariants: { intent: 'primary', size: 'sm' },
		})

		render(
			<>
				<Button
					intent='ghost'
					size='lg'
					data-testid='match'
				/>
				<Button
					intent='ghost'
					size='sm'
					data-testid='no-match'
				/>
			</>,
		)

		expect(screen.getByTestId('match')).toHaveClass('underline')
		expect(screen.getByTestId('no-match')).not.toHaveClass('underline')
	})

	it('forwards a ref to the underlying element', () => {
		const Button = twc.button(BUTTON_CONFIG)
		const ref = createRef<HTMLButtonElement>()

		render(<Button ref={ref}>Go</Button>)

		expect(ref.current).toBeInstanceOf(HTMLButtonElement)
		expect(ref.current?.tagName).toBe('BUTTON')
	})

	it('derives a display name from the tag when no name is given', () => {
		const Button = twc.button(BUTTON_CONFIG)

		expect(Button.displayName).toBe('twc.button')
	})
})

describe('className merging', () => {
	it('lets an incoming className win over a conflicting generated one', () => {
		const Button = twc.button(BUTTON_CONFIG)

		render(<Button className='px-2'>Go</Button>)

		const button = screen.getByRole('button')
		expect(button).toHaveClass('px-2')
		expect(button).not.toHaveClass('px-4')
	})

	it('keeps non-conflicting incoming classes alongside the generated ones', () => {
		const Button = twc.button(BUTTON_CONFIG)

		render(<Button className='shadow-md'>Go</Button>)

		expect(screen.getByRole('button')).toHaveClass('rounded', 'px-4', 'shadow-md')
	})

	it('plain-joins classes when twMerge is disabled, keeping both conflicting classes', () => {
		configure({ twMerge: false })
		const Button = twc.button(BUTTON_CONFIG)

		render(<Button className='px-2'>Go</Button>)

		expect(screen.getByRole('button')).toHaveClass('px-4', 'px-2')
	})
})

describe('the name attribute', () => {
	it('renders the name into data-component when enabled', () => {
		const Button = twc.button(BUTTON_CONFIG, 'Button')

		render(<Button>Go</Button>)

		expect(screen.getByRole('button')).toHaveAttribute('data-component', 'Button')
	})

	it('uses the name as the display name', () => {
		const Button = twc.button(BUTTON_CONFIG, 'Button')

		expect(Button.displayName).toBe('Button')
	})

	it('omits the attribute entirely when disabled', () => {
		configure({ enabled: false })
		const Button = twc.button(BUTTON_CONFIG, 'Button')

		render(<Button>Go</Button>)

		expect(screen.getByRole('button')).not.toHaveAttribute('data-component')
	})

	it('omits the attribute when no name was given', () => {
		const Button = twc.button(BUTTON_CONFIG)

		render(<Button>Go</Button>)

		expect(screen.getByRole('button')).not.toHaveAttribute('data-component')
	})

	it('honours a custom attribute name', () => {
		configure({ attribute: 'data-twc' })
		const Button = twc.button(BUTTON_CONFIG, 'Button')

		render(<Button>Go</Button>)

		const button = screen.getByRole('button')
		expect(button).toHaveAttribute('data-twc', 'Button')
		expect(button).not.toHaveAttribute('data-component')
	})

	it('reads the config lazily, so configure() after build still applies', () => {
		const Button = twc.button(BUTTON_CONFIG, 'Button')
		configure({ attribute: 'data-late' })

		render(<Button>Go</Button>)

		expect(screen.getByRole('button')).toHaveAttribute('data-late', 'Button')
	})

	it('merges repeated configure() calls over the previous state', () => {
		configure({ attribute: 'data-twc' })
		configure({ twMerge: false })
		const Button = twc.button(BUTTON_CONFIG, 'Button')

		render(<Button className='px-2'>Go</Button>)

		const button = screen.getByRole('button')
		expect(button).toHaveAttribute('data-twc', 'Button')
		expect(button).toHaveClass('px-4', 'px-2')
	})
})

describe('twc(Component, …)', () => {
	const BaseLink = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<'a'> & { external?: boolean }>(
		({ external, ...props }, ref) => (
			// eslint-disable-next-line jsx-a11y/anchor-has-content -- content arrives through the spread `props.children`
			<a
				ref={ref}
				data-external={external ? 'yes' : 'no'}
				{...props}
			/>
		),
	)
	BaseLink.displayName = 'BaseLink'

	it('merges the generated className into the wrapped component', () => {
		const Link = twc(BaseLink, { base: 'underline text-blue-500' }, 'Link')

		render(<Link href='/docs'>Docs</Link>)

		const link = screen.getByRole('link')
		expect(link).toHaveClass('underline', 'text-blue-500')
		expect(link).toHaveAttribute('href', '/docs')
	})

	it('forwards the wrapped component own props and a ref', () => {
		const Link = twc(BaseLink, { base: 'underline' }, 'Link')
		const ref = createRef<HTMLAnchorElement>()

		render(
			<Link
				ref={ref}
				href='/docs'
				external
			>
				Docs
			</Link>,
		)

		expect(ref.current).toBeInstanceOf(HTMLAnchorElement)
		expect(screen.getByRole('link')).toHaveAttribute('data-external', 'yes')
	})

	it('splits variant props out of the wrapped component props', () => {
		const Link = twc(BaseLink, {
			base: 'underline',
			variants: { tone: { muted: 'text-gray-500', loud: 'text-red-500' } },
			defaultVariants: { tone: 'muted' },
		})

		render(
			<Link
				tone='loud'
				href='/docs'
			>
				Docs
			</Link>,
		)

		const link = screen.getByRole('link')
		expect(link).toHaveClass('text-red-500')
		expect(link).not.toHaveAttribute('tone')
	})

	it('renders the name attribute on the wrapped component', () => {
		const Link = twc(BaseLink, { base: 'underline' }, 'Link')

		render(<Link href='/docs'>Docs</Link>)

		expect(screen.getByRole('link')).toHaveAttribute('data-component', 'Link')
	})

	it('derives a display name from the wrapped component when no name is given', () => {
		const Link = twc(BaseLink, { base: 'underline' })

		expect(Link.displayName).toBe('twc(BaseLink)')
	})
})
