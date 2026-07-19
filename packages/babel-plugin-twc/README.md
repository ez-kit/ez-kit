# @ez-kit/babel-plugin-twc

Fills the optional component-name argument of [`@ez-kit/twc`](../twc#readme) calls from the variable the component is assigned to, so the debug name never has to be written by hand.

```bash
pnpm add -D @ez-kit/babel-plugin-twc
```

`@babel/core >= 7` is a peer dependency.

## Setup

```js
// babel.config.js
export default {
	plugins: ['@ez-kit/babel-plugin-twc'],
}
```

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
