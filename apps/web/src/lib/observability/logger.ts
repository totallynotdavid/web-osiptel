type LogLevel = "debug" | "info" | "warn" | "error";
type LogData = Record<string, unknown>;

function log(level: LogLevel, ns: string, event: string, data?: LogData) {
  const line = JSON.stringify({ level, ns, event, ts: Date.now(), ...data });
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function createLogger(ns: string, meta?: LogData) {
  return {
    debug: (event: string, data?: LogData) => log("debug", ns, event, { ...meta, ...data }),
    info: (event: string, data?: LogData) => log("info", ns, event, { ...meta, ...data }),
    warn: (event: string, data?: LogData) => log("warn", ns, event, { ...meta, ...data }),
    error: (event: string, data?: LogData) => log("error", ns, event, { ...meta, ...data }),
  };
}
