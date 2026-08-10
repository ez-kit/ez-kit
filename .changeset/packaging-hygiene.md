---
'@ez-kit/store-core': minor
'@ez-kit/zu-store': patch
'@ez-kit/va-store': patch
---

Packaging hygiene across the three store packages.

- Ship a `LICENSE` file with each package. Only the data-grid packages carried one; these three published without it.
- Replace the placeholder `description` ("A reusable utility package for ez-kit.") on `@ez-kit/zu-store` and `@ez-kit/store-core` — it was what the npm page showed.
- Add a README to `@ez-kit/store-core`, which published with an empty page.
- Tighten the `size-limit` budgets, which were set so loosely they could not fail. The root entries allowed 50 kB against real sizes of 3.4 kB (zu-store) and 4.6 kB (va-store); every entry is now budgeted at roughly its actual size plus 40%, so a doubling gets caught while ordinary edits do not trip CI.

**Breaking (`@ez-kit/store-core`):** the `@ez-kit/store-core/persist` subpath is removed. It exported a single reserved type (`InstanceAdapter`) with no runtime behind it, was referenced nowhere, and only served to publish an empty contract. It will come back when the persist core actually moves into store-core.
