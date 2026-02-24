import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <h2 className="text-lg font-semibold text-gray-900">Page not found</h2>
      <p className="text-sm text-gray-500">This page does not exist or has been moved.</p>
      <Link
        href="/"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
