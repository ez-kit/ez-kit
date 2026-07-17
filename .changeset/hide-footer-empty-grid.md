---
'@ez-kit/data-grid-react': patch
---

Fix: the pagination footer is now hidden entirely on a known-empty grid — a client-side grid with no rows, or a server-paginated grid reporting `rowCount: 0` / `pageCount: 0`. Previously the variants disagreed on the same empty table: `compact` claimed `Page 1` (asserting a page exists) while `simple` showed `0–0 of 0`. A trusted zero total means there is nothing to paginate, so the empty/no-results state now stands alone across all variants. An _unknown_ total (a manual grid given neither count) is unaffected and still renders `Page N`.
