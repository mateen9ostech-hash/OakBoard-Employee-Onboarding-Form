import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="not-found-page">
      <span>404</span>
      <h1>That page could not be found.</h1>
      <p>The address may have changed, or the page may no longer be available.</p>
      <div>
        <Link href="/">OakBoard home</Link>
        <Link href="/sign-in">Sign in</Link>
      </div>
    </main>
  )
}
