---
'@ez-kit/form-react': patch
---

`SchemaForm` no longer resolves a custom field kind or a block component named after an
`Object.prototype` member (`toString`, `constructor`, …). Such a document now fails with the same
error as any unregistered kind instead of rendering the prototype function.
