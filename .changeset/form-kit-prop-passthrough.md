---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

A built-in field passes every prop it does not bind to the kit's component, flat. `form.<Field>`
keeps `name`, `label`, `description`, `disabled`, `required` and `validate` — plus `options`,
`optionsFrom`, `optionsParams`, `loading`, `searchable`, `creatable` and `createLabel` on the four
option-bearing fields — and everything else reaches the component under its own name:
`<form.TextField name='password' type='password' autoComplete='current-password' maxLength={64} />`.
What a field accepts beyond the binding is read off the parameter of the component registered under
its key, so a kit or an app declares a prop by typing its component and nothing else: under a
`TextField` that declares `variant?: 'flat' | 'bordered'`, `variant='bordered'` compiles and
`variant='outlined'` does not. The props the binding computes — `value`, `onChange`, `onBlur`, `id`,
`name`, `errors`, `invalid`, `required`, the `data-field` attributes, and `options` / `loading` /
`search` on the option-bearing fields — are a compile error on `form.<Field>` and win at runtime when
they arrive anyway. The same holds for an array entry's fields and a group's.

The kits declare what they forward and export it as `<Field>KitProps` (`TextFieldKitProps`,
`SliderFieldKitProps`, …). shadcn forwards the native `<input>` / `<textarea>` attributes of its text
fields and the Radix primitive's props of the checkbox, switch, radio group and slider. HeroUI
forwards the React Aria root's props, which is where React Aria takes an input's attributes, and
puts `placeholder` and `rows` on the input itself. Both declare `placeholder`, `type`, `rows`, `min`,
`max` and `step` wherever they did before, so existing JSX is unchanged.

Breaking: the kit contract no longer carries input attributes. `placeholder`, `type`, `rows`, `min`,
`max` and `step` are gone from the render props (`TextFieldRenderProps` … `DateRangeFieldRenderProps`)
and from the consumer props (`TextFieldProps` … `DateRangeFieldProps`, now the binding props alone).
A third-party kit that read them declares them on its own components —
`(props: TextFieldRenderProps & { placeholder?: string; type?: string }) => …` — and a component that
requires a prop beyond the contract no longer satisfies `FormFieldSlots`. `TextInputType` is no
longer exported from `@ez-kit/form-react` or either kit: write the string, `type='password'` rather
than `type={TextInputType.Password}`. A schema document is unaffected — the renderer still passes a
node's `placeholder`, `rows`, `min`, `max`, `step`, and `inputType` as `type` — but those reach the
kit unchecked. A hand-written `FormInstance<V>` defaults to the contract's own field signatures and so
carries no kit props; name the field set, `FormInstance<V, typeof fields>`, to keep them.
