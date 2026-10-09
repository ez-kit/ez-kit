---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

A schema now carries its own value type, so `FormRenderer`'s `onSubmit` no longer needs
`defaultValues` to type `value`.

```tsx
const schema = defineFormSchema<Order>()({
	version: 1,
	children: [{ type: FormFieldType.Text, name: 'email' }],
})

// before: `value` was `unknown` here — only `defaultValues` could pin it
// after:  `value` is `Order`
<FormRenderer schema={schema} onSubmit={({ value }) => save(value)} />
```

`TValues` appeared in a node only inside `DeepKeysOfType<TValues, …>`, a conditional type no
inference can run backwards through: from `name: 'email'` TypeScript cannot ask which object
produces that union, so it fell back to `unknown`. `defaultValues` was the only ordinary-position
occurrence anywhere nearby, which made it the sole inference site — and a backend-delivered
document, the case where the schema is the only thing that knows the shape, is exactly the case
with no `defaultValues` to state it with.

`FormSchema` gained an optional, type-only `__values` marker and `defineFormSchema` re-attaches it
on the way out. It is never written and never read at runtime: `defineFormSchema` still returns its
argument by identity, so the property exists in the type and in no object, and nothing new is
serialised back to a backend. The same trick as `defineFieldType`'s `__props` / `__value`.
`parseFormSchema<Order>(json)` carries the type the same way.

Nothing is required of you: a hand-built or unannotated schema stays assignable and behaves exactly
as before. The one way this can surface is as a **new** type error where `defaultValues` and the
schema disagreed — previously `unknown` masked the mismatch, and it is now reported at the call
site.
