---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

**Breaking:** the `link` cell type takes a config, and no longer forces a new tab.

It was the one cell type of nine with no config: the anchor's text was always the raw URL and the
target was always `_blank`. "Customer name, linking to `/customers/:id`, in this tab" — the
ordinary case — had to abandon the cell type and write a `cell.component`.

```ts
{ accessorKey: 'customerId', cell: { type: 'link', config: { href: '/customers/{value}', label: 'Open' } } }
```

`LinkCellConfig` carries `label` (fixed anchor text), `href` (a URL template whose `{value}` token
is replaced by the URL-encoded cell value — the token is required by the type, so a template that
would point every row at the same page does not compile) and `target`. All plain values, no
callbacks: a cell type's config lives in the kit's row-agnostic registry, so a callback declared
there would arrive with `row: unknown` and every call site would open with a cast. Anchor text or a
URL built from **another field** belongs in `cell.component`, which sees the row's real type.

**The default target is now `'_self'`** — a grid links inside its own app far more often than out
of it. Pass `target: '_blank'` to restore the old behaviour; `rel="noreferrer"` is still applied
whenever the target is `_blank`.
