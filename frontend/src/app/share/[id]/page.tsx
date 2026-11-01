import Link from "next/link";

export default function SharePage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
      <h1 className="text-2xl font-bold">This simulation is private</h1>
      <p>Public sharing is unavailable. Sign in to view your own simulations from History.</p>
      <Link href="/history" className="text-brand-600 underline">Go to History</Link>
    </div>
  );
}
