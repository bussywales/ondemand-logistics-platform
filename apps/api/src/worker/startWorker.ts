import { createLogger } from "@shipwright/observability";
import { startWorker as startOutboxWorker } from "worker";

type AppLogger = ReturnType<typeof createLogger>;

const WORKER_RETRY_DELAY_MS = Number(process.env.WORKER_RETRY_DELAY_MS ?? 5000);
let workerStarting = false;
let workerStarted = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function startWorker(logger?: AppLogger) {
  console.log("WORKER: started");
  const baseLogger = (logger ?? createLogger({ name: "api" })).child({
    component: "worker"
  });

  if (workerStarting || workerStarted) {
    baseLogger.warn("worker_already_started");
    return;
  }

  workerStarting = true;
  baseLogger.info({ mode: "in_process" }, "worker_started");

  while (!workerStarted) {
    try {
      startOutboxWorker(baseLogger);
      workerStarted = true;
      workerStarting = false;
      return;
    } catch (err) {
      console.error("WORKER: start failed", err);
      baseLogger.error({ err }, "worker_start_failed");
      await sleep(WORKER_RETRY_DELAY_MS);
    }
  }
}
