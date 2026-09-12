import { defineConfig, devices } from '@playwright/test'

import { KITS } from './e2e/kits'
import { deterministicPort } from './scripts/dev-port.mjs'

import type { Kit } from './e2e/kits'

// The port is the one `pnpm docs:dev` resolves for this worktree (see scripts/dev-port.mjs):
// several worktrees each run their own dev server, and a run here must target the server
// belonging to *this* one. `PW_PORT` overrides it for a pinned run.
const IS_CI = !!process.env.CI
// A CI runner has one checkout and no other server to collide with, so the hashed port buys
// nothing there and a fixed one is easier to read in a log.
const CI_PORT = 3000
const PORT = Number(process.env.PW_PORT ?? (IS_CI ? CI_PORT : deterministicPort()))
const BASE_URL = `http://localhost:${PORT}`

const chrome = devices['Desktop Chrome']

/**
 * One project per kit, over the kit-agnostic specs under `e2e/packages/**`. A spec is written
 * once against the `data-*` contract of `@ez-kit/data-grid-react` and executed once per kit;
 * adding a kit to `e2e/kits.ts` adds a project here and changes no test.
 *
 * `e2e/smoke.spec.ts` rides along in the same projects but is tagged `@smoke`, so the default
 * run skips it — it is hundreds of pages per kit. See the `test:e2e*` scripts.
 */
const kitProjects = KITS.map((kit: Kit) => ({
	name: kit,
	testDir: './e2e',
	// A regex, not a glob: a glob is matched against the whole absolute path, and this app
	// lives under a directory called `docs`, so `docs/**` would ignore every spec there is.
	testIgnore: /e2e\/docs\//,
	use: { ...chrome, kit },
}))

export default defineConfig({
	// Browser specs live in `e2e/`, apart from `test/` — that one is the repo-wide vitest
	// convention (`vitest.shared.ts` collects `test/**`), and two directories a letter apart
	// read as a typo rather than as a boundary.
	testDir: './e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	// In CI the log is the primary output (`line`) and the HTML report is uploaded as an
	// artifact; `open: 'never'` keeps the run from trying to launch a browser at the end.
	reporter: IS_CI ? [['line'], ['html', { open: 'never' }]] : 'html',
	use: {
		baseURL: BASE_URL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			// The docs site itself — page chrome, embed isolation. Nothing kit-agnostic about it,
			// so it runs once rather than once per kit.
			name: 'docs',
			testDir: './e2e/docs',
			use: { ...chrome },
		},
		...kitProjects,
	],
	webServer: {
		// Locally: the dev server, which builds the workspace packages and the shadcn registry
		// before Next starts. In CI: the production server, which the workflow has already built
		// — `next dev` compiles each route on first request, which turns the first test to touch
		// a page into a several-second one and makes a timeout look like a product failure.
		command: IS_CI ? `PORT=${PORT} pnpm start` : `PORT=${PORT} pnpm dev`,
		url: BASE_URL,
		// `next dev` refuses to start a second server for the same project directory, so a
		// running `pnpm docs:dev` must be reused rather than duplicated on another port. In CI
		// nothing is listening yet, and reusing whatever answers that port would hide a server
		// that failed to start.
		reuseExistingServer: !IS_CI,
		timeout: 300_000,
	},
})
