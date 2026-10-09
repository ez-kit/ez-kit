---
'@ez-kit/data-grid-heroui': minor
'@ez-kit/form-heroui': minor
---

Move to HeroUI 3.2

`@heroui/react` and `@heroui/styles` are now `^3.2.6` (peer range `^3.2.0`). From 3.2.3 HeroUI
declares `react-aria`, `react-aria-components`, `@react-aria/ssr`, `@react-aria/utils` and
`@internationalized/date` as **peer** dependencies rather than its own, so an application installs
them alongside `@heroui/react`.

Two things had to change with it. The selection checkbox now renders `Checkbox.Content` around its
control: since 3.2 HeroUI's checkbox root is React Aria's `CheckboxField` and `Content` is its
`CheckboxButton`, which is the element that carries `role="checkbox"` — without it a grid rendered
no checkbox at all. And the form kit's calendar body casts its root, because 3.2 made `Calendar`
generic over its value and selection mode while `RangeCalendar` stayed a plain component.
