import { createMDX } from 'fumadocs-mdx/next'

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	transpilePackages: [
		'@ez-kit/data-grid-core',
		'@ez-kit/data-grid-react',
		'@ez-kit/data-grid-heroui',
		'@ez-kit/data-grid-shadcn',
	],
	/*
	 * The page moved for good, so 308 rather than 307. The `(site)` route group does not appear
	 * in the URL, so these are the paths as served, and redirects are checked before the
	 * filesystem, before `proxy.ts` and before the rewrite below.
	 *
	 * The `.mdx` source is here for the same slug because it is a published URL too. Note it
	 * currently redirects one 404 to another: the `.mdx` suffix does not resolve for **any**
	 * page, because `/docs/[[...slug]]` matches `<slug>.mdx` as a slug and answers 404 before
	 * the rewrite below — an `afterFiles` rewrite — is ever reached. That is a pre-existing
	 * defect of the suffix route, not of this rename; the entry is what makes this page right
	 * the moment the suffix route is fixed. `/llms.mdx/docs/<slug>` serves the markdown today.
	 */
	async redirects() {
		return [
			{
				source: '/docs/data-grid/selection/selection-bar',
				destination: '/docs/data-grid/selection/action-bar',
				permanent: true,
			},
			{
				source: '/docs/data-grid/selection/selection-bar.mdx',
				destination: '/docs/data-grid/selection/action-bar.mdx',
				permanent: true,
			},
		]
	},
	async rewrites() {
		return [
			{
				source: '/docs/:path*.mdx',
				destination: '/llms.mdx/docs/:path*',
			},
		]
	},
}

const withMDX = createMDX()

export default withMDX(nextConfig)
