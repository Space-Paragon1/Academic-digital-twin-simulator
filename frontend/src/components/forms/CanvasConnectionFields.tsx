"use client";

import { useEffect, useId, useState } from "react";

const GRAMBLING_CANVAS = "https://grambling.instructure.com";
const siteKey = (studentId: number) => `adt_canvas_site_${studentId}`;

export function canvasOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim().includes("://") ? value.trim() : `https://${value.trim()}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".")) return null;
    return `https://${url.hostname.toLowerCase()}`;
  } catch { return null; }
}

export function rememberCanvasSite(studentId: number, value: string) {
  const origin = canvasOrigin(value);
  if (origin) {
    try { localStorage.setItem(siteKey(studentId), origin); } catch { /* Storage is optional. */ }
  }
}

interface Props {
  studentId: number;
  canvasUrl: string;
  onUrlChange: (value: string) => void;
  token: string;
  onTokenChange: (value: string) => void;
  disabled?: boolean;
}

export function CanvasConnectionFields({ studentId, canvasUrl, onUrlChange, token, onTokenChange, disabled }: Props) {
  const id = useId();
  const [school, setSchool] = useState("");
  const origin = canvasOrigin(canvasUrl);
  useEffect(() => {
    if (!studentId) return;
    let saved = canvasUrl;
    try { saved = saved || localStorage.getItem(siteKey(studentId)) || ""; } catch { /* Storage is optional. */ }
    if (saved) {
      onUrlChange(saved);
      setSchool(canvasOrigin(saved) === GRAMBLING_CANVAS ? "grambling" : "other");
    }
    // Restore once per account; do not overwrite edits as the user types.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const inputClass = "w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none";
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <div>
        <label htmlFor={`${id}-school`} className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Your school</label>
        <select id={`${id}-school`} required value={school} className={inputClass} onChange={(e) => {
          const value = e.target.value;
          setSchool(value);
          onUrlChange(value === "grambling" ? GRAMBLING_CANVAS : "");
        }}>
          <option value="" disabled>Choose your school</option>
          <option value="grambling">Grambling State University</option>
          <option value="other">Another school</option>
        </select>
        {school === "grambling" && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">We'll connect to Grambling's Canvas. You don't need to enter a website address.</p>}
      </div>
      {school === "other" && <div>
        <label htmlFor={`${id}-site`} className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Link to your Canvas dashboard or a course</label>
        <input id={`${id}-site`} type="text" inputMode="url" required autoComplete="off" spellCheck={false}
          aria-describedby={`${id}-site-help`} placeholder="Paste the address from a page where you see your Canvas courses"
          value={canvasUrl} onChange={(e) => onUrlChange(e.target.value)} className={inputClass} />
        <p id={`${id}-site-help`} className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          Open Canvas as you normally do, sign in, and copy the address from your browser. A full course-page link works—we'll find the site address for you.
        </p>
        <a href="https://www.instructure.com/canvas/login" target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 dark:text-brand-400 underline">Find your school's Canvas</a>
      </div>}
      {origin && <p className="text-xs text-slate-600 dark:text-slate-300">Connecting to <span className="font-medium break-all">{origin}</span>. We remember this site on this browser after a successful connection.</p>}
      <div>
        <label htmlFor={`${id}-token`} className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Canvas access token</label>
        <input id={`${id}-token`} type="password" required autoComplete="off" spellCheck={false}
          aria-describedby={`${id}-token-help`} placeholder="Paste the full token from this Canvas account"
          value={token} onChange={(e) => onTokenChange(e.target.value)} className={inputClass} />
        <p id={`${id}-token-help`} className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          Use the token from Account → Settings in the same Canvas site selected above. This is not your school password, a pairing code, or a token from another Canvas account.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Your token is sent securely for this request and is never saved. Your school controls whether tokens can read courses.</p>
      </div>
    </fieldset>
  );
}
