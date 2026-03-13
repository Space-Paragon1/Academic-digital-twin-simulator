"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { advisorApi, simulationsApi, coursesApi } from "@/lib/api";
import type { AdvisorMessage, Course, SimulationResult } from "@/lib/types";

const INITIAL_MESSAGE: AdvisorMessage = {
  role: "assistant",
  content:
    "Hi! I'm your AI academic advisor. I've loaded your latest simulation results as context. Ask me anything about your GPA prediction, burnout risk, or how to adjust your schedule.",
};

function chatHistoryKey(studentId: number) {
  return `adt_chat_history_${studentId}`;
}

function AdvisorChat() {
  const searchParams = useSearchParams();
  const explainId = searchParams.get("explain");

  const [studentId, setStudentId]         = useState<number | null>(null);
  const [simulations, setSimulations]     = useState<SimulationResult[]>([]);
  const [selectedSimId, setSelectedSimId] = useState<number | undefined>();
  const [messages, setMessages]           = useState<AdvisorMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput]                 = useState("");
  const [isLoading, setIsLoading]         = useState(false);
  const [apiError, setApiError]           = useState<string | null>(null);
  // Feature 8: course quick-advice
  const [courses, setCourses]             = useState<Course[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoExplainedRef = useRef(false);

  useEffect(() => {
    const id = localStorage.getItem("adt_student_id");
    if (!id) return;
    const sid = parseInt(id);
    setStudentId(sid);

    // Load chat history from localStorage
    const saved = localStorage.getItem(chatHistoryKey(sid));
    if (saved && !explainId) {
      try { setMessages(JSON.parse(saved)); } catch { /* ignore */ }
    }

    simulationsApi.history(sid).then((sims) => {
      setSimulations(sims);
      if (explainId) {
        const target = sims.find((s) => s.id === parseInt(explainId));
        if (target?.id) setSelectedSimId(target.id);
      } else if (sims.length > 0) {
        setSelectedSimId(sims[sims.length - 1].id);
      }
    }).catch(() => {});

    // Feature 8: load courses for quick-advice pills
    coursesApi.list(sid).then(setCourses).catch(() => {});
  }, [explainId]);

  // Auto-send explain message when coming from history page
  useEffect(() => {
    if (!explainId || !selectedSimId || autoExplainedRef.current || !studentId) return;
    const sim = simulations.find((s) => s.id === parseInt(explainId));
    if (!sim) return;
    autoExplainedRef.current = true;
    const autoMsg = `Please explain my simulation result "${sim.scenario_config.scenario_name ?? `#${sim.id}`}" in plain English. Predicted GPA: ${sim.summary.predicted_gpa_mean.toFixed(2)}, burnout risk: ${sim.summary.burnout_risk} (${(sim.summary.burnout_probability * 100).toFixed(0)}%). What does this mean and what should I change?`;
    setInput(autoMsg);
  }, [explainId, selectedSimId, simulations, studentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!studentId || messages.length <= 1) return;
    localStorage.setItem(chatHistoryKey(studentId), JSON.stringify(messages));
  }, [messages, studentId]);

  const sendMessage = async () => {
    if (!input.trim() || !studentId || isLoading) return;
    setApiError(null);

    const userMsg: AdvisorMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await advisorApi.chat({
        student_id: studentId,
        simulation_id: selectedSimId,
        messages: newMessages,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("ANTHROPIC_API_KEY") || msg.includes("anthropic") || msg.includes("503")) {
        setApiError(
          "AI advisor requires an Anthropic API key. Add ANTHROPIC_API_KEY to backend/.env and restart the server."
        );
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Sorry, I encountered an error: ${msg}` },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    if (!studentId) return;
    setMessages([INITIAL_MESSAGE]);
    localStorage.removeItem(chatHistoryKey(studentId));
  };

  if (!studentId) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400 text-sm">
        No student profile found. Create one on the Profile page first.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          Simulation context:
        </label>
        <select
          value={selectedSimId ?? ""}
          onChange={(e) => setSelectedSimId(e.target.value ? parseInt(e.target.value) : undefined)}
          className="flex-1 max-w-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none"
        >
          <option value="">— No simulation selected —</option>
          {simulations.map((s) => (
            <option key={s.id} value={s.id}>
              #{s.id} — {s.scenario_config.scenario_name ?? `GPA ${s.summary.predicted_gpa_mean.toFixed(2)}`} ({s.summary.burnout_risk} risk)
            </option>
          ))}
        </select>
        {messages.length > 1 && (
          <button
            type="button"
            onClick={clearHistory}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-auto"
          >
            Clear history
          </button>
        )}
      </div>

      {/* Feature 8: Quick Course Advice pills + AI Scenario Suggestion */}
      {courses.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Quick Course Advice</p>
          <div className="flex flex-wrap gap-2">
            {courses.map((c) => (
              <button
                key={c.id}
                type="button"
                title={`Get advice for ${c.name}`}
                onClick={() =>
                  setInput(
                    `Give me specific advice for my ${c.name} course (difficulty: ${c.difficulty_score}/10, credits: ${c.credits})`
                  )
                }
                className="rounded-full border border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20 px-3 py-1 text-xs font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
              >
                {c.name}
              </button>
            ))}
            {/* AI Scenario Suggestion button */}
            <button
              type="button"
              title="Ask AI to suggest an optimal scenario configuration"
              onClick={() => {
                const suggestionPrompt =
                  "Based on my goals and simulation history, suggest the optimal scenario configuration for me. Include specific values for: study strategy, sleep hours, work hours per week, and number of exam weeks. Format your response as a clear recommendation.";
                setInput(suggestionPrompt);
              }}
              className="rounded-full border border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
            >
              ✨ Suggest a Scenario
            </button>
          </div>
        </div>
      )}

      {apiError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <span className="font-semibold">AI advisor unavailable:</span> {apiError}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand-600 text-white rounded-br-sm"
                  : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-sm shadow-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <Spinner size="sm" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask about your burnout risk, schedule, or study strategy…"
          className="flex-1 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          disabled={isLoading}
        />
        <Button onClick={sendMessage} isLoading={isLoading} disabled={!input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}

export default function AdvisorPage() {
  return (
    <Suspense>
      <AdvisorChat />
    </Suspense>
  );
}
