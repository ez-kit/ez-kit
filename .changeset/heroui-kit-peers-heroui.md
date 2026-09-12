---
'@ez-kit/data-grid-heroui': minor
---

Declare `@heroui/react` and `@heroui/styles` as **peer** dependencies instead of bundling them.

HeroUI v3 is built on React Aria, whose components talk to each other through React context, and
this kit's `styles.css` `@import`s `@heroui/styles`. As direct dependencies, a consumer who already
had HeroUI could end up with a second, differently versioned copy — a second set of contexts, and
HeroUI's whole stylesheet emitted twice. `@ez-kit/form-heroui` already declared them as peers; this
brings the data-grid kit in line.

**Breaking (install only):** install HeroUI alongside the kit —
`pnpm add @ez-kit/data-grid-heroui @heroui/react @heroui/styles`. pnpm and npm resolve peers
automatically, so most consumers need no change.
