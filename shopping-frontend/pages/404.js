import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl">🧭</p>
      <h1 className="mt-5 text-2xl font-extrabold text-slate-900">404 — page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The page you're looking for doesn't exist or was moved.</p>
      <Link href="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  );
}
