import { createLogger } from "@shipwright/observability";
import { startWorker as startOutboxWorker } from "worker";

type AppLogger = ReturnType<typeof createLogger>;

let workerBootstrapped = false;

export function startWorker(logger?: AppLogger) {
  console.log("WORKER: started");
  const baseLogger = (logger ?? createLogger({ name: "api" })).child({
    component: "worker"
  });

  if (workerBootstrapped) {
    baseLogger.warn("worker_already_started");
    return;
  }

  workerBootstrapped = true;
  baseLogger.info({ mode: "in_process" }, "worker_started");

  try {
    startOutboxWorker(baseLogger);
  } catch (err) {
    workerBootstrapped = false;
    console.error("WORKER: error", err);
    baseLogger.error({ err }, "worker_fatal");
  }
}
