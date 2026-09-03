---
'@ez-kit/babel-plugin-twc': patch
---

Document Next.js and tsup setup, and correct the Turbopack note.

The README claimed Next.js with Turbopack runs no Babel pass. Since Next.js 16, Turbopack picks up a Babel config file
automatically, so the plugin does work there — with three caveats the README now states: `next/babel` is required in the config, the file must be `babel.config.js` or `.babelrc`
(Next's loader rejects `.cjs`/`.mjs`), and `node_modules` is excluded. A tsup/esbuild recipe is new,
which is the pass a component library needs so names survive into `dist`.
