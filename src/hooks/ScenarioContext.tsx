import { createContext, type Dispatch, type ReactNode, useContext, useMemo, useReducer } from "react";
import type { HazardConfigData, ScenarioData } from "@/types";
import { createInitialScenario, type ScenarioAction, scenarioReducer } from "./scenarioReducer";

interface ScenarioContextValue {
  state: ScenarioData;
  dispatch: Dispatch<ScenarioAction>;
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null);

interface ScenarioProviderProps {
  children: ReactNode;
  hazardConfigData: HazardConfigData;
}

export function ScenarioProvider({ children, hazardConfigData }: ScenarioProviderProps) {
  const [state, dispatch] = useReducer(scenarioReducer, hazardConfigData, (configData) =>
    createInitialScenario(configData),
  );

  // useMemo で value をメモ化し、不要な再レンダリングを防止
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>;
}

export function useScenario(): ScenarioContextValue {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenario must be used within ScenarioProvider");
  return ctx;
}
