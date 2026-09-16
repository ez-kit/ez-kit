---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Repeatable field groups, through both authoring paths.

JSX scopes the components to the entry rather than composing a path, so a field inside one is
written `<item.TextField name='firstName' />` and checked against the item's type:

```tsx
<form.ArrayField
	name='people'
	newItem={{ firstName: '' }}
>
	{({ items }) =>
		items.map((item) => (
			<item.Item key={item.key}>
				<item.TextField
					name='firstName'
					label='Name'
				/>
			</item.Item>
		))
	}
</form.ArrayField>
```

A document says the same thing with an `array` node whose `children` are the entry's fields,
named relative to the entry. Nested arrays work on both paths. `defineFormItem` authors an
entry's field set separately, for reuse across forms and across arrays.

Conditions inside an entry use the `./` prefix that `FieldRef` had reserved — `{ field: './kind',
eq: 'vip' }` means _this_ entry's `kind`, while an absolute ref still reaches the form root.

Validation treats the list as a value of its own: `minLength` / `maxLength` count entries, and a
named `rule` receives the whole array, so a cross-item check ("no two people share an email") is
expressible. Such a rule may answer with `{ path, message }` issues that name the offending
entry instead of blaming the list.

**Breaking for a kit outside this repo.** `FormComponents` gains two required slots,
`ArrayField` and `ArrayItem`, so a kit that wrote `satisfies FormComponents` must implement
them. The shadcn and HeroUI kits already do.

Two behavioural fixes come with it, both from the same root cause — the traversal that decides
what a schema owns now follows paths instead of top-level keys:

- `stripHiddenValues` now strips a hidden field addressed by a dotted path (`company.inn`) out
  of its parent object. It previously left it in place, and the value reached `onSubmit`.
- `minLength` / `maxLength` now apply to an **empty** list. A `minLength: 1` used to pass on
  `[]`, which is the one case the option exists for; the same fix makes it work on an empty
  multi-select.
