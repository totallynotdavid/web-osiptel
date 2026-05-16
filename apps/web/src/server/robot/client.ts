import { env } from "~/lib/env";
import { createLogger } from "~/lib/observability/logger";
import { err, ok, type Result } from "~/lib/result";

const logger = createLogger("robot-client");

export interface RobotLookupResult {
  ruc: string;
  active: boolean;
  carriers: Record<string, number> | null;
  providers: string[] | null;
  error: string | null;
}

export interface RobotLookupResponse {
  results: RobotLookupResult[];
}

function isRobotLookupResult(value: unknown): value is RobotLookupResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const carriers =
    record.carriers === null ||
    (typeof record.carriers === "object" && !Array.isArray(record.carriers));
  const providers =
    record.providers === null ||
    (Array.isArray(record.providers) && record.providers.every((item) => typeof item === "string"));

  return (
    typeof record.ruc === "string" &&
    typeof record.active === "boolean" &&
    carriers &&
    providers &&
    (record.error === null || typeof record.error === "string")
  );
}

function isRobotLookupResponse(value: unknown): value is RobotLookupResponse {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.results) && record.results.every((item) => isRobotLookupResult(item));
}

export async function robotLookup(input: {
  rucList: string[];
  proxyUser: string;
  proxyPass: string;
  signal?: AbortSignal;
}): Promise<Result<RobotLookupResult[], string>> {
  const url = `${env.robot.url}/lookup`;

  logger.info("robot_lookup_start", { count: input.rucList.length });

  let res: Response;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (env.robot.token) {
      headers["x-robot-token"] = env.robot.token;
    }
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ruc_list: input.rucList,
        proxy_user: input.proxyUser,
        proxy_pass: input.proxyPass,
      }),
      signal: input.signal,
    });
  } catch (fetchError) {
    const errorMessage = `Robot service request failed: ${String(fetchError)}`;
    logger.error("robot_lookup_failed", { error: errorMessage });
    return err(errorMessage);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const errorMessage = `Robot service error ${res.status}: ${detail}`;
    logger.error("robot_lookup_failed", { status: res.status, detail });
    return err(errorMessage);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (parseError) {
    const errorMessage = `Robot service returned invalid JSON: ${String(parseError)}`;
    logger.error("robot_lookup_parse_failed", { error: errorMessage });
    return err(errorMessage);
  }

  if (!isRobotLookupResponse(data)) {
    const errorMessage = "Robot service returned invalid payload shape";
    logger.error("robot_lookup_parse_failed", { error: errorMessage });
    return err(errorMessage);
  }

  logger.info("robot_lookup_done", { count: data.results.length });
  return ok(data.results);
}

export async function robotHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${env.robot.url}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
