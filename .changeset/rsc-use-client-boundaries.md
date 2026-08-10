---
'@ez-kit/store-core': minor
'@ez-kit/va-store': patch
'@ez-kit/zu-store': patch
---

Mark the React entrypoints as client modules so the packages can be imported from a Next.js App Router server component.

Every entry that touches React now ships a `'use client'` directive: `@ez-kit/zu-store`, `@ez-kit/va-store`, `@ez-kit/va-store/persist`, `@ez-kit/va-store/persist/url/react-router` and `@ez-kit/store-core/cache`. Without it, importing any of them from a server component failed with `createContext is not a function`.

Entries that contain no React are deliberately left unmarked, so they stay usable on the server: `@ez-kit/store-core`, `@ez-kit/va-store/persist/internals`, `@ez-kit/va-store/persist/storage`, `@ez-kit/va-store/persist/url` and `@ez-kit/va-store/persist/validators/zod`.

**Breaking (`@ez-kit/store-core`):** `ServicesProvider` and `useServices` moved from the package root to the new `@ez-kit/store-core/react` subpath. The root entry mixed a React provider with pure helpers (`serializeStoreId`, `serviceKey`, `createServiceRegistry`), so marking it as a client module would have made those helpers unusable in server code. Update imports:

```diff
-import { createServiceRegistry, ServicesProvider } from '@ez-kit/store-core'
+import { createServiceRegistry } from '@ez-kit/store-core'
+import { ServicesProvider } from '@ez-kit/store-core/react'
```

Consumers of `@ez-kit/va-store` are unaffected — `StoreProvider` and the persist plugin resolve the services registry internally.
