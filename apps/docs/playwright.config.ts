import { defineConfig, devices } from '@playwright/test'

// Port is env-driven so parallel workers (each in its own git worktree) can each run a
// fully isolated dev server + browser on a distinct port. Defaults to 3100 for a normal
// local run.
const DEFAULT_PORT = 3100
const PORT = Number(process.env.PW_PORT ?? DEFAULT_PORT)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
	testDir: './tests',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: 'html',
	use: {
		baseURL: BASE_URL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: `PORT=${PORT} pnpm dev`,
		url: BASE_URL,
		// A worker sets PW_PORT and must get its OWN isolated server; a normal local run
		// (no PW_PORT) may reuse an already-running dev server for convenience.
		reuseExistingServer: !process.env.PW_PORT,
		timeout: 120_000,
	},
})
