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

### Next.js

Since **Next.js 16**, Turbopack runs Babel automatically once it finds a Babel config file — SWC
still handles Next's internal transforms, so the Babel pass is additive:

```js
// babel.config.js
module.exports = {
	presets: ['next/babel'],
	plugins: ['@ez-kit/babel-plugin-twc'],
}
```

`next/babel` is required, not optional — it is what teaches Babel TypeScript and JSX syntax, and
without it the first `.tsx` file fails to parse. The file
must be `babel.config.js` or `.babelrc`; Next's Babel loader rejects `.cjs` and `.mjs`. `node_modules`
is excluded, so a component library shipped as a package has to run its own pass at build time
(see tsup below). `next build --webpack` works too, with the usual trade-off that a Babel config
file disables SWC entirely there.

### tsup / esbuild

esbuild has no Babel step; add one through `esbuildPlugins`. Babel only has to **parse** TS and JSX
here — esbuild still strips the types — so `parserOpts` suffices and no preset is needed:

```ts
// tsup.config.ts
import { readFile } from 'node:fs/promises'

import { transformAsync } from '@babel/core'
import twc from '@ez-kit/babel-plugin-twc'
import { defineConfig, type Options } from 'tsup'

const twcPlugin: NonNullable<Options['esbuildPlugins']>[number] = {
	name: 'twc',
	setup(build) {
		build.onLoad({ filter: /\.[jt]sx?$/ }, async ({ path }) => {
			const source = await readFile(path, 'utf8')
			const result = await transformAsync(source, {
				filename: path,
				babelrc: false,
				configFile: false,
				plugins: [twc],
				parserOpts: { plugins: ['typescript', 'jsx'] },
			})
			return result?.code ? { contents: result.code } : null
		})
	},
}

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	esbuildPlugins: [twcPlugin],
})
```

`esbuild-plugin-babel` does the same in one line if you would rather take the dependency. This is
the pass that matters for a component library: names baked in here survive into `dist`, where a
consuming app's Babel step never reaches them.

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

The same caveat as Vite applies to `swc-loader`: no Babel pass, no rewrite.

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
