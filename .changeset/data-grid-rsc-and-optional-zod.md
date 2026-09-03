---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Make the data-grid packages importable from a Next.js App Router server component, and make the
optional `zod` peer genuinely optional.

**`'use client'` now survives the build.** The directive was written on 87 source files, and every
one of them was an _inner_ module — tsup bundles each package into a single file and only keeps a
directive that sits on the **entry**, so not one reached `dist`. Importing `DataGrid` from a server
component therefore failed. `@ez-kit/data-grid-react`, `@ez-kit/data-grid-shadcn` and
`@ez-kit/data-grid-heroui` now carry it on `src/index.ts`. `@ez-kit/data-grid-core` deliberately
stays unmarked: it contains no React, so `createTable` and the operator/cell-type constants remain
usable in server code.

**`zod` is no longer imported by the published types.** `ValidateConfig`'s `{ schema }` shorthand
was typed with `import type { ZodType } from 'zod'`, which the declaration emitter wrote into
`dist/index.d.ts` unconditionally — so a consumer who had not installed the _optional_ peer could
not resolve the package's types at all. The shorthand is now typed by the two members the resolver
actually reads, exported as `ValidationSchema` and `ValidationIssue`. Every zod schema satisfies it
structurally, so `validate: { schema: mySchema }` and `zodResolver(mySchema)` keep type-checking
unchanged — and any validator with the same `safeParse` shape now works too.

**Docs:** the install pages asked for three packages. The kit is the only one to install — it
depends on the other two and re-exports their whole surface.
