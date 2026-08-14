---
'@ez-kit/data-grid-react': minor
---

**Breaking:** the page-size selector is now configured through `pagination.pageSizeOptions` instead of the separate `pageSizer` prop, and the `PageSizerConfig` type is gone.

The selector never had state of its own — it reads `pagination.pageSize` and calls `table.setPageSize` — so its option list belonged next to the value it drives. Keeping it apart also made invalid combinations representable (`pagination: false` or `mode: 'infinite'` alongside a `pageSizer`), which the merged option rules out: `pageSizeOptions` is page-based mode only and is ignored under `mode: 'infinite'`.

```diff
-<DataGrid data={data} columns={columns} pagination={{ pageSize: 10 }} pageSizer={{ items: [5, 10, 25] }} />
+<DataGrid data={data} columns={columns} pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 25] }} />
```
