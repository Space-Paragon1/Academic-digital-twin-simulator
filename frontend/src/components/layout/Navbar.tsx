import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-brand-600 text-lg font-bold">AcademicTwin</span>
          <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-700">
            Beta
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/dashboard" className="hover:text-brand-600 transition-colors">
            Dashboard
          </Link>
          <Link href="/profile" className="hover:text-brand-600 transition-colors">
            Profile
          </Link>
          <Link href="/scenarios" className="hover:text-brand-600 transition-colors">
            Scenarios
          </Link>
          <Link href="/optimizer" className="hover:text-brand-600 transition-colors">
            Optimizer
          </Link>
        </nav>
      </div>
    </header>
  );
}
