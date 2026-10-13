---
'@ez-kit/form-core': minor
---

A `select` or `multiselect` node's `searchable` also takes an object, `{ debounce?, minLength? }`,
tuning how the typed text reaches the option source; `parseFormSchema` validates both as non-negative
integers. `SearchSettings`, `Searchable`, `isSearchable` and the two default sets are exported.

`format: 'email'` now runs in linear time. Its pattern backtracked quadratically on a long input
with many dots, which made a validator on a public endpoint a denial-of-service target; an address
with an empty domain label (`a@b..c`) is now rejected.
