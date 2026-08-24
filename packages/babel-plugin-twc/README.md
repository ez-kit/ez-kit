# @ez-kit/babel-plugin-twc

Fills the optional component-name argument of [`@ez-kit/twc`](../twc#readme) calls from the variable the component is assigned to, so the debug name never has to be written by hand.

```bash
pnpm add -D @ez-kit/babel-plugin-twc
```

`@babel/core >= 7` is a peer dependency.

## Setup

Anywhere Babel already runs, the plugin only has to be named:

```js
// babel.config.js
export default {
	plugins: ['@ez-kit/babel-plugin-twc'],
}
```

### Vite

Babel is not part of Vite's pipeline by default; `@vitejs/plugin-react` is what runs it:

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import twc from '@ez-kit/babel-plugin-twc'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [react({ babel: { plugins: [twc] } })],
})
```

Import the plugin instead of naming it. This package is ESM-only, so the string form leaves its
resolution to Babel's `require`, which fails outside runtimes that support `require(esm)`;
`vite.config.ts` is itself ESM, so the direct import always works.

`@vitejs/plugin-react` transforms `/\.[tj]sx?$/` by default, so components declared in plain
`.ts` files are covered. Widen `include` if yours live somewhere else (`.mdx`, say).

**`@vitejs/plugin-react-swc` cannot run this plugin** — its `plugins` option takes Wasm plugins
for SWC, not Babel ones. Either switch that app to `@vitejs/plugin-react`, or pass the name by
hand: `twc.button({ base: 'px-4' }, 'Button')`.

### webpack

A project with a `babel.config.js` needs nothing beyond the entry above — `babel-loader` picks
it up. Without a config file, put the plugin in the loader options:

```js
// webpack.config.js
module.exports = {
	module: {
		rules: [
			{
				test: /\.[jt]sx?$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						plugins: ['@ez-kit/babel-plugin-twc'],
					},
				},
			},
		],
	},
}
```

The same caveat as Vite applies to `swc-loader` and to Next.js with Turbopack: no Babel pass,
no rewrite.

## What it does

```js
import { twc } from '@ez-kit/twc'

const Button = twc.button({ base: 'px-4' })
const Link = twc(BaseLink, { base: 'underline' })
```

becomes

```js
import { twc } from '@ez-kit/twc'

const Button = twc.button({ base: 'px-4' }, 'Button')
const Link = twc(BaseLink, { base: 'underline' }, 'Link')
```

Whether that name reaches the DOM is decided entirely at runtime by `configure({ enabled })` in `@ez-kit/twc`. The plugin only supplies the string, so it is safe to enable in every build.

## Rules

1. The `twc` binding is resolved through the import from `@ez-kit/twc`, including aliases (`import { twc as x }`). A `twc` from any other module — or a local variable of that name — is ignored.
2. Both call forms are matched: `twc.<tag>(config)` and `twc(Component, config)`.
3. The name is injected only when the call is the initializer of a `const` or `let` declaration, and is taken from that variable.
4. **Idempotent.** A call that already carries a name argument is left untouched, so running the plugin twice changes nothing.

## What it deliberately skips

These forms have no variable name to lift, so the plugin leaves them alone — pass the name by hand if you want one:

```js
export default twc.div({ base: 'px-4' }) // default export
;<Wrapper>{twc.div({})}</Wrapper> // used inline as a JSX child
foo.bar = twc.div({ base: 'px-4' }) // assignment expression
const Button = twc['button']({}) // computed member access
```

A call carrying an extra non-string argument (`twc.button({}, componentName)`) is also left as-is rather than being rewritten into something invalid.
