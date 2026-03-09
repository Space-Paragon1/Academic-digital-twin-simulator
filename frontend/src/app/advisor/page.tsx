"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { advisorApi, simulationsApi } from "@/lib/api";
import type { AdvisorMessage, SimulationResult } from "@/lib/types";

const INITIAL_MESSAGE: AdvisorMessage = {
  role: "assistant",
  content:
    "Hi! I'm your AI academic advisor. I can help you interpret your simulation results, understand burnout risk, and optimize your schedule. Select a simulation above for context-aware advice, then ask me anything.",
};

export default function AdvisorPage() {
  const [studentId, setStudentId]       = useState<number | null>(null);
  const [simulations, setSimulations]   = useState<SimulationResult[]>([]);
  const [selectedSimId, setSelectedSimId] = useState<number | undefined>();
  const [messages, setMessages]         = useState<AdvisorMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput]               = useState("");
  const [isLoading, setIsLoading]       = useState(false);
  const [apiError, setApiError]         = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = localStorage.getItem("adt_student_id");
    if (!id) return;
    const sid = parseInt(id);
    setStudentId(sid);
    simulationsApi.history(sid).then(setSimulations).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  if (!studentId) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400 text-sm">
        No student profile found. Create one on the Profile page first.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      {/* Simulation selector */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Simulation context:
        </label>
        <select
          value={selectedSimId ?? ""}
          onChange={(e) => setSelectedSimId(e.target.value ? parseInt(e.target.value) : undefined)}
          className="flex-1 max-w-sm rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">— No simulation selected —</option>
          {simulations.map((s) => (
            <option key={s.id} value={s.id}>
              #{s.id} — {s.scenario_config.scenario_name ?? `GPA ${s.summary.predicted_gpa_mean}`} ({s.summary.burnout_risk} risk)
            </option>
          ))}
        </select>
      </div>

      {apiError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">AI advisor unavailable:</span> {apiError}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand-600 text-white rounded-br-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
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
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          disabled={isLoading}
        />
        <Button onClick={sendMessage} isLoading={isLoading} disabled={!input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
