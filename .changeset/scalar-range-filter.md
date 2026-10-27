---
'@ez-kit/data-grid-core': patch
---

A plain number or date filter no longer throws `TypeError: val is not iterable`. A column without
operators keeps TanStack's `'auto'` filter function, which picks `inNumberRange` for numbers and
`inDateRange` for `Date`s. Both expect a `[min, max]` tuple, but the plain filter control hands
back a single value. Typing into such a filter used to crash the filtered row model, and the grid
stopped rendering rows.

The two registered range functions now read a single value as the range `[value, value]`. A
number column matches that number, a numeric string matches it too, and a date column matches the
instant it names. A tuple still filters as a range, and every other registered filter function is
untouched.
