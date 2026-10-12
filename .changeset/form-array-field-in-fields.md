---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

`ArrayField` is now registered with the fields, not the components, and carries its entry view as
`ArrayField.Item`: `fields: { ArrayField: Object.assign(Frame, { Item: Entry }) }`. A kit's
`ArrayField` is a new root export of both `@ez-kit/form-shadcn` and `@ez-kit/form-heroui`, and it
already has its `Item`. Inside an array entry, only field components are scoped to the entry:
`item.Section`, `item.SubmitButton` and `item.GridItem` are gone from the entry scope, which is a
compile break for anyone who wrote them — use `form.Section` and the like around the array
instead.
