import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import pino, { type Logger, type LoggerOptions } from "pino";

export type RequestContext = {
  requestId: string;
  actorId?: string;
};

const requestContextStore = new AsyncLocalStorage<RequestContext>();

export function createLogger(options?: LoggerOptions): Logger {
  return pino({
    level: process.env.LOG_LEVEL ?? "info",
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    ...options
  });
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStore.getStore();
}

export function withRequestContext<T>(
  context: RequestContext,
  callback: () => T
): T {
  return requestContextStore.run(context, callback);
}

export function generateRequestId(): string {
  return randomUUID();
}

export function enrichLogContext(logger: Logger, extras?: Record<string, unknown>): Logger {
  const context = getRequestContext();
  return logger.child({
    request_id: context?.requestId,
    actor_id: context?.actorId,
    ...extras
  });
}

export function requestContextMiddleware(logger: Logger) {
  return (
    req: { headers: Record<string, string | string[] | undefined>; actorId?: string },
    res: { setHeader: (name: string, value: string) => void; on: (event: string, cb: () => void) => void; statusCode: number },
    next: () => void
  ) => {
    const incoming = req.headers["x-request-id"];
    const requestId =
      (Array.isArray(incoming) ? incoming[0] : incoming) ?? generateRequestId();

    withRequestContext({ requestId, actorId: req.actorId }, () => {
      res.setHeader("x-request-id", requestId);
      const started = Date.now();
      res.on("finish", () => {
        logger.info(
          {
            request_id: requestId,
            actor_id: req.actorId,
            status_code: res.statusCode,
            duration_ms: Date.now() - started
          },
          "request_complete"
        );
      });
      next();
    });
  };
}
