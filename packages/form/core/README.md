# @ez-kit/form-core

Framework-agnostic core for the `@ez-kit/form-*` packages, built on
[TanStack Form](https://tanstack.com/form).

It holds what neither React nor a specific UI kit owns: the closed set of built-in
field kinds, the shared `SelectOption` shape, and the normalisation of raw validator
errors into display strings.

## Install

```bash
pnpm add @ez-kit/form-core
```

Most consumers do not install this directly — they use a UI-kit package
(`@ez-kit/form-shadcn`, `@ez-kit/form-heroui`), which depends on it transitively.

## API

```ts
import { FormFieldType, formatFieldErrors, hasFieldErrors } from '@ez-kit/form-core'
import type { SelectOption } from '@ez-kit/form-core'
```

- **`FormFieldType`** / **`FORM_FIELD_TYPES`** — the built-in field kinds
  (`text`, `number`, `textarea`, `select`, `checkbox`).
- **`SelectOption<TValue>`** — `{ label, value, disabled? }`, the option shape every
  select-like field consumes.
- **`formatFieldErrors(errors)`** — normalises `field.state.meta.errors` (standard-schema
  issues, `Error` instances, plain strings) into `string[]`, dropping empty slots.
- **`hasFieldErrors(errors)`** — the `invalid` / `aria-invalid` predicate.

Validation itself is pure pass-through of TanStack Form's native standard-schema
validators (zod / valibot / arktype). There is no custom resolver.

## License

MIT
