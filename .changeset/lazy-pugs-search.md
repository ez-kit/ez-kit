---
'@ez-kit/store-core': minor
'@ez-kit/zu-store': minor
'@ez-kit/va-store': minor
---

Rename the cached store group's imperative read: `fromCache` → `getFromCache`.

**Breaking.** `fromCache` was the only member of the group named as a prepositional phrase rather than a verb, next to
`remove`, `keys` and `clear`. `getFromCache({ path, id })` states the operation and reads as the imperative counterpart of
the hook, which keeps its name — `useFromCache({ path, id }, selector)`, where `use` already carries the verb. Same shape
as `queryClient.getQueryData` beside `useQuery`.
