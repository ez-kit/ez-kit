export const appName = 'ez-kit'

const DEFAULT_DEV_PORT = '3000'

/**
 * Absolute origin of the current deployment, used where a URL must be resolvable on its own —
 * `llms.txt` output an agent may read outside the site, OG image metadata.
 *
 * Read at build time, so every deployment bakes in its own origin: the production domain on
 * `main`, the generated deployment URL for previews, and the dev server's port locally (which
 * `scripts/dev-server.mjs` picks per worktree and exports as `PORT`).
 *
 * The production domain is NOT hardcoded here. Vercel sets `VERCEL_PROJECT_PRODUCTION_URL` to
 * "the shortest production custom domain, or vercel.app domain if no custom domain is available"
 * — so attaching a domain in the dashboard changes this with no code edit, and no deployment can
 * advertise a domain that isn't actually pointed at it. `VERCEL_URL` is deliberately not the
 * production answer: it is the per-deployment URL (`…-2g58s3cy6-….vercel.app`), fine for a preview
 * but wrong to bake into `llms.txt`. It stays as the fallback for the case where system env vars
 * are turned off in project settings.
 */
function resolveSiteUrl(): string {
	const explicit = process.env.NEXT_PUBLIC_SITE_URL
	if (explicit) return explicit.replace(/\/$/, '')

	if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
		return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
	}
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
