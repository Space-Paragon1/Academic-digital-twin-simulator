"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { emailVerificationApi } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the URL.");
      return;
    }
    emailVerificationApi
      .verifyEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed.");
      });
  }, [token]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-4">
        {status === "loading" && (
          <>
            <div className="h-12 w-12 mx-auto rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
            <p className="text-slate-500 dark:text-slate-400">Verifying your email...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Email Verified!</h1>
            <p className="text-slate-500 dark:text-slate-400">{message}</p>
            <Link
              href="/dashboard"
              className="inline-block mt-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Go to Dashboard
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Verification Failed</h1>
            <p className="text-slate-500 dark:text-slate-400">{message}</p>
            <Link
              href="/settings"
              className="inline-block mt-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Go to Settings to resend
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
