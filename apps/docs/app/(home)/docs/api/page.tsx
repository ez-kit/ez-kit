import Link from 'next/link'

const apiSections = [
	{
		packageName: '@ez-kit/ui',
		href: '/docs/api/ui',
		description: 'General UI helpers for runtime checks, dimensions and small utility flows.',
	},
	{
		packageName: '@ez-kit/styling',
		href: '/docs/api/styling',
		description: 'Styling primitives for class composition and CSS custom properties.',
	},
]

export default function ApiIndexPage() {
	return (
		<main className='docs'>
			<h1>API reference</h1>
			<p>Choose a package to view exported helpers and quick usage snippets.</p>
			<div className='api-grid'>
				{apiSections.map((section) => (
					<article
						key={section.packageName}
						className='api-card'
					>
						<h2>{section.packageName}</h2>
						<p>{section.description}</p>
						<Link href={section.href}>Open reference</Link>
					</article>
				))}
			</div>
		</main>
	)
}
