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
