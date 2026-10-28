---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Add `createSchemaForm`: the same options as `createForm`, returning the same bundle plus
`SchemaForm`. `createForm` no longer returns `SchemaForm` and no longer pulls in the schema
renderer, so an app that writes its forms in JSX does not ship it. Replace
`const { SchemaForm } = createForm(options)` with `createSchemaForm(options)`; fields registered
there resolve from JSX and from a document exactly as before.
