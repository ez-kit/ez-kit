---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Breaking: a form document is now JSX written as data. A block names a component from the bundle's
`components` — the same one JSX reaches as `form.<Name>` — takes its `props` flat under the names
JSX uses, and with `children` is a container. `columns` goes on any container: a block with
children, an `array` (laying out each entry) or the document itself, and the renderer puts the
kit's grid inside it.

| Before                                          | After                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `{ type: 'section', title, columns, children }` | `{ type: 'block', component: 'Section', props: { title }, columns, children }` |
| `{ type: 'submit', label: 'Save' }`             | `{ type: 'block', component: 'SubmitButton', props: { children: 'Save' } }`    |
| `<SchemaForm blocks={{ Banner }} />`            | `createSchemaForm({ components: { Banner } })`                                 |
| block component takes `{ props }`               | block component takes its props flat                                           |
| `{ key: 'x', params }`                          | `{ i18n: 'x', params }`                                                        |
| `parseFormSchema(doc, { blocks })`              | `parseFormSchema(doc, { components })`                                         |
| `components.GridItem`, `form.GridItem`          | `components.Grid` with `Grid.Item`, `form.Grid` / `form.Grid.Item`             |
| `<form.Section columns={2}>`                    | `<form.Section><form.Grid columns={2}>…</form.Grid></form.Section>`            |

`SectionNode`, `SubmitNode`, `BlockRegistry` and `SectionProps.columns` are removed;
`GridProps`, `GridSlot`, `isBlockNode` and `hasChildren` are added. `parseFormSchema` rejects a
`section` or `submit` node naming the block that replaces it, a block naming `Grid` or carrying
`label` / `description` / `disabledWhen`, a `colSpan` whose container sets no `columns` or fewer than it spans, and block `props` that JSON
cannot carry. A
block's top-level `{ i18n }` props are translated through `translate`.
