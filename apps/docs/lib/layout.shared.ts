import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export function baseOptions(): BaseLayoutProps {
	return {
		githubUrl: 'https://github.com/ez-kit/ez-kit',
		nav: { title: 'ez-kit' },
		links: [
			{ text: 'Data Grid', url: '/docs/data-grid', active: 'nested-url' },
			{ text: 'Form', url: '/docs/form', active: 'nested-url' },
			{ text: 'qc-react', url: '/docs/qc-react', active: 'nested-url' },
			{ text: 'Query', url: '/docs/query-react', active: 'nested-url' },
			{ text: 'zu-store', url: '/docs/zu-store', active: 'nested-url' },
			{ text: 'va-store', url: '/docs/va-store', active: 'nested-url' },
			{ text: 'twc', url: '/docs/twc', active: 'nested-url' },
		],
	}
}
