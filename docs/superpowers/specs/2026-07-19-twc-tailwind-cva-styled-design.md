# Design: `@ez-kit/twc` — Tailwind + cva styled-components factory

**Date:** 2026-07-19
**Status:** Approved (design), ready for implementation
**Packages:** `@ez-kit/twc` (runtime), `@ez-kit/babel-plugin-twc` (build-time DX)

## Summary

A `styled-components`-flavored factory over **Tailwind + cva**. You declare a
component by binding classes (and cva variants) to an element or another
component:

```ts
import { twc, configure } from '@ez-kit/twc'

const Button = twc.button(
	{
		base: 'px-4 rounded',
		variants: {
			intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
			size: { sm: 'text-sm', lg: 'text-lg' },
		},
		defaultVariants: { intent: 'primary' },
	},
	'Button',
)

// <Button intent="ghost" size="lg" onClick={…} className="px-2" />
```

`cva` is used **under the hood** (not reimplemented). The optional last string
argument is a **component name** that renders into a **dev-only, configurable
`data-*` attribute** for debugging. A companion **babel plugin** auto-fills that
name from the variable name so it never has to be written by hand.

## Naming decisions

- Runtime instance + package: `twc` / `@ez-kit/twc` (TailWind Component).
- Babel plugin package: `@ez-kit/babel-plugin-twc`.
- SWC port is explicitly **out of scope** for this iteration — a future package
  (`@ez-kit/swc-plugin-twc`) with its own spec.

## Package 1 — `@ez-kit/twc` (runtime)

### Public exports

- `twc` — a `Proxy`-based factory (see below).
- `configure(options)` — global configuration.
- Types: `TwcConfig`, `VariantProps`.

### Two call forms

1. **Intrinsic element:** `twc.<tag>(config, name?)`
   - `twc` is a `Proxy`; accessing any tag key (`div`, `button`, `a`, …)
     returns a builder `(config, name?) => Component`.
2. **Wrapping a component:** `twc(Component, config, name?)`
   - `Component` must accept `className?: string` (enforced at the type level).
   - Result props = the wrapped component's props + `VariantProps`.

### Config shape (single object)

```ts
type TwcConfig = {
	base?: string
	variants?: Record<string, Record<string, string>>
	compoundVariants?: Array<Record<string, unknown> & { class?: string; className?: string }>
	defaultVariants?: Record<string, string>
}
```

- `base` maps to cva's first argument; the rest (`variants`,
  `compoundVariants`, `defaultVariants`) are passed straight to
  `cva(base, rest)` producing `variantFn`.

### Runtime behavior of a built component

Built via `forwardRef` (supports React 18 **and** 19). On render:

1. Split incoming props into **variant props** (keys present in `config.variants`)
   and **rest** (everything else → forwarded to the DOM element / wrapped
   component).
2. `className = twMerge(variantFn(variantProps), props.className)` when
   `twMerge` is enabled; otherwise a plain space-join.
3. Render:
   - intrinsic: `<tag {...rest} ref={ref} className={…} {...dataAttr} />`
   - wrapped: `<Component {...rest} ref={ref} className={…} {...dataAttr} />`
4. `dataAttr` = `{ [attribute]: name }` only when `enabled && name`; otherwise
   the attribute is omitted entirely.

### Types

- Builder is generic over the config so `VariantProps` is inferred from
  `variants`. Keys with a matching `defaultVariants` entry become **optional**.
- Intrinsic form props = `JSX.IntrinsicElements[tag]` + `VariantProps<config>`.
- Wrapped form props = `ComponentProps<typeof Component>` + `VariantProps<config>`,
  constrained to `Component extends ComponentType<{ className?: string }>`.
- Honors the repo's `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.

### `configure()` and the data attribute

```ts
configure({
	attribute: 'data-component', // attribute name
	enabled: process.env.NODE_ENV !== 'production', // whether to render the name at all
	twMerge: true, // tailwind-merge on/off
})
```

- Defaults: `attribute: 'data-component'`, `enabled` = `true` only outside
  production, `twMerge: true`.
- Global module-level config, read **lazily at render time**. Only requirement:
  call `configure` before the first render. Repeated calls merge over previous.
- `enabled: false` → attribute never appears in markup (no prod overhead; the
  name string may remain in the bundle but is not in the DOM).
- SSR-safe: the value is deterministic (derives from `NODE_ENV`), so hydration
  does not mismatch.

## Package 2 — `@ez-kit/babel-plugin-twc`

Turns `const Button = twc.button({...})` into
`const Button = twc.button({...}, 'Button')` so the name mirrors the variable
automatically.

### Transform rules

1. Resolve the `twc` binding imported from `@ez-kit/twc` (respects aliasing:
   `import { twc as x }`).
2. Match calls of the form `<binding>.<tag>(...)` **and** `<binding>(Comp, ...)`
   that do **not** already have a trailing string name argument.
3. Only when the call is the initializer of a variable declaration
   (`const X = …` / `let X = …`): append the variable name `X` as a trailing
   string argument.
4. **Idempotent:** if a name was passed by hand, leave it untouched.

### Dev/prod split

The plugin always injects the string (cheap). Whether it reaches the DOM is
decided solely by `configure({ enabled })` at runtime. This keeps
responsibilities separated: plugin = convenience, `configure` = behavior. The
plugin may run in all builds.

### Edge cases (spec'd as "do not break", not "cover 100%")

Skipped (name can still be written by hand):

- `export default twc.div(...)`
- `twc.div(...)` used directly as a JSX child / call argument
- assignment expressions: `foo.bar = twc.div(...)`

## Testing & scaffolding

Both packages follow ez-kit conventions: `src/index.ts`, `tsup` (ESM + `.d.ts`),
`vitest` (jsdom), `size-limit`, `"sideEffects": false`, extend
`tsconfig.base.json`, `--max-warnings=0` lint.

### `@ez-kit/twc`

- Deps: `class-variance-authority`, `tailwind-merge`. Peer: `react >=18`.
- Runtime tests: variant/DOM prop splitting, className merge, ref forwarding,
  component wrapping, `enabled` on/off, custom `attribute`, `twMerge` off.
- Type tests: use the repo's existing type-test approach (confirm `tsd` vs
  inline `@ts-expect-error` before writing).

### `@ez-kit/babel-plugin-twc`

- Deps: `@babel/core`, `@babel/types`.
- Snapshot tests input→output for every rule in Package 2 + idempotency +
  import aliasing + each skipped edge case.

## Docs (README)

- Both call forms, `configure`, variant typing, className merge semantics.
- **Tailwind IntelliSense section**: how to enable class autocomplete inside
  `base` / `variants` strings in VS Code via the **Tailwind CSS IntelliSense**
  extension's `tailwindCSS.experimental.classRegex` in `.vscode/settings.json`.
  Exact regex to be finalized and verified against a real example while writing
  the docs. Starting point:

  ```jsonc
  {
  	"tailwindCSS.experimental.classRegex": [["twc[.\\(][\\s\\S]*?[\"'`]([^\"'`]*)[\"'`]", "[\"'`]([^\"'`]*)[\"'`]"]],
  }
  ```

- Live examples under `apps/docs/shared/examples/twc/<name>.tsx` per the repo's
  flat per-package convention.

## Explicitly out of scope (v1)

- Polymorphism (`as` / `asChild` / Slot).
- SWC plugin port.
- Any global config beyond `attribute` / `enabled` / `twMerge`.
