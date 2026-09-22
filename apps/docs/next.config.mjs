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
	 * The `.mdx` source is here for the same slug because it is a published URL too, and it now
	 * resolves: the suffix route was broken for **every** page until `proxy.ts` stopped appending
	 * `/content.md` to a destination no route serves — see the note there.
	 *
	 * The rewrite below is **not** what makes it work and never was. It sits in `afterFiles`, and
	 * `/docs/[[...slug]]` matches `<slug>.mdx` as a slug, so routing is already finished by the
	 * time an `afterFiles` rewrite would be consulted. Middleware decides this, before routing.
	 * It is kept because its destination is correct and it costs nothing, so it stands as the
	 * answer for any request that reaches routing without having passed through middleware.
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
