---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

`ArrayField` is now registered with the fields, not the components, and carries its entry view as
`ArrayField.Item`: `fields: { ArrayField: Object.assign(Frame, { Item: Entry }) }`. A kit's
`ArrayField` export already has its `Item`. Inside an array entry, only field components are scoped
to the entry.
