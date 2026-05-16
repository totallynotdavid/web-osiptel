export interface BootstrapScenario {
  generatedAtMs: number;
}

export function buildBootstrapScenario(nowMs: number): BootstrapScenario {
  return { generatedAtMs: nowMs };
}
