# @ez-kit/babel-plugin-twc

## 0.1.1

### Patch Changes

- db5c55d: Document Next.js and tsup setup, and correct the Turbopack note.

  The README claimed Next.js with Turbopack runs no Babel pass. Since Next.js 16, Turbopack picks up a Babel config file
  automatically, so the plugin does work there — with three caveats the README now states: `next/babel` is required in the config, the file must be `babel.config.js` or `.babelrc`
  (Next's loader rejects `.cjs`/`.mjs`), and `node_modules` is excluded. A tsup/esbuild recipe is new,
  which is the pass a component library needs so names survive into `dist`.

## 0.1.0

### Minor Changes

- a705688: Add `@ez-kit/twc` and `@ez-kit/babel-plugin-twc`.

  `@ez-kit/twc` is a `styled-components`-flavored factory over Tailwind + cva. A component is declared by binding classes and variants to an element — `twc.button(config, name?)` — or to any component that accepts `className` — `twc(Component, config, name?)`. cva is used under the hood rather than reimplemented: `base` becomes its first argument and `variants` / `compoundVariants` / `defaultVariants` are forwarded verbatim.

  At render time the built component splits variant props (which never reach the DOM) from everything else, merges the generated classes with an incoming `className` through `tailwind-merge`, and forwards its ref to the underlying element (React 18 and 19). Variant props are inferred from the config: a group with an entry in `defaultVariants` is optional, a group without one is required.

  The optional trailing name renders into a dev-only `data-component` attribute. `configure({ attribute, enabled, twMerge })` adjusts all three globally; it is read lazily at render time, and `enabled` defaults to `NODE_ENV !== 'production'` so the value is identical on server and client and hydration cannot mismatch.

  `@ez-kit/babel-plugin-twc` fills that name in from the variable a component is assigned to (`const Button = twc.button({…})` → `twc.button({…}, 'Button')`). It resolves the `twc` binding through the import from `@ez-kit/twc`, including aliases, only rewrites `const` / `let` initializers, and is idempotent — a hand-written name is left untouched.

  Polymorphism (`as` / `asChild` / Slot) and an SWC port are out of scope for this version.
