import { randomUUID } from "crypto";

type Level = "info" | "warn" | "error" | "debug";

const LEVEL_COLORS: Record<Level, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

const useColors = process.stdout?.isTTY ?? false;

function paint(color: string, s: string) {
  if (!useColors) return s;
  return `${color}${s}${RESET}`;
}

function redact(value: unknown): unknown {
  if (typeof value === "string") {
    if (/^AIza[0-9A-Za-z_\-]{20,}$/.test(value))
      return `${value.slice(0, 4)}…${value.slice(-4)}`;
    if (value.length > 800) return `${value.slice(0, 800)}…[${value.length}b]`;
    return value;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/key|secret|token|authorization/i.test(k) && typeof v === "string") {
        out[k] =
          v.length > 8 ? `${v.slice(0, 4)}…${v.slice(-4)}` : "[redacted]";
      } else {
        out[k] = redact(v);
      }
    }
    return out;
  }
  return value;
}

function fmtFields(fields: Record<string, unknown>) {
  const entries = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      const value = redact(v);
      let s: string;
      if (typeof value === "string") {
        s = /[\s"=]/.test(value) ? JSON.stringify(value) : value;
      } else if (value instanceof Error) {
        s = JSON.stringify({ message: value.message, name: value.name });
      } else {
        try {
          s = JSON.stringify(value);
        } catch {
          s = String(value);
        }
      }
      return `${paint(DIM, k + "=")}${s}`;
    });
  return entries.join(" ");
}

function write(level: Level, scope: string, msg: string, fields: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const head = `${paint(DIM, ts)} ${paint(
    LEVEL_COLORS[level] + BOLD,
    level.toUpperCase().padEnd(5)
  )} ${paint(BOLD, scope)} ${msg}`;
  const tail = Object.keys(fields).length ? "  " + fmtFields(fields) : "";
  const line = head + tail;
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export type Logger = {
  id: string;
  scope: string;
  info: (msg: string, fields?: Record<string, unknown>) => void;
  warn: (msg: string, fields?: Record<string, unknown>) => void;
  error: (msg: string, fields?: Record<string, unknown>) => void;
  debug: (msg: string, fields?: Record<string, unknown>) => void;
  step: <T>(msg: string, fn: () => Promise<T> | T) => Promise<T>;
  child: (subScope: string) => Logger;
};

export function createLogger(scope: string, id?: string): Logger {
  const requestId = id ?? randomUUID().slice(0, 8);
  const base = (level: Level) =>
    (msg: string, fields: Record<string, unknown> = {}) =>
      write(level, scope, msg, { rid: requestId, ...fields });

  const logger: Logger = {
    id: requestId,
    scope,
    info: base("info"),
    warn: base("warn"),
    error: base("error"),
    debug: base("debug"),
    async step<T>(msg: string, fn: () => Promise<T> | T): Promise<T> {
      const started = Date.now();
      logger.info(`▶ ${msg}`);
      try {
        const result = await fn();
        logger.info(`✓ ${msg}`, { ms: Date.now() - started });
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        logger.error(`✗ ${msg}`, {
          ms: Date.now() - started,
          err: e.message,
          stack: e.stack?.split("\n").slice(0, 3).join(" | "),
        });
        throw err;
      }
    },
    child(subScope: string) {
      return createLogger(`${scope}:${subScope}`, requestId);
    },
  };
  return logger;
}
