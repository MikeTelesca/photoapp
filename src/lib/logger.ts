type LogContext = Record<string, unknown>;

function ts() {
  return new Date().toISOString();
}

export const log = {
  info: (msg: string, ctx?: LogContext) => {
    console.log(JSON.stringify({ level: "info", ts: ts(), msg, ...ctx }));
  },
  warn: (msg: string, ctx?: LogContext) => {
    console.warn(JSON.stringify({ level: "warn", ts: ts(), msg, ...ctx }));
  },
  error: (msg: string, ctx?: LogContext) => {
    console.error(JSON.stringify({ level: "error", ts: ts(), msg, ...ctx }));
  },
};
