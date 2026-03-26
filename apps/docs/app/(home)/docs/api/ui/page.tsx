export default function UiApiPage() {
	return (
		<main className='docs'>
			<h1>@ez-kit/ui</h1>
			<p>Current exported helpers:</p>

			<section>
				<h2>clamp(value, min, max)</h2>
				<p>Constrains a number to the provided range and throws on invalid boundaries.</p>
				<pre>
					<code>{`import { clamp } from "@ez-kit/ui"

const opacity = clamp(1.2, 0, 1) // 1`}</code>
				</pre>
			</section>

			<section>
				<h2>toPx(value)</h2>
				<p>Converts numeric values to px units while leaving unit strings untouched.</p>
			</section>

			<section>
				<h2>isClientEnvironment()</h2>
				<p>Returns true when both window and document are available.</p>
			</section>
		</main>
	)
}
