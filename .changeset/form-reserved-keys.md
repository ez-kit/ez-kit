---
'@ez-kit/form-react': minor
---

`createForm` rejects a field or component registered under a name the form instance already owns
(`Subscribe`, `state`, `reset`, `Field`, `Submit`, …) or under a name used in both `fields` and
`components` — a type error at the key, and an error thrown by `createForm`. Previously such a key
silently replaced the instance's own member.
