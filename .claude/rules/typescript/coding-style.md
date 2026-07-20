---
paths:
  - '**/*.ts'
  - '**/*.tsx'
  - '**/*.js'
  - '**/*.jsx'
---

# TypeScript/JavaScript Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with TypeScript/JavaScript specific content.

## Types and Interfaces

Use types to make public APIs, shared models, and component props explicit, readable, and reusable.

### Public APIs

- Add parameter and return types to exported functions, shared utilities, and public class methods
- Let TypeScript infer obvious local variable types
- Extract repeated inline object shapes into named types or interfaces

```typescript
// WRONG: Exported function without explicit types
export function formatUser(user) {
	return `${user.firstName} ${user.lastName}`
}

// CORRECT: Explicit types on public APIs
interface User {
	firstName: string
	lastName: string
}

export function formatUser(user: User): string {
	return `${user.firstName} ${user.lastName}`
}
```

### Interfaces vs. Type Aliases

- Use `interface` for object shapes that may be extended or implemented
- Use `type` for unions, intersections, tuples, mapped types, and utility types
- Prefer string literal unions over `enum` unless an `enum` is required for interoperability

```typescript
interface User {
	id: string
	email: string
}

type UserRole = 'admin' | 'member'
type UserWithRole = User & {
	role: UserRole
}
```

### Avoid `any`

- Avoid `any` in application code
- Use `unknown` for external or untrusted input, then narrow it safely
- Use generics when a value's type depends on the caller

```typescript
// WRONG: any removes type safety
function getErrorMessage(error: any) {
	return error.message
}

// CORRECT: unknown forces safe narrowing
function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message
	}

	return 'Unexpected error'
}
```

### React Props

- Define component props with a named `interface` or `type`
- Type callback props explicitly
- Do not use `React.FC` unless there is a specific reason to do so

```typescript
interface User {
  id: string
  email: string
}

interface UserCardProps {
  user: User
  onSelect: (id: string) => void
}

function UserCard({ user, onSelect }: UserCardProps) {
  return <button onClick={() => onSelect(user.id)}>{user.email}</button>
}
```

### JavaScript Files

- In `.js` and `.jsx` files, use JSDoc when types improve clarity and a TypeScript migration is not practical
- Keep JSDoc aligned with runtime behavior

```javascript
/**
 * @param {{ firstName: string, lastName: string }} user
 * @returns {string}
 */
export function formatUser(user) {
	return `${user.firstName} ${user.lastName}`
}
```

## Immutability

Use spread operator for immutable updates:

```typescript
interface User {
	id: string
	name: string
}

// WRONG: Mutation
function updateUser(user: User, name: string): User {
	user.name = name // MUTATION!
	return user
}

// CORRECT: Immutability
function updateUser(user: Readonly<User>, name: string): User {
	return {
		...user,
		name,
	}
}
```

## Error Handling

Use async/await with try-catch and narrow unknown errors safely:

```typescript
interface User {
	id: string
	email: string
}

declare function riskyOperation(userId: string): Promise<User>

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message
	}

	return 'Unexpected error'
}

const logger = {
	error: (message: string, error: unknown) => {
		// Replace with your production logger (for example, pino or winston).
	},
}

async function loadUser(userId: string): Promise<User> {
	try {
		const result = await riskyOperation(userId)
		return result
	} catch (error: unknown) {
		logger.error('Operation failed', error)
		throw new Error(getErrorMessage(error))
	}
}
```

## Input Validation

Use Zod for schema-based validation and infer types from the schema:

```typescript
import { z } from 'zod'

const userSchema = z.object({
	email: z.string().email(),
	age: z.number().int().min(0).max(150),
})

type UserInput = z.infer<typeof userSchema>

const validated: UserInput = userSchema.parse(input)
```

## Console.log

- No `console.log` statements in production code
- Use proper logging libraries instead
- See hooks for automatic detection

## No Magic Values — Constants, Enums, and Lookups (ez-kit)

> Distilled from recurring PR review feedback. Where this conflicts with the general
> "prefer string literal unions over `enum`" guidance above, **this section wins** for
> ez-kit code (project rules override the common default).

### No magic strings or repeated literals

Any string or number literal that carries meaning — or appears more than once — must be a
named constant (`UPPER_SNAKE_CASE`) or an `enum` member. Never inline the bare literal at the
use site. This covers option defaults, serialized forms, separators, mode flags, etc.

```typescript
// WRONG: bare literals scattered across the module
const separator = options.separator ?? ','
stringify: (value) => (value ? 'true' : 'false')

// CORRECT: named constants
const DEFAULT_SEPARATOR = ','
const TRUE = 'true'
const FALSE = 'false'
const separator = options.separator ?? DEFAULT_SEPARATOR
stringify: (value) => (value ? TRUE : FALSE)
```

### Closed sets → `enum`

When a value is one of a small, fixed, named set (history modes, value brands, kinds), model it
as a TS `enum` and reference its members **everywhere** — declarations, comparisons, defaults,
and tests — never the raw string.

```typescript
// WRONG: the same closed set spelled as raw strings in many files
type SearchParamsHistory = 'push' | 'replace'
if (binding.history === 'push') return 'push'

// CORRECT: one enum, referenced by member
export enum SearchParamsHistory {
	Push = 'push',
	Replace = 'replace',
}
if (binding.history === SearchParamsHistory.Push) return SearchParamsHistory.Push
```

Because `enum`s are runtime values, import them as values (not `import type`) and export them with
`export { … }` (not `export type { … }`) under `verbatimModuleSyntax`.

### Lookup map over `switch`

Replace a `switch` that maps a key to a value or factory with a lookup object (`Record<…>`).
It is shorter, data-driven, and trivially extensible.

```typescript
// WRONG: switch as a dispatch table
switch (typeof value) {
	case 'string':
		return paramString()
	case 'number':
		return paramNumber()
}

// CORRECT: lookup map (guard the result — noUncheckedIndexedAccess)
const PRIMITIVE_PARSERS: Partial<Record<string, () => AnyParam>> = {
	string: paramString,
	number: paramNumber,
}
const make = PRIMITIVE_PARSERS[typeof value]
if (make) return make()
```

### Extract pure helpers for repeated transforms

Inline encoding/parsing/formatting logic that is reused — or is conceptually one unit — belongs in
a small pure function. Prefer a native API when it fully covers the case; when it does not, keep the
manual helper and comment _why_ the native one is insufficient.

```typescript
// CORRECT: a named pure helper, with a note on why encodeURIComponent isn't enough
/** encodeURIComponent leaves some separators (e.g. ",") untouched, so we encode them ourselves. */
function percentEncode(value: string): string {
	return Array.from(value)
		.map((char) => '%' + char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
		.join('')
}
```

### Document non-obvious types

Conditional, mapped, or generic types that are not self-explanatory get a short JSDoc explaining
what they resolve to and why — so a reader never has to ask "what is this type?".

```typescript
/**
 * `defaultValue` is optional when the seed has no required fields (`TDefaultValue` includes
 * `undefined`), and required otherwise.
 */
type ProviderProps<TDefaultValue> = undefined extends TDefaultValue
	? { defaultValue?: TDefaultValue }
	: { defaultValue: TDefaultValue }
```
