export default function StylingApiPage() {
	return (
		<main className='docs'>
			<h1>@ez-kit/styling</h1>
			<p>Current exported helpers:</p>

			<section>
				<h2>cx(...values)</h2>
				<p>Composes conditional class values from strings, arrays and object maps into one className string.</p>
				<pre>
					<code>{`import { cx } from "@ez-kit/styling"

const className = cx("btn", { "btn-active": true })`}</code>
				</pre>
			</section>

			<section>
				<h2>cssVar(name, value)</h2>
				<p>Builds a normalized CSS custom property object with -- prefix handling.</p>
			</section>
		</main>
	)
}
