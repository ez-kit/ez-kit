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

`form.Array` is the headless counterpart of `form.ArrayField`: same engine, same scope handed to
`children`, but it draws no frame, no label and no add control of its own — it renders exactly
what the render prop returns. Reach for it when the kit's own chrome doesn't fit the layout (rows
in a table, a remove control folded into a card heading, and so on):

```tsx
<form.Array
	name='people'
	newItem={{ firstName: '' }}
>
	{({ items, add }) => (
		<>
			{items.map((item, index) => (
				<item.Item
					key={item.key}
					label={`Person ${index + 1}`}
				>
					<item.TextField
						name='firstName'
						label='Name'
					/>
				</item.Item>
			))}
			<button
				type='button'
				onClick={add}
			>
				Add person
			</button>
		</>
	)}
</form.Array>
```

`item.Item` works the same way inside the primitive — there's just no array-level `itemLabel` /
`removeLabel` / `reorderable` to fall back to, so `Item` takes its own `label`, `removeLabel` and
`reorderable` directly. The scope's `disabled` and `required` mirror the props given to `Array` (or
`ArrayField`) as plain data, since a bare primitive has no frame of its own to render them on;
likewise `errors` and `invalid` carry the list's own validation failures, but **nothing renders
them for you** — a `minLength` failure still blocks submit even when the render prop doesn't read
`errors`. https://ez-kit-docs.vercel.app/docs/form/arrays calls this out at length.

**The item type is read from `name`.** `ArrayProps` and `ArrayFieldProps` are generic over the
array path (`<TFormData, TName extends ArrayKeys<TFormData>>`) rather than over the item, so `name`
is the inference site and `newItem`, `children` and the scope are resolved from the value at that
path. An inline `newItem` therefore needs no annotation even when a key of the item is itself an
array, and a `newItem` that does not match reports on **`newItem`**, naming the item type and the
key at fault. A `newItem` missing a key of the item is now a compile error rather than an
uncontrolled input on the new row. `@ez-kit/form-core` exports `ArrayKeys` and `ArrayItemOf`, the
two helpers the schema side already used, so a kit or app can spell the same thing. Type-level
only — no runtime change — but code that wrote the type arguments explicitly
(`ArrayProps<Values, Person>`) becomes `ArrayProps<Values, 'people'>`.

**Breaking for a kit outside this repo.** The array frame is a new kit slot, `ArrayField`, which carries
its entry view as `ArrayField.Item`; a kit that checks itself with `satisfies AllFormFieldSlots` must
implement both. The shadcn and HeroUI kits already do. `form.Array` adds no further slot — it reuses
the same two. The scope hands out no button: a custom layout renders its own controls and calls
`add`, `remove` and `move`.

Two behavioural fixes come with it, both from the same root cause — the traversal that decides
what a schema owns now follows paths instead of top-level keys:

- `stripHiddenValues` now strips a hidden field addressed by a dotted path (`company.inn`) out
  of its parent object. It previously left it in place, and the value reached `onSubmit`.
- `minLength` / `maxLength` now apply to an **empty** list. A `minLength: 1` used to pass on
  `[]`, which is the one case the option exists for; the same fix makes it work on an empty
  multi-select.
