import Link from "next/link"

const highlights = [
  {
    title: "Small surface area",
    text: "Focused helper APIs for predictable UI development in React and browser apps.",
  },
  {
    title: "Typed by default",
    text: "Strict TypeScript setup with stable exports from each package entrypoint.",
  },
  {
    title: "Release ready",
    text: "Changesets + CI pipeline keep versioning and publishing flow transparent.",
  },
]

export default function LandingPage() {
  return (
    <main className="landing">
      <section className="hero">
        <p className="badge">Monorepo docs</p>
        <h1>ez-kit UI helpers</h1>
        <p className="lead">
          Reusable helpers for UI and styling workflows: small, typed and
          optimized for production.
        </p>
        <div className="actions">
          <Link href="/docs/api" className="button primary">
            API docs
          </Link>
          <Link
            href="https://www.npmjs.com/search?q=%40ez-kit"
            className="button ghost"
          >
            npm scope
          </Link>
        </div>
      </section>

      <section className="highlights">
        {highlights.map((item) => (
          <article key={item.title} className="card">
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
