# @ez-kit/styling

Tiny styling helpers for class names and CSS variables.

## Install

```bash
pnpm add @ez-kit/styling
```

## Usage

```ts
import { cssVar, cx } from "@ez-kit/styling"

const classes = cx("btn", { "btn-active": true })
const style = cssVar("brand-color", "tomato")
```
