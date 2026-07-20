# @ez-kit/twc

A `styled-components`-flavored factory over **Tailwind + [cva](https://cva.style)**. Declare a component once by binding classes and variants to an element — or to any component that accepts `className`.

```bash
pnpm add @ez-kit/twc
```

`react >= 18` is a peer dependency. `class-variance-authority` and `tailwind-merge` ship as regular dependencies.

## Quick start

```tsx
import { twc } from '@ez-kit/twc'

const Button = twc.button(
	{
		base: 'rounded px-4 py-2 font-medium',
		variants: {
			intent: { primary: 'bg-blue-500 text-white', ghost: 'bg-transparent text-blue-500' },
			size: { sm: 'text-sm', lg: 'text-lg' },
		},
		defaultVariants: { intent: 'primary', size: 'sm' },
	},
	'Button',
)

;<Button
	intent='ghost'
	size='lg'
	onClick={handleClick}
	className='px-2'
/>
```

The rendered markup:

```html
<button
	class="rounded py-2 font-medium bg-transparent text-blue-500 text-lg px-2"
	data-component="Button"
>
	…
</button>
```

Note `px-2` replaced `px-4` — `tailwind-merge` resolves the conflict in favour of the incoming `className`.

## The two call forms

### `twc.<tag>(config, name?)`

`twc` is a `Proxy`, so any intrinsic tag is a builder: `twc.div`, `twc.button`, `twc.a`, … Props are the tag's own props plus the variant props inferred from `config.variants`.

### `twc(Component, config, name?)`

Wraps any component that accepts `className`:

```tsx
import Link from 'next/link'

const NavLink = twc(Link, { base: 'underline underline-offset-4' }, 'NavLink')

;<NavLink href='/docs'>Docs</NavLink>
```

The wrapped component's own props stay available; the constraint `ComponentType<{ className?: string }>` is enforced at the type level, so wrapping a component that cannot be styled is a compile error.

## The config object

```ts
type TwcConfig = {
	base?: string
	variants?: Record<string, Record<string, string>>
	compoundVariants?: Array<VariantSelection & ({ class: string } | { className: string })>
	defaultVariants?: VariantSelection
}
```

`base` becomes cva's first argument; everything else is forwarded to cva verbatim — the semantics are cva's, not a reimplementation.

```tsx
const Badge = twc.span(
	{
		base: 'inline-flex rounded-full px-2',
		variants: {
			tone: { info: 'bg-blue-100', danger: 'bg-red-100' },
			size: { sm: 'text-xs', md: 'text-sm' },
		},
		compoundVariants: [{ tone: 'danger', size: 'md', class: 'font-semibold' }],
		defaultVariants: { tone: 'info', size: 'sm' },
	},
	'Badge',
)
```

## Prop splitting and className merging

On every render the incoming props are split in two:

- keys present in `config.variants` feed cva and **never reach the DOM**;
- everything else is forwarded to the element or wrapped component untouched.

> **Do not name a variant group after a real prop of the target.** The split is by key alone, so a `size` variant on `twc.input` swallows the native `size` attribute: it is routed to cva instead of the DOM and silently disappears. TypeScript removes the shadowed key from the public props, so a typed caller gets a compile error — but JS callers and generic `{...rest}` spreads lose the attribute with no warning. Watch out for `size`, `color`, `title`, `label`, `target`, `form`, `hidden` and `disabled`.

The final class list is `twMerge(generatedClasses, props.className)`. With `twMerge` disabled the two are plain space-joined instead, so conflicting utilities both survive and the last one in the stylesheet wins.

Refs are forwarded to the underlying element (React 18 and 19 alike):

```tsx
const ref = useRef<HTMLButtonElement>(null)
;<Button ref={ref} />
```

## Variant typing

Variant props are inferred from the config:

- a group listed in `defaultVariants` is **optional** — there is a fallback;
- a group **not** listed there is **required** — there is nothing to fall back to, so the caller has to choose.

```tsx
const Button = twc.button({
	variants: { intent: { primary: '…', ghost: '…' }, size: { sm: '…', lg: '…' } },
	defaultVariants: { intent: 'primary' },
})

;<Button size='lg' /> // ok — intent falls back to 'primary'
;<Button /> // type error — `size` has no default
;<Button size='huge' /> // type error — not a declared value
```

`VariantProps` exposes the same computation for a standalone config object:

```ts
import type { VariantProps } from '@ez-kit/twc'

const buttonConfig = {
	variants: { intent: { primary: '…', ghost: '…' } },
	defaultVariants: { intent: 'primary' },
} as const

type ButtonVariants = VariantProps<typeof buttonConfig> // { intent?: 'primary' | 'ghost' }
```

## `configure()`

```ts
import { configure } from '@ez-kit/twc'

configure({
	attribute: 'data-component', // attribute the component name renders into
	enabled: process.env.NODE_ENV !== 'production', // whether the name reaches the DOM at all
	twMerge: true, // whether tailwind-merge resolves class conflicts
})
```

Those are the defaults. The config is global, read **lazily at render time**, and repeated calls merge over the previous state — so it only has to be set before the first render.

`enabled` derives from `NODE_ENV`, so server and client agree wherever the bundler inlines `process.env.NODE_ENV` into the client build — which every mainstream bundler does. If yours does not (raw ESM in the browser, some edge runtimes), `process` is absent, the client falls back to development, and a production build would render the attribute on the client but not on the server. Pass `enabled` explicitly before the first render to pin it.

With `enabled: false` the attribute never appears in the markup, so the debug affordance costs nothing in production.

## Naming components automatically

Writing the name by hand is optional but repetitive. [`@ez-kit/babel-plugin-twc`](../babel-plugin-twc#readme) fills it in from the variable name:

```js
// babel.config.js
export default { plugins: ['@ez-kit/babel-plugin-twc'] }
```

```tsx
const Button = twc.button({ base: 'px-4' })
// compiles to twc.button({ base: 'px-4' }, 'Button')
```

## Tailwind IntelliSense

Class strings inside `base` / `variants` are just strings, so the **Tailwind CSS IntelliSense** VS Code extension needs to be told where to look. Add this to `.vscode/settings.json`:

```jsonc
{
	"tailwindCSS.experimental.classRegex": [
		// twc.button({ base: '…', variants: { intent: { primary: '…' } } })
		["twc[.(][^)]*", "[\"'`]([^\"'`]*)[\"'`]"],
	],
}
```

The first pattern selects the whole `twc…` call; the second extracts every quoted string inside it, so `base`, each variant value and each `compoundVariants` class get completion and hover previews.

Two known trade-offs of that (deliberately simple) pair:

- it also scans strings that are not classes — variant keys such as `'primary'` and the component name — which the extension simply reports as unknown classes;
- the container pattern stops at the first `)`, so a call whose config contains a nested call gets no completion past that point rather than over-matching the rest of the file.

## Out of scope

Polymorphism (`as` / `asChild` / Slot) and an SWC port are deliberately not part of this version.
