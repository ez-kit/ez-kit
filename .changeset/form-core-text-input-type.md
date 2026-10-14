---
'@ez-kit/form-core': minor
---

`TextInputType` is a const object with a union type of the same name rather than an `enum`, so a
schema document may write the string itself — `inputType: 'email'` — with no import.
`TextInputType.Email` still works and is the same value.
