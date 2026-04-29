import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export function baseOptions(): BaseLayoutProps {
	return {
		githubUrl: 'https://github.com/ez-kit/ez-kit',
		nav: {
			title: 'ez-kit docs',
		},
		links: [
			{
				text: 'Home',
				url: '/',
			},
			{
				text: 'API',
				url: '/docs/api',
				active: 'nested-url',
			},
		],
	}
}
