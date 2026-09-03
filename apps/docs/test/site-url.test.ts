import { afterEach, describe, expect, test, vi } from 'vitest'

// `siteUrl` is resolved once at module load, so each case re-imports the module with its own env.
async function loadSiteUrl(env: Record<string, string | undefined>): Promise<string> {
	vi.resetModules()
	for (const key of ['NEXT_PUBLIC_SITE_URL', 'VERCEL_ENV', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL', 'PORT']) {
		vi.stubEnv(key, env[key])
	}
	const { siteUrl } = await import('../lib/shared')
	return siteUrl
}

afterEach(() => {
	vi.unstubAllEnvs()
	vi.resetModules()
})

describe('siteUrl', () => {
	test('takes the production origin from the deployment, not from a hardcoded domain', async () => {
		// Vercel sets this to the shortest production custom domain, falling back to the vercel.app
		// one — so attaching a domain in the dashboard is the whole migration.
		const url = await loadSiteUrl({ VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'ez-kit.dev' })

		expect(url).toBe('https://ez-kit.dev')
	})

	test('uses the per-deployment URL on previews', async () => {
		const url = await loadSiteUrl({ VERCEL_ENV: 'preview', VERCEL_URL: 'ez-kit-docs-git-branch.vercel.app' })

		expect(url).toBe('https://ez-kit-docs-git-branch.vercel.app')
	})

	test('falls back to the per-deployment URL when system env vars are disabled in production', async () => {
		const url = await loadSiteUrl({ VERCEL_ENV: 'production', VERCEL_URL: 'ez-kit-docs-abc123.vercel.app' })

		expect(url).toBe('https://ez-kit-docs-abc123.vercel.app')
	})

	test('an explicit override wins over everything else', async () => {
		const url = await loadSiteUrl({
			NEXT_PUBLIC_SITE_URL: 'https://staging.example.com/',
			VERCEL_ENV: 'production',
			VERCEL_PROJECT_PRODUCTION_URL: 'ez-kit.dev',
		})

		expect(url).toBe('https://staging.example.com')
	})

	test('is the local dev server outside Vercel', async () => {
		const url = await loadSiteUrl({ PORT: '3117' })

		expect(url).toBe('http://localhost:3117')
	})
})
