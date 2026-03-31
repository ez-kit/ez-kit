/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	transpilePackages: [
		'@ez-kit/data-grid-core',
		'@ez-kit/data-grid-react',
		'@ez-kit/data-grid-heroui',
		'@ez-kit/data-grid-shadcn',
	],
}

export default nextConfig
