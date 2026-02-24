"use client";

import { useState, useCallback } from "react";
import { optimizationApi, simulationsApi } from "@/lib/api";
import type {
  OptimizationRequest,
  OptimizationResult,
  SimulationResult,
} from "@/lib/types";

interface UseScenarioReturn {
  history: SimulationResult[];
  optimizationResult: OptimizationResult | null;
  isLoading: boolean;
  error: string | null;
  loadHistory: (studentId: number) => Promise<void>;
  deleteSimulation: (simId: number) => Promise<void>;
  runOptimization: (request: OptimizationRequest) => Promise<void>;
}

export function useScenario(): UseScenarioReturn {
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (studentId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await simulationsApi.history(studentId);
      setHistory(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load simulation history.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSimulation = useCallback(async (simId: number) => {
    setError(null);
    try {
      await simulationsApi.delete(simId);
      setHistory((prev) => prev.filter((s) => s.id !== simId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete simulation.");
      throw err;
    }
  }, []);

  const runOptimization = useCallback(async (request: OptimizationRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await optimizationApi.optimize(request);
      setOptimizationResult(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Optimization failed.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { history, optimizationResult, isLoading, error, loadHistory, deleteSimulation, runOptimization };
}
