---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

TanStack Form is now a dependency of `@ez-kit/form-react` rather than a peer of every form package,
so an app gets exactly one copy and no longer installs `@tanstack/react-form` or
`@tanstack/form-core` itself — remove them from your `package.json` unless you use TanStack
elsewhere. The kits depend on `@ez-kit/form-react` alone; the schema-authoring API and `useStore`
are re-exported from it and from each kit.
