export const appName = 'ez-kit'

const PRODUCTION_SITE_URL = 'https://ez-kit.dev'
const DEFAULT_DEV_PORT = '3000'

/**
 * Absolute origin of the current deployment, used where a URL must be resolvable on its own —
 * `llms.txt` output an agent may read outside the site, OG image metadata.
 *
 * Read at build time, so every deployment bakes in its own origin: the production domain on
 * `main`, the generated deployment URL for previews, and the dev server's port locally (which
 * `scripts/dev-server.mjs` picks per worktree and exports as `PORT`).
 */
function resolveSiteUrl(): string {
	const explicit = process.env.NEXT_PUBLIC_SITE_URL
	if (explicit) return explicit.replace(/\/$/, '')

	if (process.env.VERCEL_ENV === 'production') return PRODUCTION_SITE_URL
	if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`

	return `http://localhost:${process.env.PORT ?? DEFAULT_DEV_PORT}`
}

export const siteUrl = resolveSiteUrl()
export const docsRoute = '/docs'
export const docsImageRoute = '/og/docs'
export const docsContentRoute = '/llms.mdx/docs'

/** Path of the docs content directory relative to the repository root. */
export const docsContentDir = 'apps/docs/content/docs'

export const gitConfig = {
	user: 'ez-kit',
	repo: 'ez-kit',
	branch: 'main',
}
