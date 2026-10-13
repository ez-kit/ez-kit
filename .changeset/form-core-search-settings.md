---
'@ez-kit/form-core': minor
---

A `select` or `multiselect` node's `searchable` also takes an object, `{ debounce?, minLength? }`,
tuning how the typed text reaches the option source; `parseFormSchema` validates both as non-negative
integers. `SearchSettings`, `Searchable`, `isSearchable` and the two default sets are exported.
