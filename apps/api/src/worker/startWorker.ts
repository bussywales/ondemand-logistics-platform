import { createLogger } from "@shipwright/observability";
import { startWorker as startOutboxWorker } from "worker";

export function startWorker() {
  const logger = createLogger({ name: "api" });
  startOutboxWorker(logger);
}
