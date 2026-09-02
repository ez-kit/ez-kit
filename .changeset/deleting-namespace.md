---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

**Breaking:** deleting is a namespace on the table, like creating and editing.

`table.creating.commit()`, `table.editing.cancel()` and `table.draft.apply()` were namespaces;
deleting was eight flat methods on the table root, spelling one concept in a second vocabulary and
putting eight names into the completion list for `table.`.

```ts
table.deleteRow(id)        → table.deleting.delete(id)
table.requestDeleteRow(id) → table.deleting.request(id)
table.confirmDeleteRow()   → table.deleting.confirm()
table.cancelDeleteRow()    → table.deleting.cancel()
table.deleteRows(ids)      → table.deleting.bulk.delete(ids)
table.requestBulkDelete()  → table.deleting.bulk.request()
table.confirmBulkDelete()  → table.deleting.bulk.confirm()
table.cancelBulkDelete()   → table.deleting.bulk.cancel()
```

Behaviour is unchanged; only the spelling moves.
