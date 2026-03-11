"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { passwordApi } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setError("Missing or invalid reset link. Please request a new one.");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await passwordApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 shadow-md mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Set new password</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Choose a strong password for your account
          </p>
        </div>

        {success ? (
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-5 py-5 text-center space-y-3">
            <div className="text-2xl">✅</div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">Password updated!</p>
            <p className="text-xs text-green-700 dark:text-green-400">
              Redirecting you to sign in…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                New password
              </label>
              <input
                type="password"
                required
                minLength={6}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Confirm new password
              </label>
              <input
                type="password"
                required
                minLength={6}
                maxLength={72}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Password strength hint */}
            {password.length > 0 && (
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      i < Math.min(Math.floor(password.length / 4), 4)
                        ? password.length >= 12
                          ? "bg-green-500"
                          : password.length >= 8
                          ? "bg-amber-400"
                          : "bg-red-400"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
                {error.includes("expired") && (
                  <Link href="/forgot-password" className="block mt-1 text-brand-600 hover:underline font-medium">
                    Request a new link →
                  </Link>
                )}
              </div>
            )}

            <Button type="submit" isLoading={isLoading} disabled={!token} className="w-full">
              Update Password
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link href="/login" className="text-brand-600 hover:underline font-medium">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
