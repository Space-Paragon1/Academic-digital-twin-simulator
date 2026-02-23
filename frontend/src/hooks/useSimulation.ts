"use client";

import { useState, useCallback } from "react";
import { simulationsApi } from "@/lib/api";
import type { ScenarioConfig, SimulationResult } from "@/lib/types";

interface UseSimulationReturn {
  runSimulation: (config: ScenarioConfig) => Promise<void>;
  result: SimulationResult | null;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export function useSimulation(): UseSimulationReturn {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = useCallback(async (config: ScenarioConfig) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await simulationsApi.run(config);
      setResult(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Simulation failed. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { runSimulation, result, isLoading, error, reset };
}
