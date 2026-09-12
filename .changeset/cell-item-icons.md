---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

`select` and `badge` items take an `icon` — any element the kit draws before the label
(`{ value: 'done', label: 'Done', icon: <CircleCheck /> }`). It is the consumer's own element, not a
name from a set the grid owns, so the glyph comes from whatever icon library the application
already uses; core types it as `unknown` because core renders nothing and must not name a
framework's node type.

The same items feed the column's filter list, so one item states the icon once and the cell, the
select and the faceted filter all draw it. Status/priority columns of the kind every issue tracker
has no longer need a custom `cell.component`.
