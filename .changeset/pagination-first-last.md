---
'@ez-kit/data-grid-heroui': patch
---

Render the first/last page buttons under `pagination.variant: 'compact'`. The React layer has always
supplied `onFirstPage` / `onLastPage`, but neither kit's `Pagination` destructured them, so the one
variant that navigates without page links had no way to reach either end. `numbered` already lists
the boundary pages and `simple` deliberately offers only prev/next, so both stay unchanged.
