"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { feedbackApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toaster";

const STUDENT_ID_KEY = "adt_student_id";

export function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const sid = typeof window !== "undefined"
        ? parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0") || null
        : null;
      await feedbackApi.submit(message.trim(), pathname, sid);
      toast.success("Thanks for your feedback!");
      setMessage("");
      setOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send feedback.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-50">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Send feedback"
          className="flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-150"
        >
          <MessageSquare size={20} />
        </button>
      </div>

      {/* Popover */}
      {open && (
        <div className="fixed bottom-40 right-4 sm:bottom-20 sm:right-6 z-50 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Share Feedback</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close feedback"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Page: <span className="text-slate-400">{pathname}</span>
              </label>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="What's on your mind? Bug, suggestion, or question…"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 text-sm font-semibold transition-colors"
            >
              {sending ? "Sending…" : "Send Feedback"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
