---
'@ez-kit/zu-store': minor
'@ez-kit/va-store': minor
---

Re-export `shallowEqual` and the `ControlledConfig` / `ControlledFieldConfig` types from both store packages.

They are declared in `@ez-kit/store-core`, which is an ordinary dependency of these packages rather than a peer, so
under pnpm's strict `node_modules` layout a consumer who installed only `@ez-kit/zu-store` (or `@ez-kit/va-store`)
could not import them. That blocked the recommended fix for a controlled field whose value gets a fresh reference every
render — `controlled: { users: { equals: shallowEqual } }` — and left the public `controlled` option with a type the
consumer could not name. Both are now importable straight from the store package:

```ts
import { createContextStore, shallowEqual } from '@ez-kit/zu-store'
import type { ControlledConfig } from '@ez-kit/zu-store'
```

Additive — `@ez-kit/store-core` keeps exporting them under the same names.
