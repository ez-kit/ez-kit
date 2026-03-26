# @ez-kit/zu-store

A reusable utility package for ez-kit.

## Install

```bash
pnpm add @ez-kit/zu-store
```

## Usage

```ts
import { createContextStore } from '@ez-kit/zu-store'
import { createStore } from 'zustand'

const counterStore = createContextStore(({ count = 0 }: { count?: number }) =>
	createStore<{ count: number }>()(() => ({ count })),
)
```
